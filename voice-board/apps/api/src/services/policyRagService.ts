import fs from 'fs/promises';
import path from 'path';

import type { PolicyAnswer } from '../models';
import { dataPoliciesDir } from '../store/paths';
import { generateText } from '../ai/llm';

type PolicyDoc = { 
  id: string; 
  title: string;
  tags: string[];
  content: string;
};

async function loadPolicyIndex(): Promise<PolicyDoc[]> {
  const indexPath = path.join(dataPoliciesDir, 'policies.index.json');
  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(raw) as PolicyDoc[];
  } catch (err) {
    console.error('Failed to load policies.index.json:', err);
    return [];
  }
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

export async function retrievePolicyExcerpts(question: string, limit: number): Promise<{ docTitle: string; excerpt: string; score: number }[]> {
  const docs = await loadPolicyIndex();
  const chunks: Array<{ docTitle: string; text: string; score: number }> = [];

  for (const doc of docs) {
    if (!doc.content) continue;
    // Split content by sentences or newlines roughly
    const parts = doc.content.split(/(?<=\.)\s+/).map((p) => p.trim()).filter(Boolean);

    for (const p of parts) {
      const score = scoreByKeywordOverlap(question, p);
      if (score > 0) chunks.push({ docTitle: doc.title, text: p, score });
    }

    // Also consider the whole doc as a chunk if it's short
    if (doc.content.length < 1000) {
       const score = scoreByKeywordOverlap(question, doc.content);
       if (score > 0) chunks.push({ docTitle: doc.title, text: doc.content, score });
    }
  }

  // De-duplicate exact texts
  const uniqueChunks = Array.from(new Map(chunks.map((c) => [c.text, c])).values());

  uniqueChunks.sort((a, b) => b.score - a.score);
  return uniqueChunks.slice(0, limit).map((t) => ({ docTitle: t.docTitle, excerpt: t.text.slice(0, 500), score: t.score }));
}

export async function answerHrQuestion(question: string): Promise<PolicyAnswer> {
  const top = await retrievePolicyExcerpts(question, 5);
  const sources = top.map((t) => ({ docTitle: t.docTitle, excerpt: t.excerpt }));

  if (top.length === 0) {
    return {
      answer: "I couldn't find any relevant HR policies for your question.",
      sources: []
    };
  }

  const context = top.map((t, idx) => `SOURCE ${idx + 1} (${t.docTitle}):\n${t.excerpt}`).join('\n\n');

  const prompt = [
    'You are an HR assistant. Answer using ONLY the provided SOURCES.',
    'If the answer is not in the sources, say: "Not found in the provided policies."',
    '',
    context,
    '',
    `Question: ${question}`,
    'Answer:'
  ].join('\n');

  const llmAnswer = await generateText(prompt);

  return {
    answer: llmAnswer ?? 'LLM not configured. Here are the most relevant policy excerpts.',
    sources
  };
}