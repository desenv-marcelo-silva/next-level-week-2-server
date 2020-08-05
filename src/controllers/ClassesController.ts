import { Request, Response } from 'express';

import db from '../database/connection';
import convertHourToMinuts from '../utils/convertHourToMinuts';

interface ScheduleItem {
  week_day: number;
  from: string;
  to: string;
}

export default class ClassesController {
  async index(req: Request, res: Response) {
    const filters = req.query;

    if (!filters.subject || !filters.week_day || !filters.time) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const timeInMinutes = convertHourToMinuts(filters.time as string);

    const classes = await db('classes')
      .whereExists(function () {
        this.select('class_schedule.*')
          .from('class_schedule')
          .whereRaw('`class_schedule`.`class_id` = `classes`.`id`')
          .whereRaw('`class_schedule`.`week_day` = ??', [
            Number(filters.week_day),
          ])
          .whereRaw('`class_schedule`.`from` <= ??', [timeInMinutes])
          .whereRaw('`class_schedule`.`to` > ??', [timeInMinutes]);
      })
      .where('classes.subject', '=', filters.subject as string)
      .join('users', 'classes.user_id', '=', 'users.id')
      .select(['classes.*', 'users.*']);

    return res.json({ classes });
  }

  async create(req: Request, res: Response) {
    const { name, avatar, whatsapp, bio, subject, cost, schedule } = req.body;

    const transaction = await db.transaction();
    try {
      const insertedUsersIds = await transaction('users').insert({
        name,
        avatar,
        whatsapp,
        bio,
      });

      const user_id = insertedUsersIds[0];

      const insertedClassesId = await transaction('classes').insert({
        subject,
        cost,
        user_id,
      });

      const class_id = insertedClassesId[0];

      const classSchedule = schedule.map((scheduleItem: ScheduleItem) => {
        return {
          class_id,
          week_day: scheduleItem.week_day,
          from: convertHourToMinuts(scheduleItem.from),
          to: convertHourToMinuts(scheduleItem.to),
        };
      });

      await transaction('class_schedule').insert(classSchedule);

      await transaction.commit();

      return res.status(201).send();
    } catch (error) {
      transaction.rollback();
      return res.status(400).json({
        error: 'Unexpected error while creating new class.',
      });
    }
  }
}
