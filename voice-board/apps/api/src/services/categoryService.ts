import type { ConcernCategory } from '../models';
import { generateText } from '../ai/llm';
import { promptSuggestCategory } from '../ai/prompts';

const categories: ConcernCategory[] = ['HR', 'Legal', 'Benefits', 'Process', 'Other'];

export function quickSuggestCategory(text: string): ConcernCategory {
  const t = text.toLowerCase();

  if (/(benefit|insurance|reimbursement|medical|dental|vision|401k|pension|leave)/.test(t)) return 'Benefits';
  if (/(harass|discriminat|retaliat|legal|compliance|law|contract|nda)/.test(t)) return 'Legal';
  if (/(manager|process|workflow|meeting|tooling|approval|policy|procedure)/.test(t)) return 'Process';
  if (/(hr|payroll|salary|overtime|time off|pto|vacation|sick)/.test(t)) return 'HR';

  return 'Other';
}

export async function suggestCategory(title: string, description: string): Promise<ConcernCategory> {
  const input = `${title}\n${description}`.trim();
  if (!input) return 'Other';

  const prompt = promptSuggestCategory({ title, description, categories });

  const text = await generateText(prompt);
  const cleaned = (text ?? '').trim();

  if (categories.includes(cleaned as ConcernCategory)) return cleaned as ConcernCategory;
  return quickSuggestCategory(input);
}
