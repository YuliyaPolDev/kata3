import express from 'express';
import { z } from 'zod';

import { generateText } from '../ai/llm';
import { promptAgendaBuilder, promptResolutionComposer } from '../ai/prompts';
import { getConcern, listConcerns } from '../services/concernService';
import { retrievePolicyExcerpts } from '../services/policyRagService';
import { parseVoiceRole, requireCouncil } from '../utils/role';

export const councilRouter = express.Router();

councilRouter.post('/agenda', async (_req, res) => {
  const role = parseVoiceRole(res.locals.voiceRole);
  try {
    requireCouncil(role);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const concerns = await listConcerns();
  const topics = concerns
    .filter((c) => !['Resolved', 'Declined', 'Merged', 'Split'].includes(c.state))
    .map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      state: c.state,
      voteCount: c.voteCount,
      priorityScore: c.ai?.priorityScore
    }))
    .sort((a, b) => {
      const pa = a.priorityScore ?? 0;
      const pb = b.priorityScore ?? 0;
      if (pb !== pa) return pb - pa;
      return b.voteCount - a.voteCount;
    });

  const agenda = await generateText(promptAgendaBuilder({ topics }));
  res.json({ agenda: agenda ? agenda.trim() : null });
});

councilRouter.post('/concerns/:id/resolution-draft', async (req, res) => {
  const role = parseVoiceRole(res.locals.voiceRole);
  try {
    requireCouncil(role);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const schema = z.object({ decisionNotes: z.string().max(2000).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const concern = await getConcern(req.params.id);
  if (!concern) return res.status(404).json({ error: 'Not found' });

  const query = `${concern.title}\n${concern.description}`.trim();
  const policy = query ? await retrievePolicyExcerpts(query, 4) : [];

  const draft = await generateText(
    promptResolutionComposer({
      concern: {
        id: concern.id,
        title: concern.title,
        description: concern.description,
        category: concern.category,
        state: concern.state,
        declinedReason: concern.declinedReason,
        mergedIntoId: concern.mergedIntoId,
        splitIntoIds: concern.splitIntoIds
      },
      policySources: policy.map((p) => ({ docTitle: p.docTitle, excerpt: p.excerpt })),
      decisionNotes: parsed.data.decisionNotes
    })
  );

  res.json({ draft: draft ? draft.trim() : null });
});
