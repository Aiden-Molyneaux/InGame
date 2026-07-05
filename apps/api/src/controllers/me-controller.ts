import type { Request, Response } from 'express';
import type {
  PatchMeRequest,
  CreateGamertagRequest,
  UpdateGamertagRequest,
  AvatarCompositionRequest,
} from '@ingame/shared';
import { AuthFailedError, NotFoundError } from '../errors/AppError';
import * as profileService from '../services/profile-service';
import { toGamertagView } from '../serializers/user-shape';

// The `/me` controllers. The actor is resolved from the authenticated principal ONLY (SYS-01) — the
// server never trusts an id in the body. Controllers read `req.validated` (the zod-parsed body).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  return principal.userId;
}

function idParam(req: Request): string {
  const id = req.params.id;
  if (!id) throw new NotFoundError('Not found.');
  return id;
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const view = await profileService.getSelfView(actorOf(req));
  if (!view) throw new NotFoundError('Profile not found.');
  res.json(view); // F06 self-shape (GET /me exemplar)
}

export async function patchMe(req: Request, res: Response): Promise<void> {
  const actorId = actorOf(req);
  const body = req.validated as PatchMeRequest;
  const hasChange =
    body.username !== undefined ||
    body.bio !== undefined ||
    body.privacy !== undefined ||
    body.favouriteGameId !== undefined ||
    body.favouriteGenreIds !== undefined;
  if (hasChange) await profileService.updateProfile(actorId, body);
  const view = await profileService.getSelfView(actorId);
  if (!view) throw new NotFoundError('Profile not found.');
  res.json(view);
}

export async function getGamertags(req: Request, res: Response): Promise<void> {
  const items = await profileService.listGamertags(actorOf(req));
  res.json({ items });
}

export async function createGamertag(req: Request, res: Response): Promise<void> {
  const row = await profileService.addGamertag(actorOf(req), req.validated as CreateGamertagRequest);
  res.status(201).json(toGamertagView(row));
}

export async function patchGamertag(req: Request, res: Response): Promise<void> {
  const row = await profileService.updateGamertag(
    actorOf(req),
    idParam(req),
    req.validated as UpdateGamertagRequest,
  );
  res.json(toGamertagView(row));
}

export async function deleteGamertag(req: Request, res: Response): Promise<void> {
  await profileService.removeGamertag(actorOf(req), idParam(req));
  res.json({ ok: true });
}

export async function saveAvatarDraft(req: Request, res: Response): Promise<void> {
  await profileService.saveAvatarDraft(actorOf(req), req.validated as AvatarCompositionRequest);
  res.json({ ok: true });
}

export async function publishAvatar(req: Request, res: Response): Promise<void> {
  await profileService.publishAvatar(actorOf(req), req.validated as AvatarCompositionRequest);
  res.json({ ok: true });
}
