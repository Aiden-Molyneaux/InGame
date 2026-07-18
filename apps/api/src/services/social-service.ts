import type { Executor } from '../db/client';
import { mutation } from '../db/mutation';
import { acquireActorLock } from '../db/locks';
import { isForeignKeyViolation, isUniqueViolation } from '../db/pg-errors';
import { requestCooldownUntil } from '../config/social';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as friendRequestRepo from '../repositories/friend-request-repo';
import * as friendReadRepo from '../repositories/friend-read-repo';
import * as profileRepo from '../repositories/profile-repo';
import * as suspensionRepo from '../repositories/suspension-repo';
import type {
  BlocksListResponse,
  FriendRequestsResponse,
  FriendsListResponse,
} from '@ingame/shared';
import {
  AlreadyFriendsError,
  NotFoundError,
  RequestCooldownError,
  RequestPendingError,
  SelfTargetError,
  ValidationError,
} from '../errors/AppError';

// Social service (SOC-01/08/09). `friendships`/`friend_requests`/`user_blocks` are USER-OWNED; every
// write is actor-scoped (the actor is the authenticated principal ONLY, never body-supplied). The
// friend-request lifecycle is the SOC-08 state machine: pending → accepted (bond) | declined (silent +
// cooldown) | cancelled (silent). A block SEVERS the relationship both directions (SOC-09).
//
// F36 — THE CANONICAL-PAIR ADVISORY LOCK (§4 audit HIGH finding): every mutation that can create or
// destroy the pair's bond (block · accept · create-with-auto-accept · unfriend) first takes a pg
// advisory XACT lock on the CANONICAL pair key (lexicographic LEAST:GREATEST of the two user ids), so
// those transactions SERIALIZE per pair. Without it, an accept-tx's uncommitted bond was invisible to
// a concurrent block-tx's severance delete under READ COMMITTED — leaving a live friendship BEHIND a
// block (the blocked party kept seeing the blocker through every friendScoped surface). The lock
// releases at commit/rollback automatically (locks.ts).

/** The canonical (direction-agnostic) pair lock key — same key whichever party acts. */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * MOD-09 non-disclosure collapse for a TARGET account: unknown / soft-deleted (AUTH-07) / actively
 * suspended all throw the SAME generic NotFound a stranger's probe gets — a social write must not be a
 * suspension/deletion oracle where GET /users/:id already collapses (§4 audit MED/LOW findings; the
 * recommendation-service assertVisibleTarget pattern). The block check stays separate (create-request
 * includes it; block itself must stay idempotent against an already-blocked target).
 */
async function assertTargetAccount(targetId: string, exec: Executor): Promise<void> {
  const target = await profileRepo.getOwnProfile(targetId, exec);
  if (!target || target.deletedAt) throw new NotFoundError('User not found.'); // unknown / AUTH-07
  if (await suspensionRepo.getActiveSuspension(targetId, exec)) {
    throw new NotFoundError('User not found.'); // MOD-09
  }
}

// ── SOC-09 block/unblock ──────────────────────────────────────────────────────────────────────────

