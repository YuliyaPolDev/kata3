import type { Concern } from '../models';
import { generateText } from '../ai/llm';

export type ConcernClassification = {
  tone: 'Calm' | 'Neutral' | 'Heated';
  urgency: 'Low' | 'Medium' | 'High';
  sentiment: number;
};

export async function classifyConcern(concern: Concern): Promise<ConcernClassification | null> {
  const prompt = [
    'Classify the following employee concern.',
    'Return ONLY valid JSON with keys: tone (Calm|Neutral|Heated), urgency (Low|Medium|High), sentiment (-1..1).',
    '',
    `Title: ${concern.title}`,
    `Description: ${concern.description}`
  ].join('\n');

  const text = await generateText(prompt);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as ConcernClassification;
    if (typeof parsed.sentiment !== 'number') return null;
    return {
      tone: parsed.tone,
      urgency: parsed.urgency,
      sentiment: Math.max(-1, Math.min(1, parsed.sentiment))
    };
  } catch {
    return null;
  }
}
