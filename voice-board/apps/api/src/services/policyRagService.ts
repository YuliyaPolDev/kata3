import fs from 'fs/promises';
import path from 'path';

import type { PolicyAnswer } from '../models';
import { dataPoliciesDir } from '../store/paths';
import { generateText } from '../ai/llm';
import { promptHrAnswer } from '../ai/prompts';

type PolicyDoc = { id: string; title: string; file: string };

async function loadPolicyIndex(): Promise<PolicyDoc[]> {
  const indexPath = path.join(dataPoliciesDir, 'policies.index.json');
  const raw = await fs.readFile(indexPath, 'utf-8');
  return JSON.parse(raw) as PolicyDoc[];
}

function scoreByKeywordOverlap(question: string, chunk: string): number {
  const qTokens = new Set(
    question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3)
  );

  const cTokens = new Set(
    chunk
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3)
  );

  let overlap = 0;
  for (const t of qTokens) if (cTokens.has(t)) overlap += 1;
  return overlap;
}

export type PolicyExcerpt = { docTitle: string; excerpt: string; score: number };

export async function retrievePolicyExcerpts(query: string, limit = 3): Promise<PolicyExcerpt[]> {
  const docs = await loadPolicyIndex();
  const chunks: Array<{ docTitle: string; text: string; score: number }> = [];

  for (const doc of docs) {
    const filePath = path.join(dataPoliciesDir, doc.file);
    const raw = await fs.readFile(filePath, 'utf-8');
    const parts = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

    for (const p of parts) {
      const score = scoreByKeywordOverlap(query, p);
      if (score > 0) chunks.push({ docTitle: doc.title, text: p, score });
    }
  }

  chunks.sort((a, b) => b.score - a.score);
  return chunks.slice(0, limit).map((t) => ({ docTitle: t.docTitle, excerpt: t.text.slice(0, 500), score: t.score }));
}

export async function answerHrQuestion(question: string): Promise<PolicyAnswer> {
  const top = await retrievePolicyExcerpts(question, 5);
  const sources = top.map((t) => ({ docTitle: t.docTitle, excerpt: t.excerpt }));
  const llmAnswer = await generateText(promptHrAnswer(question, sources));

  return {
    answer: llmAnswer ?? 'LLM not configured. Here are the most relevant policy excerpts.',
    sources
  };
}
