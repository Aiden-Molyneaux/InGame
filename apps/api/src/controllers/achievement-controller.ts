import type { Request, Response } from 'express';
import { AuthFailedError } from '../errors/AppError';
import * as achievementService from '../services/achievement-service';

// GET /achievements — the visible definitions (secret-masked for the caller). The VIEWER is the
// authenticated principal (the mask depends on WHO asks — their own unlocked secrets show full).
export async function getDefinitions(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  res.json({ achievements: await achievementService.getDefinitions(principal.userId) });
}

// GET /me/achievements — the caller's own trophy-case state (self-view only).
export async function getMyAchievements(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  res.json(await achievementService.getMyAchievements(principal.userId));
}

// GET /users/:id/achievements — a user's earned SHOWCASE. The friend gate + non-disclosure collapse
// live in the service (the VIEWER is the principal; the target is the path id).
export async function getUserAchievements(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  res.json(await achievementService.getUserAchievements(principal.userId, req.params.id ?? ''));
}
