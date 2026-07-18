import type { Request, Response } from 'express';
import { AuthFailedError } from '../errors/AppError';
import * as usersService from '../services/users-service';

// GET /users/:id controller. The VIEWER is the authenticated principal (SYS-01); the target is the
// path id. The F06 serializer + the non-disclosure collapse live in the service.
export async function getUser(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  const shape = await usersService.getUserProfile(principal.userId, req.params.id ?? '');
  res.json(shape);
}

// GET /users/:id/contributions (CAT-07). The VIEWER is the authenticated principal; the privacy shape
// + the non-disclosure collapse live in the service.
export async function getContributions(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  const shape = await usersService.getContributions(principal.userId, req.params.id ?? '');
  res.json(shape);
}

// GET /users/:id/collection (COL-10/11) — the friend-view shelf. The friend gate + non-disclosure
// collapse + the F06 friend-visible allowlist all live in the service.
export async function getUserCollection(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  const shape = await usersService.getFriendCollection(principal.userId, req.params.id ?? '');
  res.json(shape);
}

// GET /users/:id/contributions/cards?cursor= (CAT-07 VIEW ALL cards) — friend-only, cursor-paginated.
export async function getContributionsCards(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const shape = await usersService.getContributionsCards(principal.userId, req.params.id ?? '', cursor);
  res.json(shape);
}

// GET /users/:id/contributions/games?cursor= (CAT-07 VIEW ALL games) — friend-only, cursor-paginated.
export async function getContributionsGames(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const shape = await usersService.getContributionsGames(principal.userId, req.params.id ?? '', cursor);
  res.json(shape);
}

// GET /users/search?username= (SOC-07; C1 owner-walk amendment) — FUZZY (prefix+substring) people search.
// The VIEWER is the authenticated principal (SYS-01; unauth → 401). The self-exclusion, the
// block/suspended/deleted invisibility, and the relationship (incl. the SOC-08 cooldown) all live in the
// service; a malformed/too-short query → an empty result.
export async function getUserSearch(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  const shape = await usersService.searchUsers(principal.userId, req.query.username);
  res.json(shape);
}
