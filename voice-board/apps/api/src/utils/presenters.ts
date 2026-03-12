import type { Concern } from '../models';
import type { VoiceRole } from './role';

export function presentConcernForRole(concern: Concern, role: VoiceRole): Concern {
  if (role === 'council') return concern;

  return {
    ...concern,
    ai: {
      ...concern.ai,
      // Not visible to employees in MVP
      tone: undefined,
      urgency: undefined,
      sentiment: undefined,
      priorityScore: undefined
    }
  };
}
