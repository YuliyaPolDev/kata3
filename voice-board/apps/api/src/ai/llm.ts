import OpenAI from 'openai';

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function generateText(prompt: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  try {
    const resp = await client.responses.create({
      model,
      input: prompt
    });

    return resp.output_text;
  } catch (err) {
    // Non-fatal in MVP: app should still work without a valid key.
    // eslint-disable-next-line no-console
    console.warn('LLM call failed; continuing without AI output');
    return null;
  }
}
