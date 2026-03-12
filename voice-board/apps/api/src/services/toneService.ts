import type { Concern } from '../models';
import { generateText } from '../ai/llm';
import { promptClassifyToneUrgencySentiment } from '../ai/prompts';

export type ConcernClassification = {
  tone: 'Calm' | 'Neutral' | 'Heated';
  urgency: 'Low' | 'Medium' | 'High';
  sentiment: number;
};

export async function classifyConcern(concern: Concern): Promise<ConcernClassification | null> {
  const prompt = promptClassifyToneUrgencySentiment(concern);

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
