import express from 'express';

import { listClusters } from '../services/clusterService';

export const clustersRouter = express.Router();

clustersRouter.get('/', async (_req, res) => {
  const clusters = await listClusters();
  res.json(clusters);
});
