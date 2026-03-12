import type { Concern, ConcernCategory, ConcernState } from '../models';
import type { PolicyExcerpt } from '../services/policyRagService';

export function promptClassifyToneUrgencySentiment(concern: Pick<Concern, 'title' | 'description'>): string {
  return [
    'You classify an employee-submitted concern for triage.',
    'Return ONLY valid JSON with keys:',
    '- tone: Calm | Neutral | Heated',
    '- urgency: Low | Medium | High',
    '- sentiment: number between -1 and 1 (negative = unhappy / distressed, positive = satisfied) ',
    '',
    `Title: ${concern.title}`,
    `Description: ${concern.description}`
  ].join('\n');
}

export function promptSuggestCategory(input: { title: string; description: string; categories: ConcernCategory[] }): string {
  return [
    'You classify employee concerns into exactly one category.',
    `Valid categories: ${input.categories.join(', ')}.`,
    'Return ONLY the category name (no punctuation).',
    '',
    `Title: ${input.title}`,
    `Description: ${input.description}`
  ].join('\n');
}

export function promptClusterTitle(input: { exampleTitle: string; exampleDescription: string }): string {
  return [
    'Create a short title (max 8 words) for a trending employee concern cluster.',
    'Return ONLY the title.',
    '',
    input.exampleTitle,
    input.exampleDescription
  ].join('\n');
}

export function promptClusterThemes(items: Array<{ title: string; description: string }>): string {
  return [
    'Summarize 3-5 common themes as short bullet points (no numbering).',
    'Return ONLY bullet lines that start with "- ".',
    '',
    ...items.map((c) => `- ${c.title}: ${c.description}`)
  ].join('\n');
}

export function promptHrAnswer(question: string, sources: Array<{ docTitle: string; excerpt: string }>): string {
  const context = sources
    .map((t, idx) => `SOURCE ${idx + 1} (${t.docTitle}):\n${t.excerpt}`)
    .join('\n\n');

  return [
    'You are an HR assistant.',
    'Answer using ONLY the provided SOURCES.',
    'If the answer is not in the sources, say: "Not found in the provided policies."',
    'Cite sources inline like: (SOURCE 1) or (SOURCE 2).',
    '',
    context,
    '',
    `Question: ${question}`,
    'Answer:'
  ].join('\n');
}

export function promptPreSubmissionAnswerCheck(input: {
  title: string;
  description: string;
  resolvedTopics: Array<{ id: string; title: string; description?: string }>; // limited
  policyExcerpts: PolicyExcerpt[];
}): string {
  const topics = input.resolvedTopics
    .slice(0, 5)
    .map((t) => `- [${t.id}] ${t.title}${t.description ? `: ${t.description}` : ''}`)
    .join('\n');

  const policies = input.policyExcerpts
    .slice(0, 5)
    .map((p, idx) => `SOURCE ${idx + 1} (${p.docTitle}):\n${p.excerpt}`)
    .join('\n\n');

  return [
    'You help an employee before they submit a new topic.',
    'Goal: provide a short, plain-language answer if possible, based on resolved topics and policy SOURCES.',
    'Rules:',
    '- If there is a relevant policy, summarize it and cite SOURCES as (SOURCE 1), etc.',
    '- If a resolved topic already addressed this, mention it as (TOPIC <id>).',
    '- If neither provides an answer, say what info is missing and suggest submitting the topic.',
    '- Keep it under 120 words.',
    '',
    `Draft title: ${input.title}`,
    `Draft description: ${input.description}`,
    '',
    'Resolved topics:',
    topics || '(none)',
    '',
    'Policy sources:',
    policies || '(none)',
    '',
    'Write the suggested answer:'
  ].join('\n');
}

export function promptRefineDuplicates(input: {
  title: string;
  description: string;
  candidates: Array<{ id: string; title: string; description?: string; state: ConcernState }>;
}): string {
  const cand = input.candidates
    .slice(0, 8)
    .map((c) => `- [${c.id}] (${c.state}) ${c.title}${c.description ? `: ${c.description}` : ''}`)
    .join('\n');

  return [
    'You detect duplicates for an employee-submitted topic.',
    'Given a draft and a list of candidate existing topics, pick which candidates are true duplicates.',
    'Return ONLY valid JSON as: {"duplicates": [{"id": "...", "confidence": 0.0-1.0, "reason": "..."}] }',
    'Rules:',
    '- Only include candidates that are actually the same underlying issue.',
    '- confidence should be high (>0.75) only when clearly same issue.',
    '- reason max 16 words.',
    '',
    `Draft title: ${input.title}`,
    `Draft description: ${input.description}`,
    '',
    'Candidates:',
    cand || '(none)'
  ].join('\n');
}

export function promptAgendaBuilder(input: {
  topics: Array<{ id: string; title: string; category: ConcernCategory; state: ConcernState; voteCount: number; priorityScore?: number }>;
}): string {
  const lines = input.topics
    .slice(0, 12)
    .map((t) => `- [${t.id}] ${t.title} (${t.category}, ${t.state}) votes=${t.voteCount} priority=${t.priorityScore ?? '—'}`)
    .join('\n');

  return [
    'You are helping an employee council prepare a meeting agenda.',
    'Write a meeting-ready agenda in plain language with sections and bullet points.',
    'Include:',
    '- Top priorities first',
    '- For each item: title, why it matters (1 sentence), and proposed next step (1 sentence).',
    '- Keep total under ~400 words.',
    '',
    'Topics:',
    lines || '(none)',
    '',
    'Agenda:'
  ].join('\n');
}

export function promptResolutionComposer(input: {
  concern: Pick<Concern, 'id' | 'title' | 'description' | 'category' | 'state' | 'declinedReason' | 'mergedIntoId' | 'splitIntoIds'>;
  policySources: Array<{ docTitle: string; excerpt: string }>;
  decisionNotes?: string;
}): string {
  const sources = input.policySources
    .slice(0, 6)
    .map((s, idx) => `SOURCE ${idx + 1} (${s.docTitle}):\n${s.excerpt}`)
    .join('\n\n');

  return [
    'You draft a plain-language resolution update for employees.',
    'Rules:',
    '- Be concrete and respectful.',
    '- If referencing policy, cite sources as (SOURCE 1), etc.',
    '- If the topic is Declined, include the reason clearly.',
    '- If Merged, explain it was merged into the target topic ID.',
    '- If Split, explain it was split into the new topic IDs.',
    '- Keep it under 180 words.',
    '',
    `Topic: [${input.concern.id}] ${input.concern.title}`,
    `Category: ${input.concern.category}`,
    `State: ${input.concern.state}`,
    `Description: ${input.concern.description}`,
    input.concern.declinedReason ? `Declined reason: ${input.concern.declinedReason}` : '',
    input.concern.mergedIntoId ? `Merged into: ${input.concern.mergedIntoId}` : '',
    input.concern.splitIntoIds?.length ? `Split into: ${input.concern.splitIntoIds.join(', ')}` : '',
    input.decisionNotes ? `Council notes: ${input.decisionNotes}` : '',
    '',
    'Policy sources:',
    sources || '(none)',
    '',
    'Resolution update:'
  ].filter(Boolean).join('\n');
}
