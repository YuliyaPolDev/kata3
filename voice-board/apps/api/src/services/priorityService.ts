import type { Concern } from '../models';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function computePriorityScore(concern: Concern, now = new Date()): number {
  const created = new Date(concern.createdAt);
  const ageDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  const voteScore = clamp(concern.voteCount / 20, 0, 1);
  const recencyScore = clamp(1 - ageDays / 30, 0, 1);
  const sentiment = concern.ai.sentiment ?? 0;
  const negativeSentimentScore = clamp(-sentiment, 0, 1);

  const urgencyBoost = concern.ai.urgency === 'High' ? 1 : concern.ai.urgency === 'Medium' ? 0.5 : 0;

  const score01 = 0.45 * voteScore + 0.3 * recencyScore + 0.2 * negativeSentimentScore + 0.05 * urgencyBoost;
  return Math.round(score01 * 100);
}
