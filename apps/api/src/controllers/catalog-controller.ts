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

export async function createGame(req: Request, res: Response): Promise<void> {
  const item = await catalogService.createGame(actorOf(req), req.validated as CreateGameRequest);
  res.status(201).json(item);
}
