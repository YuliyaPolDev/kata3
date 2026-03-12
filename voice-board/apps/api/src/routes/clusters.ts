import express from 'express';

import { listClusters, detectGlobalTrends } from '../services/clusterService';

export const clustersRouter = express.Router();

clustersRouter.get('/', async (_req, res) => {
  const clusters = await listClusters();
  res.json(clusters);
});

clustersRouter.post('/detect', async (_req, res) => {
  const newClusters = await detectGlobalTrends();
  res.json({ detected: newClusters.length, clusters: newClusters });
});
