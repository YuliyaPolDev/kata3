export type ConcernCategory = 'HR' | 'Legal' | 'Benefits' | 'Process' | 'Other';
export type ConcernState = 'Open' | 'InDiscussion' | 'Planned' | 'Resolved';

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
  ai: {
    tone?: 'Calm' | 'Neutral' | 'Heated';
    urgency?: 'Low' | 'Medium' | 'High';
    sentiment?: number;
    priorityScore?: number;
    duplicateOfId?: string | null;
    similarIds?: string[];
  };
};

export type SimilarConcern = { id: string; title: string; score: number; state: ConcernState };
export type PolicyExcerpt = { docTitle: string; excerpt: string; score: number };
export type PrecheckResult = {
  openTopics: SimilarConcern[];
  resolvedTopics: SimilarConcern[];
  policyExcerpts: PolicyExcerpt[];
  suggestedCategory: ConcernCategory;
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
  setConcernState(id: string, state: ConcernState): Promise<Concern> {
    return http(`/api/concerns/${id}/state`, { method: 'PATCH', body: JSON.stringify({ state }) });
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
  }
};
