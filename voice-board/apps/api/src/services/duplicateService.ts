import type { Concern } from '../models';
import { cosineSimilarity } from '../ai/similarity';

export type SimilarConcern = { id: string; title: string; score: number; state: Concern['state'] };

export function findSimilarConcerns(
  concerns: Concern[],
  inputTitle: string,
  inputDescription: string,
  limit: number = 5
): SimilarConcern[] {
  const input = `${inputTitle}\n${inputDescription}`.trim();
  if (!input) return [];

  const scored = concerns
    .map((c) => {
      const haystack = `${c.title}\n${c.description}`;
      return {
        id: c.id,
        title: c.title,
        state: c.state,
        score: cosineSimilarity(input, haystack)
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
