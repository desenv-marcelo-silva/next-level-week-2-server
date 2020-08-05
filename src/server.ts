import express, { response } from 'express';

const app = express();

app.use(express.json());

app.get('/users', (req, res) => {
  return res.json({ message: 'Hello Node JS!' });
});

app.listen(3369);
