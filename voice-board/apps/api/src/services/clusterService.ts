import { nanoid } from 'nanoid';

import type { Cluster, Concern } from '../models';
import { cosineSimilarity } from '../ai/similarity';
import { readJsonFile, writeJsonFile } from '../store/jsonStore';
import { dbPaths } from '../store/paths';
import { generateText, generateJson } from '../ai/llm';
import { buildTrendDetectionPrompt } from '../ai/prompts';

function isWithinDays(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  const now = Date.now();
  return now - t <= days * 24 * 60 * 60 * 1000;
}

export async function listClusters(): Promise<Cluster[]> {
  return readJsonFile<Cluster[]>(dbPaths.clusters, []);
}

// Global trend detection using the specific AI Prompt for MVP (replaces the manual cosine similarity batching if called)
export async function detectGlobalTrends(): Promise<Cluster[]> {
  const concerns = await readJsonFile<Concern[]>(dbPaths.concerns, []);
  const recent = concerns.filter((c) => isWithinDays(c.createdAt, 30) && c.state !== 'Resolved');

  if (recent.length < 5) return [];

  const topicsJson = JSON.stringify(recent.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description
  })));

  const prompt = buildTrendDetectionPrompt(topicsJson);

  try {
    const result = await generateJson<{
      clusters: Array<{
        themeName: string;
        summary: string;
        topicIds: string[];
      }>;
    }>(prompt);

    if (!result || !result.clusters) return [];

    const clusters = await listClusters();
    
    // Convert AI clusters to system clusters
    for (const aiCluster of result.clusters) {
       // Only accept clusters with 5 or more topics
       if (aiCluster.topicIds.length < 5) continue;

       // Basic deduplication: check if cluster already exists with similar topics
       const exists = clusters.some(c => {
         const overlap = c.concernIds.filter(id => aiCluster.topicIds.includes(id)).length;
         return overlap >= 3;
       });

       if (exists) continue;

       const aggregatedVoteCount = concerns
         .filter((c) => aiCluster.topicIds.includes(c.id))
         .reduce((sum, c) => sum + c.voteCount, 0);

       const cluster: Cluster = {
         id: nanoid(),
         title: aiCluster.themeName,
         createdAt: new Date().toISOString(),
         windowDays: 30,
         concernIds: aiCluster.topicIds,
         aggregatedVoteCount,
         themes: [aiCluster.summary],
         state: 'Trending'
       };

       clusters.unshift(cluster);
    }
    
    await writeJsonFile(dbPaths.clusters, clusters);
    return clusters;

  } catch (err) {
    console.error("AI Trend Detection failed:", err);
    return [];
  }
}

// Left intact for compatibility with existing flow if needed
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

  const cluster: Cluster = {
    id: nanoid(),
    title: (title ?? 'Trending Concern').trim(),
    createdAt: new Date().toISOString(),
    windowDays,
    concernIds: unique,
    aggregatedVoteCount,
    themes: [],
    state: 'Trending'
  };

  clusters.unshift(cluster);
  await writeJsonFile(dbPaths.clusters, clusters);
}
