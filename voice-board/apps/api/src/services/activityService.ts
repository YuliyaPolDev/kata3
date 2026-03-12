import type { Concern, ConcernCategory, ConcernState, LifecycleEvent } from '../models';

import { listConcerns } from './concernService';

export type ActivityItem = {
  id: string;
  concernId: string;
  concernTitle: string;
  category: ConcernCategory;
  from: ConcernState;
  to: ConcernState;
  at: string;
  by: { type: 'council' | 'system' };
  note?: string;
};

function toItems(concern: Concern): ActivityItem[] {
  const events: LifecycleEvent[] = Array.isArray(concern.lifecycle) ? concern.lifecycle : [];
  return events.map((e) => ({
    id: e.id,
    concernId: concern.id,
    concernTitle: concern.title,
    category: concern.category,
    from: e.from,
    to: e.to,
    at: e.at,
    by: e.by,
    note: e.note
  }));
}

export async function listActivity(filter?: {
  category?: ConcernCategory;
  toState?: ConcernState;
  fromDate?: string;
  toDate?: string;
}): Promise<ActivityItem[]> {
  const concerns = await listConcerns();
  let items = concerns.flatMap((c) => toItems(c));

  if (filter?.category) items = items.filter((i) => i.category === filter.category);
  if (filter?.toState) items = items.filter((i) => i.to === filter.toState);

  if (filter?.fromDate) {
    const start = new Date(filter.fromDate).getTime();
    if (!Number.isNaN(start)) items = items.filter((i) => new Date(i.at).getTime() >= start);
  }
  if (filter?.toDate) {
    const end = new Date(filter.toDate).getTime();
    if (!Number.isNaN(end)) items = items.filter((i) => new Date(i.at).getTime() <= end);
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items;
}
