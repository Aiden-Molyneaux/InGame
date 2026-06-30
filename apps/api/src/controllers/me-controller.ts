import type { Request, Response } from 'express';
import type { PatchMeRequest } from '@ingame/shared';
import { AuthFailedError, NotFoundError } from '../errors/AppError';
import * as profileService from '../services/profile-service';
import { toSelfShape } from '../serializers/user-shape';
import { getDb } from '../db/client';
import { users } from '../db/schema';

// The `/me` controllers. The actor is resolved from the authenticated principal ONLY (SYS-01) — the
// server never trusts an id in the body. Controllers read `req.validated` (the zod-parsed body), not
// raw `req.body`.

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) {
    throw new AuthFailedError();
  }
  return principal.userId;
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const actorId = actorOf(req);
  const profile = await profileService.getOwnProfile(actorId);
  if (!profile) {
    throw new NotFoundError('Profile not found.');
  }
  res.json(toSelfShape(profile)); // F06 self-shape exemplar
}

export async function patchMe(req: Request, res: Response): Promise<void> {
  const actorId = actorOf(req);
  const body = req.validated as PatchMeRequest;

  // M1 slice wires exactly ONE editable field: bio (≤140, trimmed — validated in @ingame/shared).
  // The other PATCH /me fields are present in the contract schema but their handlers are M2.
  if (body.bio !== undefined) {
    const updated = await profileService.updateBio(actorId, { bio: body.bio });
    res.json(toSelfShape(updated));
    return;
  }

  const current = await profileService.getOwnProfile(actorId);
  if (!current) {
    throw new NotFoundError('Profile not found.');
  }
  res.json(toSelfShape(current));
}

// ⚠️ G-B(b) DEMO — DELIBERATELY BAD: a raw DB query in the controller layer (CONVENTIONS rule 1).
// This compiles, so the red lands on the CI *Lint* step (the custom spine has teeth). Reverted next commit.
export async function listAllProfilesDemo() {
  return getDb().select().from(users);
}
