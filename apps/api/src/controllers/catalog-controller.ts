import type { Request, Response } from 'express';
import { catalogSearchQuerySchema, type CreateGameRequest } from '@ingame/shared';
import * as catalogService from '../services/catalog-service';

// Catalog controllers (CAT-01..05/09) — thin: resolve the actor from the verified principal,
// validate, delegate. The actor id is NEVER read from the body (SYS-01).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function getGenres(_req: Request, res: Response): Promise<void> {
  res.json(await catalogService.listGenres());
}

export async function searchCatalog(req: Request, res: Response): Promise<void> {
  const parsed = catalogSearchQuerySchema.safeParse(req.query);
  if (!parsed.success) throw parsed.error; // → 422 VALIDATION_ERROR (+ B1 details)
  res.json(await catalogService.search(actorOf(req), parsed.data.q));
}

export async function getPopular(req: Request, res: Response): Promise<void> {
  res.json(await catalogService.popular(actorOf(req)));
}

// GET /catalog/upcoming (CAT-08, M6 P7).
export async function getUpcoming(req: Request, res: Response): Promise<void> {
  res.json(await catalogService.upcoming(actorOf(req)));
}

// GET /catalog/friends-active (CAT-12, M6 P7).
export async function getFriendsActive(req: Request, res: Response): Promise<void> {
  res.json(await catalogService.friendsActive(actorOf(req)));
}

// GET /catalog/new-releases (CAT-11, M6 W-C7).
export async function getNewReleases(req: Request, res: Response): Promise<void> {
  res.json(await catalogService.newReleases(actorOf(req)));
}

// GET /catalog/games/:id (CAT-05/09/09c, M6 W-C5) — the game-detail aggregate. The friend gate +
// PROF-03/SOC-09 folding live in the service (rooted at the actor's friend set); unknown id → 404.
export async function getGameDetail(req: Request, res: Response): Promise<void> {
  res.json(await catalogService.gameDetail(actorOf(req), req.params.id ?? ''));
}

export async function createGame(req: Request, res: Response): Promise<void> {
  const item = await catalogService.createGame(actorOf(req), req.validated as CreateGameRequest);
  res.status(201).json(item);
}

// GET /catalog/games/:id/friends-who-own (CAT-09c) — the Game-page named friends-who-own list. The
// friend gate + PROF-03 hours-gating live in the service (rooted at the actor's friend set).
export async function getFriendsWhoOwn(req: Request, res: Response): Promise<void> {
  res.json(await catalogService.friendsWhoOwn(actorOf(req), req.params.id ?? ''));
}
