import OpenAI from 'openai';

function mockGenerate(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes('agenda:') && p.includes('meeting agenda')) {
    return [
      'Council agenda (MOCK)',
      '',
      '1) Top priorities',
      '- Review top voted topics and assign owners',
      '',
      '2) Decisions needed',
      '- Confirm next-state transitions for under review topics',
      '',
      '3) Follow-ups',
      '- Draft resolution updates for any Resolved/Declined topics'
    ].join('\n');
  }

  if (p.includes('resolution update:') && p.includes('draft a plain-language resolution update')) {
    return 'MOCK resolution update: Here is the decision and next steps. (SOURCE 1)';
  }

  if (p.includes('write the suggested answer:') && p.includes('before they submit')) {
    if (p.includes('source 1')) return 'MOCK suggested answer: This is covered by policy. See details in (SOURCE 1).';
    if (p.includes('resolved topics:') && !p.includes('resolved topics:\n(none)'))
      return 'MOCK suggested answer: This looks similar to a resolved topic. Please review (TOPIC <id>).';
    return 'MOCK suggested answer: Not enough info in policies/resolutions; consider submitting with more details.';
  }

  return 'MOCK AI output.';
}

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseURL = process.env.OPENAI_BASE_URL;
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
}

export async function generateText(prompt: string): Promise<string | null> {
  const mode = (process.env.AI_MODE ?? '').toLowerCase();
  if (mode === 'off') return null;
  if (mode === 'mock') return mockGenerate(prompt);

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
    // eslint-disable-next-line no-console
    console.warn(err);
    return null;
  }
}
