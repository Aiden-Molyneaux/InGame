import type {
  PatchMeRequest,
  CreateGamertagRequest,
  UpdateGamertagRequest,
  AvatarCompositionRequest,
  SelfProfile,
  GamertagView,
} from '@ingame/shared';
import { mutation } from '../db/mutation';
import * as profileRepo from '../repositories/profile-repo';
import type { ProfileUpdate } from '../repositories/profile-repo';
import * as gamertagRepo from '../repositories/gamertag-repo';
import * as authRepo from '../repositories/auth-repo';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { toSelfShape, toGamertagView } from '../serializers/user-shape';
import { isUsernameAllowed, screenText } from '../moderation/screen';
import { loadEnv } from '../config/env';
import type { UserRow, GamertagRow } from '../db/schema';

// Profile service (PROF-01/02/03/06/08). PATCH /me is the widened F29 exemplar (updateProfile — the
// single @mutation for the endpoint, emitting `profile.updated`). Ownership is enforced by the SYS-01
// scoped repos; each mutation emits its domain event in the same transaction via the seam.

export async function getOwnProfile(actorId: string): Promise<UserRow | null> {
  return profileRepo.getOwnProfile(actorId);
}

export async function listGamertags(userId: string): Promise<GamertagView[]> {
  const rows = await gamertagRepo.listForUser(userId);
  return rows.map(toGamertagView);
}

/** PROF-06 — the ISO timestamp when the next username change is allowed, or null ⇒ allowed now. */
export function usernameNextChangeAt(row: UserRow): string | null {
  if (!row.usernameChangedAt) return null;
  const next = row.usernameChangedAt.getTime() + loadEnv().usernameCooldownSeconds * 1000;
  return next > Date.now() ? new Date(next).toISOString() : null;
}

/** The assembled GET /me self-view (row + gamertags + PROF-06 cooldown). */
export async function getSelfView(actorId: string): Promise<SelfProfile | null> {
  const row = await profileRepo.getOwnProfile(actorId);
  if (!row) return null;
  const gamertags = await listGamertags(actorId);
  return toSelfShape(row, { gamertags, usernameNextChangeAt: usernameNextChangeAt(row) });
}

/**
 * @mutation — PATCH /me (the widened golden path). Handles username (PROF-06 cooldown + MOD-07 screen +
 * uniqueness + AUTH-09 usernamePending completion), bio, privacy, favourites — all in one tx, emitting
 * one `profile.updated` with the changed field-set. The actor is the authenticated principal ONLY.
 */
export const updateProfile = mutation(
  {
    name: 'profile.updateProfile',
    specIds: ['PROF-01', 'PROF-03', 'PROF-06', 'SYS-01', 'SYS-02', 'MOD-07', 'AUTH-09'],
  },
  async (ctx, actorId, input: PatchMeRequest): Promise<UserRow> => {
    const current = await profileRepo.getOwnProfile(actorId, ctx.tx);
    if (!current) throw new NotFoundError('Profile not found.');

    const updates: ProfileUpdate = {};
    const changed: string[] = [];

    if (input.username !== undefined && input.username !== current.username) {
      if (!isUsernameAllowed(input.username)) {
        throw new ValidationError('That username isn’t allowed.', 'username_screened');
      }
      const existing = await authRepo.findByUsername(input.username, ctx.tx);
      if (existing && existing.id !== actorId) {
        throw new ValidationError('That username is taken.', 'username_taken');
      }
      if (current.usernamePending) {
        updates.usernamePending = false; // AUTH-09 completion — NOT cooldown-limited
        changed.push('usernamePending');
      } else if (current.usernameChangedAt) {
        const next = current.usernameChangedAt.getTime() + loadEnv().usernameCooldownSeconds * 1000;
        if (next > Date.now()) {
          throw new ValidationError('You changed your username too recently.', 'username_cooldown');
        }
      }
      updates.username = input.username;
      updates.usernameChangedAt = new Date();
      changed.push('username');
    }
    if (input.bio !== undefined) {
      updates.bio = input.bio;
      changed.push('bio');
    }
    if (input.privacy !== undefined) {
      updates.privacy = input.privacy;
      changed.push('privacy');
    }
    if (input.favouriteGameId !== undefined) {
      updates.favouriteGameId = input.favouriteGameId;
      changed.push('favouriteGameId');
    }
    if (input.favouriteGenreIds !== undefined) {
      updates.favouriteGenreIds = input.favouriteGenreIds;
      changed.push('favouriteGenreIds');
    }

    if (changed.length === 0) return current; // present-but-unchanged → a no-op (no emit)

    const updated = await profileRepo.updateOwnProfile(actorId, updates, ctx.tx);
    if (!updated) throw new NotFoundError('Profile not found.');
    await ctx.emit({
      eventType: 'profile.updated',
      entityRef: { type: 'user', id: actorId },
      payload: { fields: changed }, // payload minimization (F18) — the changed field-set, not the row
    });
    return updated;
  },
);

