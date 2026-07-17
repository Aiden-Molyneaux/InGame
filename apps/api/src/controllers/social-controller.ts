import type { Request, Response } from 'express';
import type { BlockUserRequest } from '@ingame/shared';
import { AuthFailedError, NotFoundError } from '../errors/AppError';
import * as socialService from '../services/social-service';

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
