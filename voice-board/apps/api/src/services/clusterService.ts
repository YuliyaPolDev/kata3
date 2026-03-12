import { nanoid } from 'nanoid';

import type { Cluster, Concern } from '../models';
import { cosineSimilarity } from '../ai/similarity';
import { readJsonFile, writeJsonFile } from '../store/jsonStore';
import { dbPaths } from '../store/paths';
import { generateText } from '../ai/llm';
import { promptClusterThemes, promptClusterTitle } from '../ai/prompts';

function isWithinDays(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  const now = Date.now();
  return now - t <= days * 24 * 60 * 60 * 1000;
}

export async function listClusters(): Promise<Cluster[]> {
  const clusters = await readJsonFile<Cluster[]>(dbPaths.clusters, []);
  if (clusters.length > 0) return clusters;

  // Backfill for existing datasets: clusters are normally created on submission,
  // but demo/test data may pre-exist without ever triggering an update.
  const concerns = await readJsonFile<Concern[]>(dbPaths.concerns, []);
  if (concerns.length === 0) return clusters;

  const rebuilt = await rebuildTrendingClustersFromConcerns(concerns);
  if (rebuilt.length > 0) {
    await writeJsonFile(dbPaths.clusters, rebuilt);
  }
  return rebuilt;
}

async function rebuildTrendingClustersFromConcerns(allConcerns: Concern[]): Promise<Cluster[]> {
  const windowDays = 30;
  const similarityCutoff = 0.45;
  const minUniqueConcerns = 4;

  const recent = allConcerns.filter((c) => isWithinDays(c.createdAt, windowDays));
  // Prefer newest seeds first for a nicer default ordering.
  recent.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  const clusters: Cluster[] = [];

  for (const seed of recent) {
    const similar = recent
      .filter((c) => c.id !== seed.id)
      .map((c) => ({
        id: c.id,
        score: cosineSimilarity(`${seed.title}\n${seed.description}`, `${c.title}\n${c.description}`)
      }))
      .filter((x) => x.score >= similarityCutoff)
      .sort((a, b) => b.score - a.score);

    const matchingIds = [seed.id, ...similar.map((s) => s.id)];
    const unique = Array.from(new Set(matchingIds));
    if (unique.length < minUniqueConcerns) continue;

    const existing = clusters.find((cl) => {
      const overlap = cl.concernIds.filter((id) => unique.includes(id)).length;
      return overlap >= 3 && cl.state === 'Trending';
    });

    const aggregatedVoteCount = allConcerns
      .filter((c) => unique.includes(c.id))
      .reduce((sum, c) => sum + c.voteCount, 0);

    if (existing) {
      const mergedIds = Array.from(new Set([...existing.concernIds, ...unique]));
      existing.concernIds = mergedIds;
      existing.aggregatedVoteCount = allConcerns
        .filter((c) => mergedIds.includes(c.id))
        .reduce((sum, c) => sum + c.voteCount, 0);
      continue;
    }

    const titleText = await generateText(promptClusterTitle({ exampleTitle: seed.title, exampleDescription: seed.description }));
    const title = (titleText ?? seed.title ?? 'Trending Concern').trim();

    const themeInput = unique
      .slice(0, 8)
      .map((id) => {
        const c = allConcerns.find((x) => x.id === id);
        return c ? { title: c.title, description: c.description } : null;
      })
      .filter((x): x is { title: string; description: string } => Boolean(x));

    const themesText = await generateText(promptClusterThemes(themeInput));
    const themes = (themesText ?? '')
      .split(/\n+/)
      .map((t) => t.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 5);

    clusters.push({
      id: nanoid(),
      title,
      createdAt: new Date().toISOString(),
      windowDays,
      concernIds: unique,
      aggregatedVoteCount,
      themes,
      state: 'Trending'
    });
  }

  // Highest-signal clusters first.
  clusters.sort((a, b) => (b.aggregatedVoteCount ?? 0) - (a.aggregatedVoteCount ?? 0));
  return clusters;
}

export async function updateTrendingClustersForConcern(concern: Concern): Promise<void> {
  const windowDays = 30;
  const similarityCutoff = 0.45;
  const minUniqueConcerns = 4;
  const concerns = await readJsonFile<Concern[]>(dbPaths.concerns, []);
  const recent = concerns.filter((c) => isWithinDays(c.createdAt, windowDays));

  const similar = recent
    .filter((c) => c.id !== concern.id)
    .map((c) => ({
      id: c.id,
      score: cosineSimilarity(`${concern.title}\n${concern.description}`, `${c.title}\n${c.description}`)
    }))
    .filter((x) => x.score >= similarityCutoff)
    .sort((a, b) => b.score - a.score);

  const matchingIds = [concern.id, ...similar.map((s) => s.id)];
  const unique = Array.from(new Set(matchingIds));

  if (unique.length < minUniqueConcerns) return;

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
      aggregatedVoteCount: concerns
        .filter((c) => merged.includes(c.id))
        .reduce((sum, c) => sum + c.voteCount, 0)
    };

    const idx = clusters.findIndex((c) => c.id === existing.id);
    clusters[idx] = updated;
    await writeJsonFile(dbPaths.clusters, clusters);
    return;
  }

  const titleText = await generateText(promptClusterTitle({ exampleTitle: concern.title, exampleDescription: concern.description }));

  const themeInput = unique
    .slice(0, 8)
    .map((id) => {
      const c = concerns.find((x) => x.id === id);
      return c ? { title: c.title, description: c.description } : null;
    })
    .filter((x): x is { title: string; description: string } => Boolean(x));

  const themesText = await generateText(promptClusterThemes(themeInput));

  const themes = (themesText ?? '')
    .split(/\n+/)
    .map((t) => t.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5);

  const cluster: Cluster = {
    id: nanoid(),
    title: (titleText ?? concern.title ?? 'Trending Concern').trim(),
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