// ── PROF-02 gamertag CRUD ─────────────────────────────────────────────────────────────────────────
export const addGamertag = mutation(
  { name: 'gamertag.add', specIds: ['PROF-02', 'SYS-01', 'MOD-07'] },
  async (ctx, actorId, input: CreateGamertagRequest): Promise<GamertagRow> => {
    if (!screenText(input.handle)) throw new ValidationError('That handle isn’t allowed.');
    const existing = await gamertagRepo.listForUser(actorId, ctx.tx);
    if (existing.some((g) => g.platform === input.platform)) {
      throw new ValidationError('You already have a handle for that platform.', 'platform_taken');
    }
    const row = await gamertagRepo.insertForUser(actorId, input, ctx.tx);
    await ctx.emit({
      eventType: 'gamertag.added',
      entityRef: { type: 'gamertag', id: row.id },
      payload: { platform: row.platform },
    });
    return row;
  },
);

export const updateGamertag = mutation(
  { name: 'gamertag.update', specIds: ['PROF-02', 'SYS-01', 'MOD-07'] },
  async (ctx, actorId, id: string, input: UpdateGamertagRequest): Promise<GamertagRow> => {
    if (input.handle !== undefined && !screenText(input.handle)) {
      throw new ValidationError('That handle isn’t allowed.');
    }
    const current = await gamertagRepo.findOwned(actorId, id, ctx.tx);
    if (!current) throw new NotFoundError('Gamertag not found.');
    if (input.platform && input.platform !== current.platform) {
      const existing = await gamertagRepo.listForUser(actorId, ctx.tx);
      if (existing.some((g) => g.platform === input.platform && g.id !== id)) {
        throw new ValidationError('You already have a handle for that platform.', 'platform_taken');
      }
    }
    const fields: { platform?: string; handle?: string } = {};
    if (input.platform !== undefined) fields.platform = input.platform;
    if (input.handle !== undefined) fields.handle = input.handle;
    if (Object.keys(fields).length === 0) return current;

    const updated = await gamertagRepo.updateOwned(actorId, id, fields, ctx.tx);
    if (!updated) throw new NotFoundError('Gamertag not found.');
    await ctx.emit({
      eventType: 'gamertag.updated',
      entityRef: { type: 'gamertag', id },
      payload: {},
    });
    return updated;
  },
);

export const removeGamertag = mutation(
  { name: 'gamertag.remove', specIds: ['PROF-02', 'SYS-01'] },
  async (ctx, actorId, id: string): Promise<void> => {
    const removed = await gamertagRepo.deleteOwned(actorId, id, ctx.tx);
    if (!removed) throw new NotFoundError('Gamertag not found.');
    await ctx.emit({
      eventType: 'gamertag.removed',
      entityRef: { type: 'gamertag', id },
      payload: {},
    });
  },
);

// ── PROF-08 avatar draft/publish (SHAPE-STUBS — the skia flatten pipeline is M4) ───────────────────
export const saveAvatarDraft = mutation(
  { name: 'avatar.draft', specIds: ['PROF-08', 'SYS-01'] },
  async (ctx, actorId, _input: AvatarCompositionRequest): Promise<void> => {
    void _input; // opaque composition — the real editor/pipeline is M4 (CARD-15); emit the seam only
    await ctx.emit({
      eventType: 'avatar.draft_saved',
      entityRef: { type: 'user', id: actorId },
      payload: {},
    });
  },
);

export const publishAvatar = mutation(
  { name: 'avatar.publish', specIds: ['PROF-08', 'SYS-01'] },
  async (ctx, actorId, _input: AvatarCompositionRequest): Promise<void> => {
    void _input;
    await ctx.emit({
      eventType: 'avatar.published',
      entityRef: { type: 'user', id: actorId },
      payload: {},
    });
  },
);
