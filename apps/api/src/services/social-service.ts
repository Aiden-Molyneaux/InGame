import { mutation } from '../db/mutation';
import { isForeignKeyViolation } from '../db/pg-errors';
import * as relationshipRepo from '../repositories/relationship-repo';
import { NotFoundError, ValidationError } from '../errors/AppError';

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
