import type { CreateInviteResponse, ResolveInviteResponse } from '@ingame/shared';
import { inviteTokenParamSchema } from '@ingame/shared';
import { mutation } from '../db/mutation';
import { acquireActorLock } from '../db/locks';
import { generateOpaqueToken, hashOpaqueToken } from '../auth/tokens';
import { inviteExpiresAt, inviteMaxActiveCount } from '../config/social';
import { loadEnv } from '../config/env';
import * as inviteTokenRepo from '../repositories/invite-token-repo';
import * as profileRepo from '../repositories/profile-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as suspensionRepo from '../repositories/suspension-repo';
import { InviteExpiredError, InviteInvalidError } from '../errors/AppError';

// SOC-10 invite service (M6 P3; decision 0076 §0.6). Two surfaces:
//   • POST /me/invites — mint a bearer token (server-random ≥32B, base64url) whose HASH is stored; TTL
//     7 days; cap ≤5 ACTIVE per user with create-new-invalidates-oldest; `invites:create` 5/day.
//   • GET /invites/:token — resolve on the AUTH-LOOKUP read class (bearer/token-scoped, never session-
//     authed). Multi-redemption within TTL (the resolve is a READ — a token is never consumed).
// The token is NEVER a JWT: an unguessable random secret IS the signature (the reset-token pattern), so
// possession of the exact token is the only proof, verified by the stored-hash match.

/**
 * @mutation — POST /me/invites (SOC-10). Mints one invite token, enforces the active cap
 * (create-new-invalidates-oldest), and emits `invite.created`. A per-actor advisory lock serializes
 * concurrent mints so parallel creates can't overshoot the cap (F36) — the same pattern as the
 * style-preset cap-30. Returns the plaintext token ONCE (only its hash persists) + the shareable URL +
 * the TTL expiry. The event payload carries the invite ID ONLY — never the token/hash (a bearer
 * credential stays out of the event spine, F18).
 */
export const createInvite = mutation(
  { name: 'invite.create', specIds: ['SOC-10', 'SYS-01', 'SYS-05'] },
  async (ctx, actorId): Promise<CreateInviteResponse> => {
    // Serialize per-actor mints so two parallel creates at cap can't both keep their new row (F36).
    await acquireActorLock(ctx.tx, 'invite_tokens', actorId);
    const now = new Date();
    const { token, tokenHash } = generateOpaqueToken(32);
    const expiresAt = inviteExpiresAt(now);
    const row = await inviteTokenRepo.insertInviteToken({ userId: actorId, tokenHash, expiresAt }, ctx.tx);

    // CREATE-NEW-INVALIDATES-OLDEST: after inserting, keep only the newest `cap` ACTIVE tokens — revoke
    // the surplus OLDEST. Under the advisory lock the active set is stable, so this converges to exactly
    // `cap` even under parallel mints.
    const active = await inviteTokenRepo.listActiveOldestFirst(actorId, now, ctx.tx); // oldest → newest
    const surplus = active.length - inviteMaxActiveCount();
    for (let i = 0; i < surplus; i++) {
      await inviteTokenRepo.revokeById(actorId, active[i]!.id, now, ctx.tx);
    }

    await ctx.emit({
      eventType: 'invite.created',
      entityRef: { type: 'invite', id: row.id },
      payload: { inviteId: row.id },
    });

    return {
      token,
      url: `${loadEnv().inviteLinkBase}/${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  },
);

/**
 * GET /invites/:token (SOC-10) — resolve an invite on the AUTH-LOOKUP read class. `viewerId` is the
 * authenticated principal if the caller happens to carry a valid session, else `null` (the resolve does
 * NOT require auth — a fresh install may open the link). NON-DISCLOSURE by construction:
 *   - malformed / unknown / revoked token → INVITE_INVALID (all indistinguishable — no presence oracle)
 *   - expired token → INVITE_EXPIRED (safe to distinguish: a stranger cannot forge a real-but-expired one)
 *   - a gone/suspended sender → INVITE_INVALID (the sender's state never leaks through the invite)
 *   - an AUTHENTICATED viewer blocked-either-direction with the sender → INVITE_INVALID (the block is
 *     never revealed, MOD-09); an UNAUTHENTICATED resolve carries relationship 'none'.
 * The relationship is resolver↔sender so an already-friend/pending link lands the right action (not a
 * duplicate ADD); `prefilledRequest.toUserId` is the sender (redemption = the normal POST /friends/
 * requests, where P1's cooldown/blocked/already rules apply). The resolve is a READ — never consumed.
 */
export async function resolveInvite(
  viewerId: string | null,
  rawToken: string,
): Promise<ResolveInviteResponse> {
  // Defensive param guard BEFORE hashing — a value that can't be a real token is treated as unknown.
  const parsed = inviteTokenParamSchema.safeParse(rawToken);
  if (!parsed.success) throw new InviteInvalidError();
  const token = parsed.data;

  const row = await inviteTokenRepo.findByHash(hashOpaqueToken(token));
  if (!row || row.revokedAt) throw new InviteInvalidError(); // never-existed ≡ revoked (no oracle)
  if (row.expiresAt.getTime() <= Date.now()) throw new InviteExpiredError();

  const sender = await profileRepo.getOwnProfile(row.userId); // scope-to-owner read of the sender row
  if (!sender || sender.deletedAt) throw new InviteInvalidError(); // sender gone → collapse (AUTH-07)
  if (await suspensionRepo.getActiveSuspension(sender.id)) throw new InviteInvalidError(); // MOD-09

  // An AUTHENTICATED viewer blocked either direction with the sender → the invite is dead to them, and
  // the block is NEVER revealed (collapses to the same INVITE_INVALID as a bad token).
  if (viewerId && (await relationshipRepo.isBlockedBetween(viewerId, sender.id))) {
    throw new InviteInvalidError();
  }
  const relationship = viewerId
    ? await relationshipRepo.getRelationship(viewerId, sender.id)
    : 'none';

  return {
    token,
    sender: {
      userId: sender.id,
      username: sender.username,
      avatarUrl: sender.avatarUrl,
      avatarConfig: sender.avatarConfig, // PROF-08 (W-4) — public-safe; the resolver may be a stranger
    },
    relationship,
    prefilledRequest: { toUserId: sender.id },
  };
}
