import { Request, Response } from 'express';

import db from '../database/connection';
import convertHourToMinuts from '../utils/convertHourToMinuts';

interface ScheduleItem {
  week_day: number;
  from: string;
  to: string;
}

export default class ClassesController {
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
