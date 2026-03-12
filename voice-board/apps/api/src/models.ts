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
