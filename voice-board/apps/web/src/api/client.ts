export type ConcernCategory = 'HR' | 'Legal' | 'Benefits' | 'Process' | 'Other';
export type ConcernState =
  | 'Submitted'
  | 'Open'
  | 'UnderReview'
  | 'Escalated'
  | 'InDiscussion'
  | 'Resolved'
  | 'Declined'
  | 'Merged'
  | 'Split';

export type LifecycleEvent = {
  id: string;
  from: ConcernState;
  to: ConcernState;
  at: string;
  by: { type: 'council' | 'system' };
  note?: string;
};

export type Concern = {
  id: string;
  title: string;
  description: string;
  category: ConcernCategory;
  state: ConcernState;
  createdAt: string;
  updatedAt: string;
  voteCount: number;
  followerCount: number;
  lifecycle: LifecycleEvent[];
  mergedIntoId?: string | null;
  splitIntoIds?: string[];
  splitFromId?: string | null;
  declinedReason?: string | null;
  ai: {
    tone?: 'Calm' | 'Neutral' | 'Heated';
    urgency?: 'Low' | 'Medium' | 'High';
    sentiment?: number;
    priorityScore?: number;
    duplicateOfId?: string | null;
    similarIds?: string[];
  };
};

export type SimilarConcern = { id: string; title: string; score: number; state: ConcernState; reason?: string };
export type PolicyExcerpt = { docTitle: string; excerpt: string; score: number };
export type PrecheckResult = {
  openTopics: SimilarConcern[];
  resolvedTopics: SimilarConcern[];
  policyExcerpts: PolicyExcerpt[];
  suggestedCategory: ConcernCategory;
  suggestedAnswer?: string;
};
export type Cluster = {
  id: string;
  title: string;
  createdAt: string;
  windowDays: number;
  concernIds: string[];
  aggregatedVoteCount: number;
  themes: string[];
  state: 'Trending' | 'Merged' | 'Resolved';
};

export type Comment = { id: string; concernId: string; text: string; createdAt: string };

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

export type AgendaResult = { agenda: string | null };
export type ResolutionDraftResult = { draft: string | null };

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const role = (() => {
    try {
      const v = localStorage.getItem('voiceBoardRole');
      return v === 'council' ? 'council' : 'employee';
    } catch {
      return 'employee';
    }
  })();

  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Voice-Role': role,
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  listConcerns(): Promise<Concern[]> {
    return http('/api/concerns');
  },
  getConcern(id: string): Promise<Concern> {
    return http(`/api/concerns/${id}`);
  },
  setConcernState(id: string, state: ConcernState, note?: string): Promise<Concern> {
    return http(`/api/concerns/${id}/state`, { method: 'PATCH', body: JSON.stringify({ state, note }) });
  },
  declineConcern(id: string, reason: string): Promise<Concern> {
    return http(`/api/concerns/${id}/decline`, { method: 'POST', body: JSON.stringify({ reason }) });
  },
  mergeConcern(id: string, targetId: string, note?: string): Promise<{ source: Concern; target: Concern }> {
    return http(`/api/concerns/${id}/merge`, { method: 'POST', body: JSON.stringify({ targetId, note }) });
  },
  splitConcern(
    id: string,
    input: {
      a: { title: string; description: string; category?: ConcernCategory };
      b: { title: string; description: string; category?: ConcernCategory };
      note?: string;
    }
  ): Promise<{ original: Concern; a: Concern; b: Concern }> {
    return http(`/api/concerns/${id}/split`, { method: 'POST', body: JSON.stringify(input) });
  },
  findSimilar(title: string, description: string): Promise<SimilarConcern[]> {
    const qs = new URLSearchParams({ title, description });
    return http(`/api/concerns/similar?${qs.toString()}`);
  },
  precheck(input: { title: string; description: string }): Promise<PrecheckResult> {
    return http('/api/concerns/precheck', { method: 'POST', body: JSON.stringify(input) });
  },
  createConcern(input: { title: string; description: string; category?: ConcernCategory }): Promise<Concern> {
    return http('/api/concerns', { method: 'POST', body: JSON.stringify(input) });
  },
  upvote(id: string): Promise<{ concern: Concern }> {
    return http(`/api/concerns/${id}/votes`, { method: 'POST', body: '{}' });
  },
  listComments(id: string): Promise<Comment[]> {
    return http(`/api/concerns/${id}/comments`);
  },
  addComment(id: string, text: string): Promise<Comment> {
    return http(`/api/concerns/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
  },
  listClusters(): Promise<Cluster[]> {
    return http('/api/clusters');
  },
  askHr(question: string): Promise<{ answer: string; sources: Array<{ docTitle: string; excerpt: string }> }> {
    return http('/api/hr/ask', { method: 'POST', body: JSON.stringify({ question }) });
  },
  listActivity(queryString?: string): Promise<ActivityItem[]> {
    const suffix = queryString ? `?${queryString}` : '';
    return http(`/api/activity${suffix}`);
  },
  buildAgenda(): Promise<AgendaResult> {
    return http('/api/council/agenda', { method: 'POST', body: '{}' });
  },
  draftResolution(id: string, decisionNotes?: string): Promise<ResolutionDraftResult> {
    return http(`/api/council/concerns/${id}/resolution-draft`, {
      method: 'POST',
      body: JSON.stringify({ decisionNotes })
    });
  }
};
