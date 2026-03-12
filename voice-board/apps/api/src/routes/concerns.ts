import express from 'express';
import { z } from 'zod';

import { addComment, listComments } from '../services/commentService';
import { createConcern, declineConcern, findSimilar, getConcern, listConcerns, mergeConcerns, setConcernState, splitConcern } from '../services/concernService';
import { precheckConcern } from '../services/precheckService';
import { upvoteConcern } from '../services/voteService';
import { presentConcernForRole } from '../utils/presenters';
import { parseVoiceRole, requireCouncil } from '../utils/role';

export const concernsRouter = express.Router();

concernsRouter.get('/', async (_req, res) => {
  const concerns = await listConcerns();
  const role = parseVoiceRole(res.locals.voiceRole);
  res.json(concerns.map((c) => presentConcernForRole(c, role)));
});

concernsRouter.get('/similar', async (req, res) => {
  const title = String(req.query.title ?? '');
  const description = String(req.query.description ?? '');
  const similar = await findSimilar(title, description);
  res.json(similar);
});

concernsRouter.post('/precheck', async (req, res) => {
  const schema = z.object({
    title: z.string().default(''),
    description: z.string().default('')
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await precheckConcern(parsed.data.title, parsed.data.description);
  res.json(result);
});

concernsRouter.get('/:id', async (req, res) => {
  const concern = await getConcern(req.params.id);
  if (!concern) return res.status(404).json({ error: 'Not found' });
  const role = parseVoiceRole(res.locals.voiceRole);
  res.json(presentConcernForRole(concern, role));
});

concernsRouter.post('/', async (req, res) => {
  const schema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    category: z.enum(['HR', 'Legal', 'Benefits', 'Process', 'Other']).optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const created = await createConcern({
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category
  });
  const role = parseVoiceRole(res.locals.voiceRole);
  res.status(201).json(presentConcernForRole(created, role));
});

concernsRouter.patch('/:id/state', async (req, res) => {
  const role = parseVoiceRole(res.locals.voiceRole);
  try {
    requireCouncil(role);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const schema = z.object({
    state: z.enum(['Submitted', 'Open', 'UnderReview', 'Escalated', 'InDiscussion', 'Resolved', 'Declined', 'Merged', 'Split']),
    note: z.string().max(2000).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await setConcernState({ id: req.params.id, to: parsed.data.state, by: { type: 'council' }, note: parsed.data.note });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(presentConcernForRole(updated, role));
});

concernsRouter.post('/:id/decline', async (req, res) => {
  const role = parseVoiceRole(res.locals.voiceRole);
  try {
    requireCouncil(role);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const schema = z.object({ reason: z.string().min(3).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await declineConcern({ id: req.params.id, by: { type: 'council' }, reason: parsed.data.reason });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(presentConcernForRole(updated, role));
});

concernsRouter.post('/:id/merge', async (req, res) => {
  const role = parseVoiceRole(res.locals.voiceRole);
  try {
    requireCouncil(role);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const schema = z.object({ targetId: z.string().min(3), note: z.string().max(2000).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const merged = await mergeConcerns({ sourceId: req.params.id, targetId: parsed.data.targetId, by: { type: 'council' }, note: parsed.data.note });
  if (!merged) return res.status(404).json({ error: 'Not found' });

  res.json({
    source: presentConcernForRole(merged.source, role),
    target: presentConcernForRole(merged.target, role)
  });
});

concernsRouter.post('/:id/split', async (req, res) => {
  const role = parseVoiceRole(res.locals.voiceRole);
  try {
    requireCouncil(role);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const schema = z.object({
    a: z.object({
      title: z.string().min(3),
      description: z.string().min(10),
      category: z.enum(['HR', 'Legal', 'Benefits', 'Process', 'Other']).optional()
    }),
    b: z.object({
      title: z.string().min(3),
      description: z.string().min(10),
      category: z.enum(['HR', 'Legal', 'Benefits', 'Process', 'Other']).optional()
    }),
    note: z.string().max(2000).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await splitConcern({ id: req.params.id, a: parsed.data.a, b: parsed.data.b, note: parsed.data.note, by: { type: 'council' } });
  if (!result) return res.status(404).json({ error: 'Not found' });

  res.json({
    original: presentConcernForRole(result.original, role),
    a: presentConcernForRole(result.a, role),
    b: presentConcernForRole(result.b, role)
  });
});

concernsRouter.post('/:id/votes', async (req, res) => {
  const result = await upvoteConcern(req.params.id);
  if (!result.concern) return res.status(404).json({ error: 'Not found' });
  const role = parseVoiceRole(res.locals.voiceRole);
  res.status(201).json({
    ...result,
    concern: presentConcernForRole(result.concern, role)
  });
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
