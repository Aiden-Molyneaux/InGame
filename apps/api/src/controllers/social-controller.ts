import type { Request, Response } from 'express';
import { z } from 'zod';
import type { BlockUserRequest, CreateFriendRequest } from '@ingame/shared';
import { AuthFailedError, NotFoundError } from '../errors/AppError';
import * as socialService from '../services/social-service';
import * as usersService from '../services/users-service';

const uuidSchema = z.string().uuid();

// The `/me/blocks` controllers (SOC-09). The actor is the authenticated principal ONLY (SYS-01); the
// target is the `userId` body field (POST) or the `:userId` path param (DELETE).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  return principal.userId;
}

export async function postBlock(req: Request, res: Response): Promise<void> {
  const body = req.validated as BlockUserRequest;
  await socialService.blockUser(actorOf(req), body.userId);
  res.json({ ok: true });
}

export async function deleteBlock(req: Request, res: Response): Promise<void> {
  const userId = req.params.userId;
  if (!userId) throw new NotFoundError('Not found.');
  await socialService.unblockUser(actorOf(req), userId);
  res.json({ ok: true });
}

// SOC-08 friend-request lifecycle (M6 §1). The actor is the authenticated principal ONLY (SYS-01); the
// target is the `toUserId` body field (POST) / the request `:id` path param (accept — scoped so only the
// addressee can accept). A malformed `:id` collapses to the generic NotFound (never a 500).

export async function postFriendRequest(req: Request, res: Response): Promise<void> {
  const body = req.validated as CreateFriendRequest;
  await socialService.createFriendRequest(actorOf(req), body.toUserId);
  res.status(201).json({ ok: true });
}

export async function acceptFriendRequest(req: Request, res: Response): Promise<void> {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) throw new NotFoundError('Request not found.'); // malformed id → same as unknown
  await socialService.acceptFriendRequest(actorOf(req), parsed.data);
  res.json({ ok: true });
}

export async function declineFriendRequest(req: Request, res: Response): Promise<void> {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) throw new NotFoundError('Request not found.');
  await socialService.declineFriendRequest(actorOf(req), parsed.data);
  res.json({ ok: true });
}

export async function cancelFriendRequest(req: Request, res: Response): Promise<void> {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) throw new NotFoundError('Request not found.');
  await socialService.cancelFriendRequest(actorOf(req), parsed.data);
  res.json({ ok: true });
}

// DELETE /me/friends/:userId — unfriend (silent to target). The `:userId` is the friend to drop.
export async function unfriend(req: Request, res: Response): Promise<void> {
  const parsed = uuidSchema.safeParse(req.params.userId);
  if (!parsed.success) throw new NotFoundError('User not found.');
  await socialService.unfriend(actorOf(req), parsed.data);
  res.json({ ok: true });
}

// GET /me/friends · /me/friends/requests · /me/blocks — the actor's OWN social-graph reads (self-scoped).
export async function getFriends(req: Request, res: Response): Promise<void> {
  res.json(await socialService.listFriends(actorOf(req)));
}

export async function getFriendRequests(req: Request, res: Response): Promise<void> {
  res.json(await socialService.listFriendRequests(actorOf(req)));
}

export async function getBlocks(req: Request, res: Response): Promise<void> {
  res.json(await socialService.listBlocks(actorOf(req)));
}

// GET /me/compare/:friendId (SOC-03) — the collection face-off. The friend gate (NOT_FRIENDS), the
// non-disclosure collapse, and the PROF-03 omission all live in the service.
export async function getCompare(req: Request, res: Response): Promise<void> {
  res.json(await usersService.getCompare(actorOf(req), req.params.friendId ?? ''));
}
