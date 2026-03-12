import { nanoid } from 'nanoid';

import type { Concern, ConcernCategory, ConcernState, LifecycleActor, LifecycleEvent, Vote } from '../models';
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

function normalizeState(state: unknown): ConcernState {
  const s = String(state ?? 'Open');
  // Back-compat migration
  if (s === 'Planned') return 'UnderReview';

  const allowed: ConcernState[] = [
    'Submitted',
    'Open',
    'UnderReview',
    'Escalated',
    'InDiscussion',
    'Resolved',
    'Declined',
    'Merged',
    'Split'
  ];
  return allowed.includes(s as ConcernState) ? (s as ConcernState) : 'Open';
}

function toLifecycleEvent(input: {
  from: ConcernState;
  to: ConcernState;
  by: LifecycleActor;
  note?: string;
  at?: string;
}): LifecycleEvent {
  return {
    id: nanoid(),
    from: input.from,
    to: input.to,
    by: input.by,
    note: input.note,
    at: input.at ?? new Date().toISOString()
  };
}

function normalizeConcern(raw: Concern): Concern {
  const normalizedState = normalizeState(raw.state);
  const lifecycle: LifecycleEvent[] = Array.isArray((raw as any).lifecycle) ? ((raw as any).lifecycle as LifecycleEvent[]) : [];

  const normalized: Concern = {
    ...raw,
    state: normalizedState,
    lifecycle,
    mergedIntoId: (raw as any).mergedIntoId ?? null,
    splitIntoIds: (raw as any).splitIntoIds ?? undefined,
    splitFromId: (raw as any).splitFromId ?? null,
    declinedReason: (raw as any).declinedReason ?? null,
    ai: raw.ai ?? { duplicateOfId: null, similarIds: [] }
  };

  if (normalized.lifecycle.length === 0) {
    normalized.lifecycle = [
      toLifecycleEvent({
        from: 'Submitted',
        to: normalized.state,
        by: { type: 'system' },
        note: 'Imported existing topic',
        at: normalized.createdAt
      })
    ];
  }

  return normalized;
}

