import type { ConcernCategory, Concern } from '../models';

import { listConcerns } from './concernService';
import { findSimilarConcerns } from './duplicateService';
import { retrievePolicyExcerpts, type PolicyExcerpt } from './policyRagService';
import { quickSuggestCategory } from './categoryService';

export type PrecheckResult = {
  openTopics: Array<{ id: string; title: string; score: number; state: Concern['state'] }>;
  resolvedTopics: Array<{ id: string; title: string; score: number; state: Concern['state'] }>;
  policyExcerpts: PolicyExcerpt[];
  suggestedCategory: ConcernCategory;
};

export async function precheckConcern(title: string, description: string): Promise<PrecheckResult> {
  const concerns = await listConcerns();

  const open = concerns.filter((c) => !['Resolved', 'Declined', 'Merged', 'Split'].includes(c.state));
  const resolved = concerns.filter((c) => c.state === 'Resolved');

  const openTopics = findSimilarConcerns(open, title, description, 5);
  const resolvedTopics = findSimilarConcerns(resolved, title, description, 3);

  const query = `${title}\n${description}`.trim();
  const policyExcerpts = query ? await retrievePolicyExcerpts(query, 3) : [];

  const suggestedCategory = quickSuggestCategory(query);

  return { openTopics, resolvedTopics, policyExcerpts, suggestedCategory };
}
