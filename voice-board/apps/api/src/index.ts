import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';

import { clustersRouter } from './routes/clusters';
import { concernsRouter } from './routes/concerns';
import { hrRouter } from './routes/hr';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/concerns', concernsRouter);
app.use('/api/clusters', clustersRouter);
app.use('/api/hr', hrRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
