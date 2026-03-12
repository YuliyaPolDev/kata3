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

export type LifecycleActor = {
  type: 'council' | 'system';
};

export type LifecycleEvent = {
  id: string;
  from: ConcernState;
  to: ConcernState;
  at: string;
  by: LifecycleActor;
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

export type Vote = {
  id: string;
  concernId: string;
  createdAt: string;
  weight: number;
};

export type Comment = {
  id: string;
  concernId: string;
  text: string;
  createdAt: string;
  ai?: {
    sentiment?: number;
  };
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
  mergedIntoClusterId?: string | null;
};

export type PolicyAnswer = {
  answer: string;
  sources: Array<{ docTitle: string; excerpt: string }>;
};
