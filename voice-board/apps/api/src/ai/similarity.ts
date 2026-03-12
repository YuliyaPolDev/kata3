function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export function cosineSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();

  for (const t of tokensA) freqA.set(t, (freqA.get(t) ?? 0) + 1);
  for (const t of tokensB) freqB.set(t, (freqB.get(t) ?? 0) + 1);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [, v] of freqA) normA += v * v;
  for (const [, v] of freqB) normB += v * v;

  for (const [t, vA] of freqA) {
    const vB = freqB.get(t) ?? 0;
    dot += vA * vB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
