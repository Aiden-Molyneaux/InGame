import type { Request, Response } from 'express';
import { z } from 'zod';
import type { CreateRecommendationRequest } from '@ingame/shared';
import { AuthFailedError, NotFoundError } from '../errors/AppError';
import * as recommendationService from '../services/recommendation-service';
import * as feedService from '../services/feed-service';

// SOC-05 recommendation + SOC-06 feed controllers (M6 P4). The actor is the authenticated principal ONLY
// (SYS-01); the recommendation TARGET (`toUserId`) + `gameId` are body fields (validated by the request
// schema), and the dismiss `:recId` is a path param (validated defensively → generic 404 on malformed).

const uuidSchema = z.string().uuid();

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  return principal.userId;
}

/** POST /recommendations — recommend a game to a friend (SOC-05). */
export async function postRecommendation(req: Request, res: Response): Promise<void> {
  const body = req.validated as CreateRecommendationRequest;
  await recommendationService.createRecommendation(actorOf(req), {
    toUserId: body.toUserId,
    gameId: body.gameId,
    note: body.note,
  });
  res.status(201).json({ ok: true });
}

/** GET /me/recommendations — the recipient's rec inbox (Discover FROM-FRIENDS section). Self-scoped. */
export async function getRecommendations(req: Request, res: Response): Promise<void> {
  res.json(await recommendationService.getRecommendations(actorOf(req)));
}

/** DELETE /me/recommendations/:recId — soft-dismiss one inbox rec. A malformed id → generic 404. */
export async function deleteRecommendation(req: Request, res: Response): Promise<void> {
  const parsed = uuidSchema.safeParse(req.params.recId);
  if (!parsed.success) throw new NotFoundError('Recommendation not found.');
  await recommendationService.dismissRecommendation(actorOf(req), parsed.data);
  res.json({ ok: true });
}

/** GET /me/feed — the aggregated friend-activity feed (SOC-06). Self-scoped; `?cursor=` is opaque. */
export async function getFeed(req: Request, res: Response): Promise<void> {
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  res.json(await feedService.getFeed(actorOf(req), cursor));
}