/** @mutation — POST /me/blocks (SOC-09): the actor blocks a target. Idempotent (re-block = no-op). */
const blockUserWrite = mutation(
  { name: 'social.blockUser', specIds: ['SOC-09', 'MOD-09', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, blockedId: string): Promise<void> => {
    if (blockedId === actorId) {
      throw new ValidationError('You cannot block yourself.', 'cannot_block_self', [
        { path: 'userId', message: 'Pick another user to block.' },
      ]);
    }
    // F36 (§4 audit HIGH) — serialize against a concurrent accept/create/unfriend on this pair, so the
    // severance below can never miss an uncommitted bond.
    await acquireActorLock(ctx.tx, 'social:pair', pairKey(actorId, blockedId));
    // §4 audit LOW — the MOD-09 collapse applies to block too: blocking a suspended/deleted target 404s
    // exactly like an unknown id (non-disclosure). TENSION, deliberately resolved this way: a user who
    // wants to block someone who then got suspended now gets a 404 instead of a working block — but the
    // target is already invisible everywhere (the /users/:id collapse), so nothing needs blocking, and
    // disclosing "this account exists but is suspended" is the worse trade (MOD-09 wins the edge).
    await assertTargetAccount(blockedId, ctx.tx);
    const created = await relationshipRepo.insertBlock(actorId, blockedId, ctx.tx);
    // SOC-09 — a block SEVERS the relationship BOTH directions: cancel any pending request + drop the
    // accepted bond (either direction), in this same transaction. Idempotent (no rows ⇒ no-op).
    // ORDER (audit belt+braces): the pending-cancel runs BEFORE the bond-delete — in the audited
    // interleaving the cancel's row-lock wait on an in-flight accept lets the accept commit first, so
    // the subsequent delete then SEES the committed bond (the pair lock above already prevents the
    // race outright; this ordering alone was proven to fix the specific interleaving).
    await friendRequestRepo.cancelPendingBetween(actorId, blockedId, ctx.tx);
    await relationshipRepo.deleteFriendshipBetween(actorId, blockedId, ctx.tx);
    if (created) {
      await ctx.emit({
        eventType: 'social.user_blocked',
        entityRef: { type: 'user', id: blockedId },
        payload: {},
      });
    }
  },
);

export async function blockUser(actorId: string, blockedId: string): Promise<void> {
  try {
    await blockUserWrite(actorId, blockedId);
  } catch (e) {
    // An unknown target id trips the FK — collapse to the generic 404 (no existence oracle, MOD-09).
    if (isForeignKeyViolation(e)) throw new NotFoundError('User not found.');
    throw e;
  }
}

/** @mutation — DELETE /me/blocks/:userId (SOC-09): the actor unblocks a target. Idempotent. */
export const unblockUser = mutation(
  { name: 'social.unblockUser', specIds: ['SOC-09', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, blockedId: string): Promise<void> => {
    const removed = await relationshipRepo.deleteBlock(actorId, blockedId, ctx.tx);
    if (removed) {
      await ctx.emit({
        eventType: 'social.user_unblocked',
        entityRef: { type: 'user', id: blockedId },
        payload: {},
      });
    }
  },
);

// ── SOC-01/08 friend-request lifecycle ──────────────────────────────────────────────────────────────

/**
 * @mutation — POST /friends/requests (SOC-08). Opens a PENDING request, or, when the target ALREADY has
 * a pending request TO the actor, AUTO-ACCEPTS it (both asked ⇒ both agreed — one friendship, no
 * deadlock). Refusals: SELF_TARGET · a block either direction → generic NotFound (MOD-09) ·
 * ALREADY_FRIENDS · REQUEST_COOLDOWN{cooldownUntil} (SYS-04 re-request window after a decline) ·
 * REQUEST_PENDING (the actor already has an outgoing pending to the target). The partial-unique
 * pending-pair index is the F36 backstop the outer function's retry resolves.
 */
const createFriendRequestWrite = mutation(
  { name: 'social.createFriendRequest', specIds: ['SOC-01', 'SOC-08', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, toUserId: string): Promise<void> => {
    if (toUserId === actorId) throw new SelfTargetError();
    // F36 (§4 audit HIGH) — the auto-accept path below creates a bond, so this tx serializes on the
    // canonical pair key against a concurrent block/accept/unfriend.
    await acquireActorLock(ctx.tx, 'social:pair', pairKey(actorId, toUserId));
    if (await relationshipRepo.isBlockedBetween(actorId, toUserId, ctx.tx)) {
      throw new NotFoundError('User not found.'); // SOC-09 non-disclosure (either direction)
    }
    // §4 audit MED — a suspended/deleted/unknown target collapses to the SAME generic 404 GET /users/:id
    // returns; a 201 here was a MOD-09 suspension/deletion oracle (and left a pending row on a tombstone).
    await assertTargetAccount(toUserId, ctx.tx);
    if ((await relationshipRepo.getRelationship(actorId, toUserId, ctx.tx)) === 'friend') {
      throw new AlreadyFriendsError();
    }
    const cooldownUntil = await friendRequestRepo.cooldownUntilFor(
      actorId,
      toUserId,
      new Date(),
      ctx.tx,
    );
    if (cooldownUntil) throw new RequestCooldownError(cooldownUntil.toISOString());

    const pending = await friendRequestRepo.findPendingBetween(actorId, toUserId, ctx.tx);
    if (pending) {
      if (pending.fromUserId === actorId) throw new RequestPendingError(); // own outgoing already open
      // MUTUAL-PENDING AUTO-ACCEPT: the target already requested the actor → accept their request (the
      // actor is its addressee). One friendship row; the far side gets `friend.added` with both ids.
      await friendRequestRepo.acceptPendingReturning(actorId, pending.id, ctx.tx);
      await relationshipRepo.insertFriendship(pending.fromUserId, actorId, ctx.tx);
      await ctx.emit(friendAddedEvent(pending.fromUserId, actorId, pending.id));
      return;
    }
    const req = await friendRequestRepo.insertRequest(actorId, toUserId, ctx.tx);
    await ctx.emit({
      eventType: 'friend.request_created',
      entityRef: { type: 'friend_request', id: req.id },
      payload: { toUserId },
    });
  },
);

export async function createFriendRequest(actorId: string, toUserId: string): Promise<void> {
  try {
    await createFriendRequestWrite(actorId, toUserId);
  } catch (e) {
    if (isForeignKeyViolation(e)) throw new NotFoundError('User not found.'); // unknown target (MOD-09)
    // F36: a CONCURRENT create (the pending-pair or canonical-bond unique index fired) rolled this tx
    // back. The competitor's row is now committed, so a single retry is deterministic: a same-direction
    // race resolves to REQUEST_PENDING; a reverse-direction race resolves to the mutual auto-accept;
    // an already-formed reciprocal bond resolves to ALREADY_FRIENDS. One retry only (no loop).
    if (isUniqueViolation(e)) {
      await createFriendRequestWrite(actorId, toUserId);
      return;
    }
    throw e;
  }
}

/**
 * The `friend.added` DUAL-CREDIT envelope (decision 0076 §0.7): both party ids explicit so an
 * actor-scoped consumer (P4 feed · P6 achievements) credits BOTH parties from the single accept event —
 * neither side "adds" in isolation. Used by the explicit accept endpoint and the mutual auto-accept path.
 */
function friendAddedEvent(requesterId: string, addresseeId: string, requestId: string) {
  return {
    eventType: 'friend.added' as const,
    entityRef: { type: 'user', id: requesterId },
    payload: { requesterId, addresseeId, requestId },
  };
}

/**
 * @mutation — POST /friends/requests/:id/accept (SOC-08). Only the ADDRESSEE may accept (the atomic
 * `acceptPendingReturning` scopes to `toUserId` = actor AND `status = 'pending'`). Unknown / not-yours /
 * already-terminal all collapse to the generic NotFound.
 */
const acceptFriendRequestWrite = mutation(
  { name: 'social.acceptFriendRequest', specIds: ['SOC-01', 'SOC-08', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, requestId: string): Promise<void> => {
    // Pre-look (read-only) to learn the pair → take the canonical-pair lock (§4 audit HIGH: a bond
    // insert must never interleave with a block-tx's severance) → then the ATOMIC accept re-verifies
    // pending-ness under the lock (a block that got the lock first cancelled the request → 404 here).
    const look = await friendRequestRepo.findAcceptableRequest(actorId, requestId, ctx.tx);
    if (!look) throw new NotFoundError('Request not found.');
    await acquireActorLock(ctx.tx, 'social:pair', pairKey(actorId, look.fromUserId));
    const req = await friendRequestRepo.acceptPendingReturning(actorId, requestId, ctx.tx);
    if (!req) throw new NotFoundError('Request not found.'); // win-once under a concurrent block/decline/cancel
    await relationshipRepo.insertFriendship(req.fromUserId, actorId, ctx.tx);
    await ctx.emit(friendAddedEvent(req.fromUserId, actorId, requestId));
  },
);

export async function acceptFriendRequest(actorId: string, requestId: string): Promise<void> {
  try {
    await acceptFriendRequestWrite(actorId, requestId);
  } catch (e) {
    // F36: a reciprocal accept already formed the bond (the canonical one-bond index fired). The bond
    // exists and this request's intent is satisfied — treat as an idempotent success (already friends).
    if (isUniqueViolation(e)) return;
    throw e;
  }
}

/**
 * @mutation — POST /friends/requests/:id/decline (SOC-08). SILENT (no event to the requester's face); the
 * atomic decline stamps the SYS-04 cooldown so a re-request is throttled. Only the ADDRESSEE may decline;
 * unknown / not-yours / already-terminal collapse to the generic NotFound.
 */
export const declineFriendRequest = mutation(
  { name: 'social.declineFriendRequest', specIds: ['SOC-08', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, requestId: string): Promise<void> => {
    const req = await friendRequestRepo.declinePendingReturning(
      actorId,
      requestId,
      requestCooldownUntil(),
      ctx.tx,
    );
    if (!req) throw new NotFoundError('Request not found.');
    await ctx.emit({
      eventType: 'friend.request_declined',
      entityRef: { type: 'friend_request', id: requestId },
      payload: { fromUserId: req.fromUserId },
    });
  },
);

/**
 * @mutation — DELETE /friends/requests/:id (SOC-08). Cancel an OUTGOING request (only the requester, via
 * `cancelOutgoingReturning` scoping to `fromUserId` = actor). COOLDOWN-EXEMPT (OQ-147, owner-ruled
 * 2026-07-17 → decision 0078): a voluntary cancel does NOT stamp the SYS-04 re-request cooldown — only a
 * DECLINE cools down (an accidental cancel must not lock the sender out; the friends:request rate bucket
 * still throttles re-request spam). This reverts the P1 conformance stamp; the SOC-08 spec text moves
 * from "decline/cancel" to "decline only" (orchestrator-owned edit). Unknown / not-yours /
 * already-terminal collapse to the generic NotFound.
 */
export const cancelFriendRequest = mutation(
  { name: 'social.cancelFriendRequest', specIds: ['SOC-08', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, requestId: string): Promise<void> => {
    const req = await friendRequestRepo.cancelOutgoingReturning(actorId, requestId, ctx.tx);
    if (!req) throw new NotFoundError('Request not found.');
    await ctx.emit({
      eventType: 'friend.request_cancelled',
      entityRef: { type: 'friend_request', id: requestId },
      payload: { toUserId: req.toUserId },
    });
  },
);

/**
 * @mutation — DELETE /me/friends/:userId (SOC-08, decision 0010). Unfriend — SILENT to the target. The
 * bond is hard-deleted (see relationship-repo's blessing: an interpersonal edge, no attribution to
 * preserve). Idempotent: a no-op unfriend (not friends) collapses to NotFound so it isn't a presence
 * oracle, matching the block/decline collapse posture.
 */
export const unfriend = mutation(
  { name: 'social.unfriend', specIds: ['SOC-08', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, otherId: string): Promise<void> => {
    // F36 (§4 audit HIGH) — bond destruction serializes on the canonical pair key like block/accept.
    await acquireActorLock(ctx.tx, 'social:pair', pairKey(actorId, otherId));
    const removed = await relationshipRepo.deleteFriendshipBetween(actorId, otherId, ctx.tx);
    if (!removed) throw new NotFoundError('User not found.'); // not friends → the generic collapse
    await ctx.emit({
      eventType: 'friend.removed',
      entityRef: { type: 'user', id: otherId },
      payload: { otherId },
    });
  },
);

// ── SOC-01/08/09 reads (the actor's OWN social graph — self-scoped) ─────────────────────────────────

/** GET /me/friends (SOC-01) — the actor's accepted-friends roster (public summaries, relationship='friend'). */
export async function listFriends(actorId: string): Promise<FriendsListResponse> {
  const friends = await friendReadRepo.listFriendSummaries(actorId);
  return {
    friends: friends.map((f) => ({ ...f, relationship: 'friend' as const })),
  };
}

/** GET /me/friends/requests (SOC-08) — the actor's pending requests split incoming/outgoing. */
export async function listFriendRequests(actorId: string): Promise<FriendRequestsResponse> {
  const [incoming, outgoing] = await Promise.all([
    friendRequestRepo.listIncomingPending(actorId),
    friendRequestRepo.listOutgoingPending(actorId),
  ]);
  return {
    incoming: incoming.map((r) => ({
      requestId: r.requestId,
      person: {
        userId: r.userId,
        username: r.username,
        avatarUrl: r.avatarUrl,
        relationship: 'incoming' as const,
      },
      createdAt: r.createdAt.toISOString(),
    })),
    outgoing: outgoing.map((r) => ({
      requestId: r.requestId,
      person: {
        userId: r.userId,
        username: r.username,
        avatarUrl: r.avatarUrl,
        relationship: 'outgoing' as const,
      },
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** GET /me/blocks (SOC-09) — the Settings blocked-list (the MOD-09 lone-exception affordance). */
export async function listBlocks(actorId: string): Promise<BlocksListResponse> {
  const blocks = await relationshipRepo.listBlockedSummaries(actorId);
  return {
    blocks: blocks.map((b) => ({
      userId: b.userId,
      username: b.username,
      avatarUrl: b.avatarUrl,
      blockedAt: b.blockedAt.toISOString(),
    })),
  };
}
