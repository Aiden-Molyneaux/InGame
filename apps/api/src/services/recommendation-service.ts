import type { RecommendationCard, RecommendationsResponse } from '@ingame/shared';
import { mutation } from '../db/mutation';
import type { Executor } from '../db/client';
import * as recommendationRepo from '../repositories/recommendation-repo';
import * as profileRepo from '../repositories/profile-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as suspensionRepo from '../repositories/suspension-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as cardRepo from '../repositories/card-repo';
import { NotFoundError, NotFriendsError, SelfTargetError, ValidationError } from '../errors/AppError';

// SOC-05 recommendations (M6 P4). Recommend a game to a FRIEND — it lands in the recipient's rec inbox
// (GET /me/recommendations, the Discover FROM-FRIENDS section), NOT auto-queued (contract 0.21). Adding
// it to Up Next is the SEPARATE P5 queue-add (`POST /me/queue { source:'friend_rec', fromRecId }`) — this
// packet only makes the rec side CARRY what that add will need (the recId → note/sender). The note is
// UNSCREENED at M6 (MOD-07 → M7 — accepted for the trusted beta, recorded).

const DEFAULT_CARD: RecommendationCard = { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false };

/**
 * The MOD-09 non-disclosure collapse used before the friend gate: a blocked-either-direction / suspended
 * / deleted / unknown target ALL resolve to the SAME generic NotFound — so NOT_FRIENDS is emitted ONLY for
 * a KNOWN, VISIBLE non-friend and never becomes a presence/block oracle (mirrors users-service's
 * resolveVisibleTarget; the target id is a validated uuid from the zod body).
 */
async function assertVisibleTarget(actorId: string, targetId: string, exec: Executor): Promise<void> {
  const target = await profileRepo.getOwnProfile(targetId, exec);
  if (!target || target.deletedAt) throw new NotFoundError('User not found.'); // unknown / AUTH-07
  if (await relationshipRepo.isBlockedBetween(actorId, targetId, exec)) {
    throw new NotFoundError('User not found.'); // SOC-09 (either direction)
  }
  if (await suspensionRepo.getActiveSuspension(targetId, exec)) {
    throw new NotFoundError('User not found.'); // MOD-09
  }
}

/**
 * @mutation — POST /recommendations (SOC-05). Friend-only. Refusals in disclosure-safe order: SELF_TARGET
 * (409, self is knowable) → the MOD-09 collapse (blocked/suspended/deleted/unknown → generic 404) →
 * NOT_FRIENDS (409, a KNOWN visible non-friend) → unknown game (422). Lands in the feed/inbox (NOT
 * auto-queued); emits `recommendation.sent`. A duplicate LIVE rec (same from,to,game not yet dismissed) is
 * an idempotent no-op (P4 design #1) — it still emitted once when first sent, so the second POST returns
 * success without a second event.
 */
export const createRecommendation = mutation(
  { name: 'recommendations.create', specIds: ['SOC-05', 'SOC-09', 'MOD-09', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, input: { toUserId: string; gameId: string; note?: string }): Promise<void> => {
    if (input.toUserId === actorId) throw new SelfTargetError(); // cannot recommend to yourself
    await assertVisibleTarget(actorId, input.toUserId, ctx.tx);
    if ((await relationshipRepo.getRelationship(actorId, input.toUserId, ctx.tx)) !== 'friend') {
      throw new NotFriendsError('You can only recommend a game to a friend.');
    }
    const [game] = await catalogRepo.gamesByIds([input.gameId], ctx.tx);
    if (!game) {
      throw new ValidationError('That game is not in the catalog.', 'unknown_game', [
        { path: 'gameId', message: 'That game is not in the catalog.' },
      ]);
    }
    const row = await recommendationRepo.insertRecommendation(
      actorId,
      input.toUserId,
      input.gameId,
      input.note ?? null,
      ctx.tx,
    );
    // A live-duplicate no-op (row === null) does NOT re-emit — the first send already fed it (F18/rule-5:
    // the happy path emits; the idempotent path returns early, matching the block/adopt idempotency posture).
    if (row) {
      await ctx.emit({
        eventType: 'recommendation.sent',
        entityRef: { type: 'recommendation', id: row.id },
        payload: { toUserId: input.toUserId, gameId: input.gameId }, // ids only — the note stays out (F18/MOD-07)
      });
    }
  },
);

/**
 * GET /me/recommendations (SOC-05) — the recipient's LIVE inbox (the Discover FROM-FRIENDS section).
 * Blocked-either-direction senders are EXCLUDED (SOC-09): a block severs the friendship, but a historical
 * rec row persists, so the read filters blocked senders here (the repo read is recipient-scoped; the
 * block set is the actor's). Each item resolves the game title + a flattened representative card peek
 * (CARD-07/18 — a card always resolves; never composition). Newest first.
 */
export async function getRecommendations(actorId: string): Promise<RecommendationsResponse> {
  const inbox = await recommendationRepo.listInbox(actorId);
  if (inbox.length === 0) return { recommendations: [] };

  const senderIds = [...new Set(inbox.map((r) => r.fromUserId))];
  const blocked = await relationshipRepo.listBlockedIds(actorId, senderIds);
  const visible = inbox.filter((r) => !blocked.has(r.fromUserId)); // SOC-09 mutual invisibility
  if (visible.length === 0) return { recommendations: [] };

  const gameIds = [...new Set(visible.map((r) => r.gameId))];
  const [games, repCards] = await Promise.all([
    catalogRepo.gamesByIds(gameIds),
    cardRepo.representativeCardsByGames(gameIds),
  ]);
  const gameById = new Map(games.map((g) => [g.id, g]));

  const recommendations = visible.map((r) => {
    const game = gameById.get(r.gameId);
    const rep = repCards.get(r.gameId);
    const card: RecommendationCard = rep
      ? { id: rep.id, imageUrl: rep.imageUrl, thumbUrl: rep.thumbUrl, isCustom: true }
      : DEFAULT_CARD;
    return {
      recId: r.recId,
      game: { id: r.gameId, title: game?.name ?? '', card },
      fromUser: { userId: r.fromUserId, username: r.fromUsername },
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    };
  });
  return { recommendations };
}

/**
 * @mutation — DELETE /me/recommendations/:recId (SOC-05). SOFT-dismiss the recipient's own inbox row.
 * A rec that isn't the actor's (or is already dismissed / unknown) → generic 404 (no cross-inbox oracle).
 */
export const dismissRecommendation = mutation(
  { name: 'recommendations.dismiss', specIds: ['SOC-05', 'SYS-01', 'SYS-07'] },
  async (ctx, actorId, recId: string): Promise<void> => {
    const dismissed = await recommendationRepo.dismiss(actorId, recId, ctx.tx);
    if (!dismissed) throw new NotFoundError('Recommendation not found.');
    await ctx.emit({
      eventType: 'recommendation.dismissed',
      entityRef: { type: 'recommendation', id: recId },
      payload: {},
    });
  },
);
