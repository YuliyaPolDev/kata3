import express from 'express';
import { z } from 'zod';

import { answerHrQuestion } from '../services/policyRagService';

export const hrRouter = express.Router();

hrRouter.post('/ask', async (req, res) => {
  const schema = z.object({ question: z.string().min(3).max(500) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await answerHrQuestion(parsed.data.question);
  res.json(result);
});
