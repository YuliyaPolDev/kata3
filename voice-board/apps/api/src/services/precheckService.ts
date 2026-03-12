import type { ConcernCategory, Concern } from '../models';

import { readJsonFile } from '../store/jsonStore';
import { dbPaths } from '../store/paths';
import { findSimilarConcerns } from './duplicateService';
import { retrievePolicyExcerpts, type PolicyExcerpt } from './policyRagService';
import { quickSuggestCategory } from './categoryService';
import { generateJson } from '../ai/llm';
import { buildSmartSubmissionPrompt } from '../ai/prompts';

export type PrecheckResult = {
  openTopics: Array<{ id: string; title: string; score: number; state: Concern['state'] }>;
  resolvedTopics: Array<{ id: string; title: string; score: number; state: Concern['state'] }>;
  policyExcerpts: PolicyExcerpt[];
  suggestedCategory: ConcernCategory;
  aiAnalysis?: {
    isAnswered: boolean;
    answerSummary: string | null;
    duplicateTopicIds: string[];
  } | null;
};

export async function precheckConcern(title: string, description: string): Promise<PrecheckResult> {
  const concerns = await readJsonFile<Concern[]>(dbPaths.concerns, []);

  const open = concerns.filter((c) => c.state !== 'Resolved');
  const resolved = concerns.filter((c) => c.state === 'Resolved');

  const openTopics = findSimilarConcerns(open, title, description, 5);
  const resolvedTopics = findSimilarConcerns(resolved, title, description, 3);

  const query = `${title}\n${description}`.trim();
  const policyExcerpts = query ? await retrievePolicyExcerpts(query, 3) : [];

  const suggestedCategory = quickSuggestCategory(query);

  // Run the AI RAG analysis using our Smart Submission prompt
  let aiAnalysis = null;
  if (query.length > 10) {
    const resolvedTopicsJson = JSON.stringify(resolvedTopics.map(t => ({ id: t.id, title: t.title })));
    const openTopicsJson = JSON.stringify(openTopics.map(t => ({ id: t.id, title: t.title })));
    const hrPoliciesJson = JSON.stringify(policyExcerpts.map(p => ({ title: p.docTitle, content: p.excerpt })));

    const prompt = buildSmartSubmissionPrompt(
      title, 
      description, 
      resolvedTopicsJson, 
      openTopicsJson, 
      hrPoliciesJson
    );

    try {
      aiAnalysis = await generateJson<{
        isAnswered: boolean;
        answerSummary: string | null;
        duplicateTopicIds: string[];
      }>(prompt);
    } catch (e) {
      console.warn("AI Precheck analysis failed:", e);
    }
  }

  return { openTopics, resolvedTopics, policyExcerpts, suggestedCategory, aiAnalysis };
}