export async function listConcerns(): Promise<Concern[]> {
  const concerns = await readJsonFile<Concern[]>(dbPaths.concerns, []);
  return concerns.map((c) => normalizeConcern(c));
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
    lifecycle: [
      toLifecycleEvent({
        from: 'Submitted',
        to: 'Open',
        by: { type: 'system' },
        note: 'Auto-opened for voting',
        at: now
      })
    ],
    mergedIntoId: null,
    splitFromId: null,
    declinedReason: null,
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

export async function setConcernState(input: {
  id: string;
  to: ConcernState;
  by: LifecycleActor;
  note?: string;
}): Promise<Concern | null> {
  const concerns = await listConcerns();
  const idx = concerns.findIndex((c) => c.id === input.id);
  if (idx === -1) return null;

  const from = concerns[idx].state;
  const now = new Date().toISOString();

  const updated: Concern = {
    ...concerns[idx],
    state: input.to,
    updatedAt: now,
    lifecycle: [
      toLifecycleEvent({ from, to: input.to, by: input.by, note: input.note, at: now }),
      ...(concerns[idx].lifecycle ?? [])
    ]
  };

  updated.ai.priorityScore = computePriorityScore(updated);

  concerns[idx] = updated;
  await writeJsonFile(dbPaths.concerns, concerns);
  return updated;
}

export async function declineConcern(input: { id: string; by: LifecycleActor; reason: string }): Promise<Concern | null> {
  const updated = await setConcernState({ id: input.id, to: 'Declined', by: input.by, note: input.reason });
  if (!updated) return null;

  const concerns = await listConcerns();
  const idx = concerns.findIndex((c) => c.id === input.id);
  if (idx === -1) return updated;

  const withReason: Concern = { ...concerns[idx], declinedReason: input.reason };
  concerns[idx] = withReason;
  await writeJsonFile(dbPaths.concerns, concerns);
  return withReason;
}

export async function mergeConcerns(input: {
  sourceId: string;
  targetId: string;
  by: LifecycleActor;
  note?: string;
}): Promise<{ source: Concern; target: Concern } | null> {
  if (input.sourceId === input.targetId) return null;

  const concerns = await listConcerns();
  const sourceIdx = concerns.findIndex((c) => c.id === input.sourceId);
  const targetIdx = concerns.findIndex((c) => c.id === input.targetId);
  if (sourceIdx === -1 || targetIdx === -1) return null;

  const source = concerns[sourceIdx];
  const target = concerns[targetIdx];

  const votes = await readJsonFile<Vote[]>(dbPaths.votes, []);
  const sourceVotes = votes.filter((v) => v.concernId === source.id);
  const movedVoteCount = sourceVotes.length;
  for (const v of votes) {
    if (v.concernId === source.id) v.concernId = target.id;
  }

  const now = new Date().toISOString();
  const updatedTarget: Concern = {
    ...target,
    voteCount: target.voteCount + source.voteCount,
    updatedAt: now
  };
  updatedTarget.ai.priorityScore = computePriorityScore(updatedTarget);

  const updatedSource: Concern = {
    ...source,
    state: 'Merged',
    mergedIntoId: target.id,
    voteCount: 0,
    updatedAt: now,
    lifecycle: [
      toLifecycleEvent({
        from: source.state,
        to: 'Merged',
        by: input.by,
        at: now,
        note:
          (input.note ? `${input.note}\n` : '') +
          `Merged into "${target.title}" (${target.id}). Moved ${movedVoteCount} vote record(s).`
      }),
      ...(source.lifecycle ?? [])
    ]
  };
  updatedSource.ai.priorityScore = computePriorityScore(updatedSource);

  concerns[sourceIdx] = updatedSource;
  concerns[targetIdx] = updatedTarget;

  await writeJsonFile(dbPaths.votes, votes);
  await writeJsonFile(dbPaths.concerns, concerns);

  return { source: updatedSource, target: updatedTarget };
}

export async function splitConcern(input: {
  id: string;
  a: { title: string; description: string; category?: ConcernCategory };
  b: { title: string; description: string; category?: ConcernCategory };
  by: LifecycleActor;
  note?: string;
}): Promise<{ original: Concern; a: Concern; b: Concern } | null> {
  const concerns = await listConcerns();
  const idx = concerns.findIndex((c) => c.id === input.id);
  if (idx === -1) return null;

  const original = concerns[idx];
  const now = new Date().toISOString();

  const newA: Concern = {
    id: nanoid(),
    title: input.a.title,
    description: input.a.description,
    category: input.a.category ?? original.category,
    state: 'Open',
    createdAt: now,
    updatedAt: now,
    voteCount: 0,
    followerCount: 0,
    lifecycle: [
      toLifecycleEvent({ from: 'Submitted', to: 'Open', by: { type: 'system' }, at: now, note: `Created from split of ${original.id}` })
    ],
    mergedIntoId: null,
    splitFromId: original.id,
    declinedReason: null,
    ai: {
      duplicateOfId: null,
      similarIds: []
    }
  };

  const newB: Concern = {
    id: nanoid(),
    title: input.b.title,
    description: input.b.description,
    category: input.b.category ?? original.category,
    state: 'Open',
    createdAt: now,
    updatedAt: now,
    voteCount: 0,
    followerCount: 0,
    lifecycle: [
      toLifecycleEvent({ from: 'Submitted', to: 'Open', by: { type: 'system' }, at: now, note: `Created from split of ${original.id}` })
    ],
    mergedIntoId: null,
    splitFromId: original.id,
    declinedReason: null,
    ai: {
      duplicateOfId: null,
      similarIds: []
    }
  };

  const votes = await readJsonFile<Vote[]>(dbPaths.votes, []);
  const originalVotes = votes.filter((v) => v.concernId === original.id);
  const half = Math.floor(originalVotes.length / 2);
  const aVoteIds = new Set(originalVotes.slice(0, half).map((v) => v.id));

  let aCount = 0;
  let bCount = 0;
  for (const v of votes) {
    if (v.concernId !== original.id) continue;
    if (aVoteIds.has(v.id)) {
      v.concernId = newA.id;
      aCount += 1;
    } else {
      v.concernId = newB.id;
      bCount += 1;
    }
  }

  newA.voteCount = aCount;
  newB.voteCount = bCount;
  newA.ai.priorityScore = computePriorityScore(newA);
  newB.ai.priorityScore = computePriorityScore(newB);

  const updatedOriginal: Concern = {
    ...original,
    state: 'Split',
    voteCount: 0,
    splitIntoIds: [newA.id, newB.id],
    updatedAt: now,
    lifecycle: [
      toLifecycleEvent({
        from: original.state,
        to: 'Split',
        by: input.by,
        at: now,
        note:
          (input.note ? `${input.note}\n` : '') +
          `Split into ${newA.id} and ${newB.id}. Redistributed ${originalVotes.length} vote record(s) (${aCount}/${bCount}).`
      }),
      ...(original.lifecycle ?? [])
    ]
  };
  updatedOriginal.ai.priorityScore = computePriorityScore(updatedOriginal);

  concerns[idx] = updatedOriginal;
  concerns.unshift(newB);
  concerns.unshift(newA);

  await writeJsonFile(dbPaths.votes, votes);
  await writeJsonFile(dbPaths.concerns, concerns);

  return { original: updatedOriginal, a: newA, b: newB };
}
