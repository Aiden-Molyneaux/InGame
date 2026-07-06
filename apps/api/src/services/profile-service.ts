import type {
  PatchMeRequest,
  CreateGamertagRequest,
  UpdateGamertagRequest,
  AvatarCompositionRequest,
  SelfProfile,
  GamertagView,
} from '@ingame/shared';
import type { SelfGameExpansion, SelfStats } from '@ingame/shared';
import { mutation } from '../db/mutation';
import type { Executor } from '../db/client';
import * as profileRepo from '../repositories/profile-repo';
import type { ProfileUpdate } from '../repositories/profile-repo';
import * as gamertagRepo from '../repositories/gamertag-repo';
import * as authRepo from '../repositories/auth-repo';
import * as collectionRepo from '../repositories/collection-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import { isUniqueViolation } from '../db/pg-errors';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as cardRepo from '../repositories/card-repo';
import { toCardRider } from './card-service';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { toSelfShape, toGamertagView } from '../serializers/user-shape';
import type { CollectionEntryRow } from '../db/schema';
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

/** PROF-04 stats derived from the real shelf; completionPct per decision 0058. */
function statsOf(entries: CollectionEntryRow[], friends: number, cardsDesigned: number): SelfStats {
  const nonWishlist = entries.filter((e) => e.status !== 'wishlist');
  const done = nonWishlist.filter((e) => e.status === 'beaten' || e.status === 'completed');
  return {
    games: entries.length,
    hours: entries.reduce((sum, e) => sum + e.hours, 0),
    completionPct:
      nonWishlist.length === 0 ? 0 : Math.round((100 * done.length) / nonWishlist.length),
    cardsDesigned, // REAL as of M4 (card_designs, decision 0066) — finished designs, not drafts
    adoptionsReceived: 0, // honest zero — adoptions are M5
    friends,
  };
}

/**
 * The ONE self-shape assembler (OQ-121 / decision 0056): `GET /me` AND the auth issuance path
 * (register/login/apple) both emit this, so the session `user` can never drift from the `/me`
 * self-shape (gamertags + the M3 stats/expansions inlined on both).
 * The executor passes THROUGH to the repos (which own the getDb() default) — rule-1 layering.
 */
export async function assembleSelfShape(row: UserRow, exec?: Executor): Promise<SelfProfile> {
  // Sequential on purpose: `exec` may be an open TRANSACTION (one pg client — parallel queries on
  // it are deprecated); these are three cheap indexed reads.
  const gamertagRows = exec
    ? await gamertagRepo.listForUser(row.id, exec)
    : await gamertagRepo.listForUser(row.id);
  const entries = exec
    ? await collectionRepo.listOwnedEntries(row.id, exec)
    : await collectionRepo.listOwnedEntries(row.id);
  const friends = exec
    ? await relationshipRepo.countFriends(row.id, exec)
    : await relationshipRepo.countFriends(row.id);
  const cardsDesigned = exec
    ? await cardRepo.countOwnedDesigns(row.id, exec)
    : await cardRepo.countOwnedDesigns(row.id);

  // The expanded favouriteGame / nowPlaying pins (M3 — the P2 PINNED FAVOURITE unblock, WTP-03).
  // M4 (0066): the pin's card rider resolves the entry's EQUIPPED design (CARD-07/18).
  const expand = async (gameId: string | null): Promise<SelfGameExpansion | null> => {
    if (!gameId) return null;
    const [game] = exec
      ? await catalogRepo.gamesByIds([gameId], exec)
      : await catalogRepo.gamesByIds([gameId]);
    if (!game) return null; // soft-deleted from the catalog → honest null
    const entry = entries.find((e) => e.gameId === gameId);
    const design = entry?.activeCardDesignId
      ? exec
        ? await cardRepo.findOwnedDesign(row.id, entry.activeCardDesignId, exec)
        : await cardRepo.findOwnedDesign(row.id, entry.activeCardDesignId)
      : null;
    return {
      gameId,
      ...(entry ? { entryId: entry.id } : {}),
      title: game.name,
      hours: entry?.hours ?? 0,
      card: toCardRider(design),
    };
  };

  return toSelfShape(row, {
    gamertags: gamertagRows.map(toGamertagView),
    usernameNextChangeAt: usernameNextChangeAt(row),
    stats: statsOf(entries, friends, cardsDesigned),
    favouriteGame: await expand(row.favouriteGameId),
    nowPlaying: await expand(row.nowPlayingGameId),
  });
}

/** The assembled GET /me self-view (row + gamertags + PROF-06 cooldown). */
export async function getSelfView(actorId: string): Promise<SelfProfile | null> {
  const row = await profileRepo.getOwnProfile(actorId);
  if (!row) return null;
  return assembleSelfShape(row);
}

/**
 * @mutation — PATCH /me (the widened golden path). Handles username (PROF-06 cooldown + MOD-07 screen +
 * uniqueness + AUTH-09 usernamePending completion), bio, privacy, favourites — all in one tx, emitting
 * one `profile.updated` with the changed field-set. The actor is the authenticated principal ONLY.
 */
const updateProfileMutation = mutation(
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
        throw new ValidationError('That username isn’t allowed.', 'username_screened', [
          { path: 'username', message: 'That username isn’t allowed.' },
        ]);
      }
      const existing = await authRepo.findByUsername(input.username, ctx.tx);
      if (existing && existing.id !== actorId) {
        throw new ValidationError('That username is taken.', 'username_taken', [
          { path: 'username', message: 'That username is taken.' },
        ]);
      }
      if (current.usernamePending) {
        updates.usernamePending = false; // AUTH-09 completion — NOT cooldown-limited
        changed.push('usernamePending');
      } else if (current.usernameChangedAt) {
        const next = current.usernameChangedAt.getTime() + loadEnv().usernameCooldownSeconds * 1000;
        if (next > Date.now()) {
          throw new ValidationError('You changed your username too recently.', 'username_cooldown', [
            { path: 'username', message: 'You changed your username too recently.' },
          ]);
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
      // M3 — the catalog exists now: the favourite must be a live entry (backs the users FK).
      if (input.favouriteGameId !== null) {
        const [game] = await catalogRepo.gamesByIds([input.favouriteGameId], ctx.tx);
        if (!game) {
          throw new ValidationError('That game is not in the catalog.', 'unknown_game', [
            { path: 'favouriteGameId', message: 'That game is not in the catalog.' },
          ]);
        }
      }
      updates.favouriteGameId = input.favouriteGameId;
      changed.push('favouriteGameId');
    }
    if (input.favouriteGenreIds !== undefined) {
      // M3 — CAT-04: favourite genres validate against the controlled list.
      const unique = [...new Set(input.favouriteGenreIds)];
      const known = await catalogRepo.genresByIds(unique, ctx.tx);
      if (known.length !== unique.length) {
        throw new ValidationError('Unknown genre.', 'unknown_genre', [
          { path: 'favouriteGenreIds', message: 'Contains a genre that is not on the controlled list.' },
        ]);
      }
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

// PROF-06 — a concurrent username-change race (the DB unique index catches what the in-tx pre-check
// missed) maps to the friendly username_taken 422, not a raw 500 (mirrors register / the F36 siblings).
export async function updateProfile(actorId: string, input: PatchMeRequest): Promise<UserRow> {
  try {
    return await updateProfileMutation(actorId, input);
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new ValidationError('That username is taken.', 'username_taken', [
        { path: 'username', message: 'That username is taken.' },
      ]);
    }
    throw e;
  }
}

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
