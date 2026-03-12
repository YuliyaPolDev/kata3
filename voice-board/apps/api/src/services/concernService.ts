import { nanoid } from 'nanoid';

import type { Concern, ConcernCategory, ConcernState } from '../models';
import { readJsonFile, writeJsonFile } from '../store/jsonStore';
import { dbPaths } from '../store/paths';
import { findSimilarConcerns } from './duplicateService';
import { computePriorityScore } from './priorityService';
import { classifyConcern } from './toneService';
import { updateTrendingClustersForConcern } from './clusterService';
import { suggestCategory } from './categoryService';

type CreateConcernInput = {
  title: string;
  description: string;
  category?: ConcernCategory;
};

export async function listConcerns(): Promise<Concern[]> {
  return readJsonFile<Concern[]>(dbPaths.concerns, []);
}

export async function getConcern(id: string): Promise<Concern | null> {
  const all = await listConcerns();
  return all.find((c) => c.id === id) ?? null;
}

export async function findSimilar(title: string, description: string) {
  const concerns = await listConcerns();
  return findSimilarConcerns(concerns, title, description);
}

export async function createConcern(input: CreateConcernInput): Promise<Concern> {
  const now = new Date().toISOString();
  const concerns = await listConcerns();

  const similar = findSimilarConcerns(concerns, input.title, input.description, 5);

  const decidedCategory = input.category ?? (await suggestCategory(input.title, input.description));

  const concern: Concern = {
    id: nanoid(),
    title: input.title,
    description: input.description,
    category: decidedCategory,
    state: 'Open',
    createdAt: now,
    updatedAt: now,
    voteCount: 0,
    followerCount: 0,
    ai: {
      similarIds: similar.map((s) => s.id),
      duplicateOfId: null
    }
  };

  const classification = await classifyConcern(concern);
  if (classification) {
    concern.ai.tone = classification.tone;
    concern.ai.urgency = classification.urgency;
    concern.ai.sentiment = classification.sentiment;
  }

  concern.ai.priorityScore = computePriorityScore(concern);

  concerns.unshift(concern);
  await writeJsonFile(dbPaths.concerns, concerns);

  await updateTrendingClustersForConcern(concern);

  return concern;
}

export async function setConcernState(id: string, state: ConcernState): Promise<Concern | null> {
  const concerns = await listConcerns();
  const idx = concerns.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const updated: Concern = {
    ...concerns[idx],
    state,
    updatedAt: new Date().toISOString()
  };

  updated.ai.priorityScore = computePriorityScore(updated);

  concerns[idx] = updated;
  await writeJsonFile(dbPaths.concerns, concerns);
  return updated;
}
