import { nanoid } from 'nanoid';

import type { Cluster, Concern } from '../models';
import { cosineSimilarity } from '../ai/similarity';
import { readJsonFile, writeJsonFile } from '../store/jsonStore';
import { dbPaths } from '../store/paths';
import { generateText } from '../ai/llm';

function isWithinDays(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  const now = Date.now();
  return now - t <= days * 24 * 60 * 60 * 1000;
}

export async function listClusters(): Promise<Cluster[]> {
  return readJsonFile<Cluster[]>(dbPaths.clusters, []);
}

export async function updateTrendingClustersForConcern(concern: Concern): Promise<void> {
  const windowDays = 30;
  const concerns = await readJsonFile<Concern[]>(dbPaths.concerns, []);
  const recent = concerns.filter((c) => isWithinDays(c.createdAt, windowDays));

  const similar = recent
    .filter((c) => c.id !== concern.id)
    .map((c) => ({
      id: c.id,
      score: cosineSimilarity(`${concern.title}\n${concern.description}`, `${c.title}\n${c.description}`)
    }))
    .filter((x) => x.score >= 0.55)
    .sort((a, b) => b.score - a.score);

  const matchingIds = [concern.id, ...similar.map((s) => s.id)];
  const unique = Array.from(new Set(matchingIds));

  if (unique.length < 5) return;

  const clusters = await listClusters();

  const existing = clusters.find((cl) => {
    const overlap = cl.concernIds.filter((id) => unique.includes(id)).length;
    return overlap >= 3 && cl.state === 'Trending';
  });

  const aggregatedVoteCount = concerns
    .filter((c) => unique.includes(c.id))
    .reduce((sum, c) => sum + c.voteCount, 0);

  if (existing) {
    const merged = Array.from(new Set([...existing.concernIds, ...unique]));
    const updated: Cluster = {
      ...existing,
      concernIds: merged,
      aggregatedVoteCount
    };

    const idx = clusters.findIndex((c) => c.id === existing.id);
    clusters[idx] = updated;
    await writeJsonFile(dbPaths.clusters, clusters);
    return;
  }

  const title = await generateText(
    `Create a short title (max 8 words) for a trending employee concern cluster.\n\n${concern.title}\n${concern.description}`
  );

  const themesText = await generateText(
    'Summarize 3-5 common themes as short bullet points (no numbering) for these concerns:\n\n' +
      unique
        .slice(0, 8)
        .map((id) => {
          const c = concerns.find((x) => x.id === id);
          return c ? `- ${c.title}: ${c.description}` : '';
        })
        .filter(Boolean)
        .join('\n')
  );

  const themes = (themesText ?? '')
    .split(/\n+/)
    .map((t) => t.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5);

  const cluster: Cluster = {
    id: nanoid(),
    title: (title ?? 'Trending Concern').trim(),
    createdAt: new Date().toISOString(),
    windowDays,
    concernIds: unique,
    aggregatedVoteCount,
    themes,
    state: 'Trending'
  };

  clusters.unshift(cluster);
  await writeJsonFile(dbPaths.clusters, clusters);
}
