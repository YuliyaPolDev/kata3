import express from 'express';
import { z } from 'zod';

import { addComment, listComments } from '../services/commentService';
import { createConcern, findSimilar, getConcern, listConcerns, setConcernState } from '../services/concernService';
import { upvoteConcern } from '../services/voteService';

export const concernsRouter = express.Router();

concernsRouter.get('/', async (_req, res) => {
  const concerns = await listConcerns();
  res.json(concerns);
});

concernsRouter.get('/similar', async (req, res) => {
  const title = String(req.query.title ?? '');
  const description = String(req.query.description ?? '');
  const similar = await findSimilar(title, description);
  res.json(similar);
});

concernsRouter.get('/:id', async (req, res) => {
  const concern = await getConcern(req.params.id);
  if (!concern) return res.status(404).json({ error: 'Not found' });
  res.json(concern);
});

concernsRouter.post('/', async (req, res) => {
  const schema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    category: z.enum(['HR', 'Legal', 'Benefits', 'Process', 'Other'])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const created = await createConcern(parsed.data);
  res.status(201).json(created);
});

concernsRouter.patch('/:id/state', async (req, res) => {
  const schema = z.object({ state: z.enum(['Open', 'InDiscussion', 'Planned', 'Resolved']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await setConcernState(req.params.id, parsed.data.state);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

concernsRouter.post('/:id/votes', async (req, res) => {
  const result = await upvoteConcern(req.params.id);
  if (!result.concern) return res.status(404).json({ error: 'Not found' });
  res.status(201).json(result);
});

concernsRouter.get('/:id/comments', async (req, res) => {
  const comments = await listComments(req.params.id);
  res.json(comments);
});

concernsRouter.post('/:id/comments', async (req, res) => {
  const schema = z.object({ text: z.string().min(2).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const comment = await addComment(req.params.id, parsed.data.text);
  res.status(201).json(comment);
});
