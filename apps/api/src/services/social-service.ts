import { mutation } from '../db/mutation';
import { isForeignKeyViolation } from '../db/pg-errors';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as friendRequestRepo from '../repositories/friend-request-repo';
import {
  AlreadyFriendsError,
  NotFoundError,
  RequestPendingError,
  SelfTargetError,
  ValidationError,
} from '../errors/AppError';

// Social service (SOC-09 — the block/unblock slice the M2 substrate deferred). `user_blocks` is
// USER-OWNED; every write is actor-scoped (SYS-01 — the blocker is the authenticated principal ONLY,
// never body-supplied). A block removes the blocked designer's cards from the caller's community views
// both directions (the existing gallery/adopt/trending block-filter reads); the adopter keeps any card
// they already adopted (MOD-08 "flattened card persists"). Both writes are IDEMPOTENT.

/** @mutation — POST /me/blocks (SOC-09): the actor blocks a target. Idempotent (re-block = no-op). */
const blockUserWrite = mutation(
  { name: 'social.blockUser', specIds: ['SOC-09', 'MOD-09', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, blockedId: string): Promise<void> => {
    if (blockedId === actorId) {
      // You cannot block yourself — a body-field error, not a silent no-op.
      throw new ValidationError('You cannot block yourself.', 'cannot_block_self', [
        { path: 'userId', message: 'Pick another user to block.' },
      ]);
    }
    const created = await relationshipRepo.insertBlock(actorId, blockedId, ctx.tx);
    // SOC-09 — a block SEVERS the relationship BOTH directions: drop the accepted bond + cancel any
    // pending request (either direction), in this same transaction. Idempotent (no rows ⇒ no-op).
    await relationshipRepo.deleteFriendshipBetween(actorId, blockedId, ctx.tx);
    await friendRequestRepo.cancelPendingBetween(actorId, blockedId, ctx.tx);
    if (created) {
      await ctx.emit({
        eventType: 'social.user_blocked',
        entityRef: { type: 'user', id: blockedId },
        payload: {},
      });
    }
  },
);

// ── SOC-01/08 friend-request lifecycle (M6 §1 spike — happy-path) ─────────────────────────────────────

/** @mutation — POST /friends/requests (SOC-08): the actor opens a PENDING request to `toUserId`. */
const createFriendRequestWrite = mutation(
  { name: 'social.createFriendRequest', specIds: ['SOC-01', 'SOC-08', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, toUserId: string): Promise<void> => {
    if (toUserId === actorId) throw new SelfTargetError(); // can't friend yourself (SELF_TARGET)
    // A block in either direction collapses to the generic NotFound (SOC-09 non-disclosure).
    if (await relationshipRepo.isBlockedBetween(actorId, toUserId, ctx.tx)) {
      throw new NotFoundError('User not found.');
    }
    if ((await relationshipRepo.getRelationship(actorId, toUserId, ctx.tx)) === 'friend') {
      throw new AlreadyFriendsError();
    }
    if (await friendRequestRepo.findPendingBetween(actorId, toUserId, ctx.tx)) {
      throw new RequestPendingError();
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
    // An unknown target trips the FK — collapse to the generic 404 (no existence oracle, MOD-09).
    if (isForeignKeyViolation(e)) throw new NotFoundError('User not found.');
    throw e;
  }
}

/**
 * @mutation — POST /friends/requests/:id/accept (SOC-08): the ADDRESSEE accepts a pending request. Only
 * the addressee may accept (SYS-07 — findAcceptableRequest scopes to the actor as `toUserId`); unknown /
 * not-yours / not-pending all collapse to the generic NotFound. Forms the accepted `friendships` bond.
 */
export const acceptFriendRequest = mutation(
  { name: 'social.acceptFriendRequest', specIds: ['SOC-01', 'SOC-08', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, requestId: string): Promise<void> => {
    const req = await friendRequestRepo.findAcceptableRequest(actorId, requestId, ctx.tx);
    if (!req) throw new NotFoundError('Request not found.');
    await friendRequestRepo.markAccepted(actorId, requestId, ctx.tx);
    await relationshipRepo.insertFriendship(req.fromUserId, actorId, ctx.tx);
    await ctx.emit({
      eventType: 'friend.added',
      entityRef: { type: 'user', id: req.fromUserId },
      payload: { requestId },
    });
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
