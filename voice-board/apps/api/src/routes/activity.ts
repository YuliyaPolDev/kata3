import express from 'express';
import { z } from 'zod';

import { listActivity } from '../services/activityService';

export const activityRouter = express.Router();

activityRouter.get('/', async (req, res) => {
  const schema = z.object({
    category: z.enum(['HR', 'Legal', 'Benefits', 'Process', 'Other']).optional(),
    state: z
      .enum(['Submitted', 'Open', 'UnderReview', 'Escalated', 'InDiscussion', 'Resolved', 'Declined', 'Merged', 'Split'])
      .optional(),
    from: z.string().optional(),
    to: z.string().optional()
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const items = await listActivity({
    category: parsed.data.category,
    toState: parsed.data.state,
    fromDate: parsed.data.from,
    toDate: parsed.data.to
  });

  res.json(items);
});
