import { nanoid } from 'nanoid';

import type { Concern, Vote } from '../models';
import { readJsonFile, writeJsonFile } from '../store/jsonStore';
import { dbPaths } from '../store/paths';
import { computePriorityScore } from './priorityService';

export async function upvoteConcern(concernId: string): Promise<{ concern: Concern | null; vote: Vote | null }> {
  const concerns = await readJsonFile<Concern[]>(dbPaths.concerns, []);
  const idx = concerns.findIndex((c) => c.id === concernId);
  if (idx === -1) return { concern: null, vote: null };

  const vote: Vote = {
    id: nanoid(),
    concernId,
    createdAt: new Date().toISOString(),
    weight: 1
  };

  const votes = await readJsonFile<Vote[]>(dbPaths.votes, []);
  votes.unshift(vote);

  const updated: Concern = {
    ...concerns[idx],
    voteCount: concerns[idx].voteCount + 1,
    updatedAt: new Date().toISOString()
  };
  updated.ai.priorityScore = computePriorityScore(updated);

  concerns[idx] = updated;

  await writeJsonFile(dbPaths.votes, votes);
  await writeJsonFile(dbPaths.concerns, concerns);

  return { concern: updated, vote };
}
