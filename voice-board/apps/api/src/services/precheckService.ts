import type { ConcernCategory, Concern } from '../models';

import { listConcerns } from './concernService';
import { findSimilarConcerns } from './duplicateService';
import { retrievePolicyExcerpts, type PolicyExcerpt } from './policyRagService';
import { quickSuggestCategory } from './categoryService';
import { generateText } from '../ai/llm';
import { promptPreSubmissionAnswerCheck, promptRefineDuplicates } from '../ai/prompts';

export type PrecheckResult = {
  openTopics: Array<{ id: string; title: string; score: number; state: Concern['state']; reason?: string }>;
  resolvedTopics: Array<{ id: string; title: string; score: number; state: Concern['state'] }>;
  policyExcerpts: PolicyExcerpt[];
  suggestedCategory: ConcernCategory;
  suggestedAnswer?: string;
};

export async function precheckConcern(title: string, description: string): Promise<PrecheckResult> {
  const concerns = await listConcerns();

  const open = concerns.filter((c) => !['Resolved', 'Declined', 'Merged', 'Split'].includes(c.state));
  const resolved = concerns.filter((c) => c.state === 'Resolved');

  let openTopics = findSimilarConcerns(open, title, description, 5) as Array<{
    id: string;
    title: string;
    score: number;
    state: Concern['state'];
    reason?: string;
  }>;
  const resolvedTopics = findSimilarConcerns(resolved, title, description, 3);

  const query = `${title}\n${description}`.trim();
  const policyExcerpts = query ? await retrievePolicyExcerpts(query, 3) : [];

  const suggestedCategory = quickSuggestCategory(query);

  // Optional AI enhancements (best-effort)
  let suggestedAnswer: string | undefined;
  if (query) {
    const resolvedFull = resolvedTopics
      .slice(0, 5)
      .map((t) => {
        const full = concerns.find((c) => c.id === t.id);
        return { id: t.id, title: t.title, description: full?.description?.slice(0, 240) };
      });

    const answer = await generateText(
      promptPreSubmissionAnswerCheck({
        title,
        description,
        resolvedTopics: resolvedFull,
        policyExcerpts
      })
    );
    if (answer) suggestedAnswer = answer.trim();
  }

  if (query && openTopics.length) {
    const candidates = openTopics
      .slice(0, 5)
      .map((t) => {
        const full = concerns.find((c) => c.id === t.id);
        return { id: t.id, title: t.title, description: full?.description?.slice(0, 220), state: full?.state ?? t.state };
      });

    const dupText = await generateText(
      promptRefineDuplicates({
        title,
        description,
        candidates
      })
    );

    try {
      if (dupText) {
        const parsed = JSON.parse(dupText) as { duplicates?: Array<{ id: string; confidence: number; reason?: string }> };
        const ranked = (parsed.duplicates ?? [])
          .filter((d) => typeof d.id === 'string')
          .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

        const reasonById = new Map(ranked.map((d) => [d.id, d.reason]));
        const rankIndex = new Map(ranked.map((d, idx) => [d.id, idx]));

        openTopics = [...openTopics]
          .map((t) => ({ ...t, reason: reasonById.get(t.id) }))
          .sort((a, b) => {
            const ra = rankIndex.has(a.id) ? (rankIndex.get(a.id) as number) : 999;
            const rb = rankIndex.has(b.id) ? (rankIndex.get(b.id) as number) : 999;
            if (ra !== rb) return ra - rb;
            return b.score - a.score;
          });
      }
    } catch {
      // ignore parse errors
    }
  }

  return { openTopics, resolvedTopics, policyExcerpts, suggestedCategory, suggestedAnswer };
}
