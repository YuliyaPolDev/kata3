import type { RequestHandler } from 'express';

export type VoiceRole = 'employee' | 'council';

export function parseVoiceRole(value: unknown): VoiceRole {
  const v = String(value ?? '').toLowerCase();
  return v === 'council' ? 'council' : 'employee';
}

export const roleMiddleware: RequestHandler = (req, res, next) => {
  const role = parseVoiceRole(req.header('x-voice-role'));
  res.locals.voiceRole = role;
  next();
};

export function requireCouncil(role: VoiceRole): void {
  if (role !== 'council') {
    const err = new Error('Forbidden');
    (err as any).status = 403;
    throw err;
  }
}
