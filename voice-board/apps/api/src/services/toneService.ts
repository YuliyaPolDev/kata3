import type { Concern } from '../models';
import { generateJson } from '../ai/llm';
import { buildTopicAnalysisPrompt } from '../ai/prompts';

export type ConcernClassification = {
  category: "HR" | "Legal" | "Benefits" | "Process" | "Other";
  tone: string;
  urgency: "Low" | "Medium" | "High";
  sentiment: number;
  reasoning: string;
};

export async function classifyConcern(concern: Concern): Promise<ConcernClassification | null> {
  const prompt = buildTopicAnalysisPrompt(concern.title, concern.description);

  try {
    const aiAnalysis = await generateJson<{
      category: "HR" | "Legal" | "Benefits" | "Process" | "Other";
      tone: string;
      urgency: "Low" | "Medium" | "High";
      sentimentScore: number;
      reasoning: string;
    }>(prompt);

    if (!aiAnalysis) return null;

    return {
      category: aiAnalysis.category,
      tone: aiAnalysis.tone,
      urgency: aiAnalysis.urgency,
      sentiment: aiAnalysis.sentimentScore,
      reasoning: aiAnalysis.reasoning
    };
  } catch (err) {
    console.error('Tone classification failed:', err);
    return null;
  }
}
