import OpenAI from 'openai';

function getClient(): OpenAI | null {
  const apiKey = process.env.DIAL_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  
  return new OpenAI({ 
    apiKey,
    baseURL: process.env.DIAL_BASE_URL || 'https://ai-proxy.epam.com/api/v1',
    defaultHeaders: {
      'api-key': apiKey // Sometimes DIAL proxies require api-key header
    }
  });
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string | null> {
  const client = getClient();
  if (!client) {
    console.warn('⚠️ No DIAL_API_KEY or OPENAI_API_KEY found, skipping AI call.');
    return null;
  }

  const model = process.env.DIAL_MODEL || 'gpt-4o-mini';
  
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.2, // Low temperature for more deterministic RAG responses
    });

    return response.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error('❌ LLM call failed:', err);
    return null;
  }
}

export async function generateJson<T>(prompt: string, systemPrompt?: string): Promise<T | null> {
  const text = await generateText(prompt, systemPrompt);
  if (!text) return null;

  try {
    // Basic extraction to handle markdown JSON blocks if the model outputs them
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    console.error('❌ Failed to parse JSON from LLM response:', text);
    return null;
  }
}
