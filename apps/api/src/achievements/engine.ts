import type { AchievementCriterion, AchievementReward } from '@ingame/shared';
import { withTransaction } from '../db/tx';
import { emitOnCommit } from '../events/emitOnCommit';
import { registerPostCommitHook, type EmittedEvent } from '../events/post-commit';
import { logger } from '../observability/logger';
import * as achievementRepo from '../repositories/achievement-repo';
import * as entitlementRepo from '../repositories/entitlement-repo';
import { credit } from '../services/economy/ledger-service';
import { computeProgress, evaluateEvent, targetOf, triggerEventsOf } from './criteria';
import type { AchievementDefinitionRow } from '../db/schema';

// The achievements trigger engine (M6 P6, ACH-02/04). Invoked POST-COMMIT from the @mutation seam (via
// the post-commit hook) with the events a mutation emitted. It:
//   1. loads the ACTIVE definitions (bounded content — ~18 at beta; a fresh read per pass, no cache — a
//      new seed = a redeploy, so process-lifetime staleness never matters at cohort scale),
//   2. for each event, evaluates the defs whose trigger types match (data-driven criteria),
//   3. UNLOCKS each newly-met (user, def) exactly once, granting the reward in the SAME transaction.
//
// NO unlock ever fires at seed/migration time: the migration + seed emit NO domain events, so this
// evaluator is never invoked for them — unlocks fire ONLY on LIVE emitted events (a test proves it).

/** Coerce the stored jsonb criterion/reward to their typed shapes (trusted seed content). */
const criterionOf = (def: AchievementDefinitionRow): AchievementCriterion =>
  def.criterion as unknown as AchievementCriterion;
const rewardOf = (def: AchievementDefinitionRow): AchievementReward =>
  def.reward as unknown as AchievementReward;

/**
 * Evaluate a batch of just-committed events against the active definitions. Best-effort per (event, def,
 * user) — a failure in one unlock is logged and does not abort the others (the mutation already
 * committed; a missed unlock self-heals on the next event for the count criteria).
 */
export async function evaluateEmittedEvents(events: EmittedEvent[]): Promise<void> {
  if (events.length === 0) return;
  const defs = await achievementRepo.listActiveDefinitions();
  if (defs.length === 0) return;

  // A per-pass cache of each user's already-unlocked def ids (avoids a redundant unlock tx once earned).
  const unlockedCache = new Map<string, Set<string>>();
  const alreadyUnlocked = async (userId: string, achievementId: string): Promise<boolean> => {
    let set = unlockedCache.get(userId);
    if (!set) {
      set = await achievementRepo.unlockedAchievementIds(userId);
      unlockedCache.set(userId, set);
    }
    return set.has(achievementId);
  };

  for (const event of events) {
    for (const def of defs) {
      const criterion = criterionOf(def);
      if (!triggerEventsOf(criterion).includes(event.eventType)) continue;
      let candidates;
      try {
        candidates = await evaluateEvent(event, criterion);
      } catch (err) {
        logger.error({ err, defKey: def.key, eventType: event.eventType }, 'achievement evaluation failed');
        continue;
      }
      for (const candidate of candidates) {
        if (await alreadyUnlocked(candidate.userId, def.id)) continue;
        try {
          const unlocked = await unlock(def, candidate.userId, candidate.snapshot);
          if (unlocked) unlockedCache.get(candidate.userId)?.add(def.id);
        } catch (err) {
          // Reward atomicity: the whole unlock tx rolled back (no badge, no PX, no entitlement) — F36.
          logger.error({ err, defKey: def.key, userId: candidate.userId }, 'achievement unlock+reward tx failed (rolled back)');
        }
      }
    }
  }
}

/**
 * Idempotently unlock `def` for `userId` and grant its reward — ALL IN ONE TRANSACTION (ACH-04). The
 * unique(user, achievement) index + `ON CONFLICT DO NOTHING` mean the reward is granted ONLY when THIS
 * call created the unlock row (F36: a replay / a parallel threshold-cross yields one row, one reward).
 * If any reward step throws, the tx rolls back — no badge, no PX, no entitlement (all-or-nothing).
 * Returns true iff a new unlock was created.
 */
async function unlock(
  def: AchievementDefinitionRow,
  userId: string,
  snapshot: { current: number; target: number } | null,
): Promise<boolean> {
  return withTransaction(async (tx) => {
    const row = await achievementRepo.insertUnlock(tx, userId, def.id, snapshot);
    if (!row) return false; // already unlocked / lost the race — no reward, no emit.

    const reward = rewardOf(def);
    if (reward.pixels && reward.pixels > 0) {
      // ECON-05 milestone half — the `milestone` ledger reason (exists since M5); refType/refId ties the
      // credit to the achievement (never period-stamped, so it never inflates the Newcomer Ladder).
      await credit(tx, userId, {
        amount: reward.pixels,
        reason: 'milestone',
        refType: 'achievement',
        refId: def.id,
      });
    }
    if (reward.cosmetic?.assetId) {
      // ACH-04 earn-only entitlement (`source:'earned'` — never store-purchasable). A def with NO
      // cosmetic (e.g. A14's empty slot) simply skips this — the no-op the config-empty slot relies on.
      await entitlementRepo.insertEntitlement(tx, userId, {
        cosmeticId: reward.cosmetic.assetId,
        source: 'earned',
      });
    }

    // ACH-06 — the unlock event feeds the P4 activity feed (actor = the credited user). Payload carries
    // key/tier/kind/label so the feed renders WITHOUT a definitions join (F18 — a public achievement
    // name; `kind` lets the feed MASK a secret's label so an egg isn't spoiled in friends' feeds, OQ-148).
    await emitOnCommit(tx, {
      eventType: 'achievement.unlocked',
      actorId: userId,
      entityRef: { type: 'achievement', id: def.id },
      payload: { key: def.key, tier: def.tier, kind: def.kind, label: def.name },
    });
    return true;
  });
}

// ── Reconcile-on-read (decision 0078 — the OQ-151 REVERSAL, owner walk 2026-07-17) ──────────────────
// The post-commit evaluator is AT-MOST-ONCE: an API restart between a mutation's commit and its
// evaluation DROPS the pass (it happened live — the owner's publishes landed during fix-round restarts
// and unlocked nothing), and count-from-genesis leaves pre-engine history satisfied-but-unfired
// ("FIRST PRINT 3/1" reads as BRICKED). "Self-heals on the next event" proved too weak in practice, so
// the trophy-case READ is the healing point: GET /me/achievements reconciles the CALLER's COUNT-family
// criteria against history before serving.
//
// KINDS BOUNDARY: only the count family reconciles (event_count · event_count_distinct ·
// received_count · aggregate_reach · participant_count) — their criteria are stateless functions of
// history, so "satisfied now" is well-defined at any read. The MATCH / WINDOW / DUAL kinds stay
// live-event-only: a moment-in-time egg (the B6 03:00 claim, the B7 target add, B8's rec-then-add)
// asserts a condition AT its trigger instant — there is no meaningful "is it satisfied now?" to ask at
// read time (window_count additionally scopes to the trigger event's UTC day, which a later read can't
// reconstruct honestly). A dropped match-kind evaluation remains the accepted at-most-once gap.
//
// SEEDS/DEPLOYS STILL NEVER UNLOCK: nothing here runs at migration/seed time — only a USER's OWN read
// triggers their reconcile (bounded per-user work, beta-scale; the no-unlock-at-seed test stands).

const RECONCILABLE_KINDS = new Set([
  'event_count',
  'event_count_distinct',
  'received_count',
  'aggregate_reach',
  'participant_count',
]);

/**
 * Idempotently unlock every ACTIVE count-family definition the user has ALREADY satisfied, through the
 * SAME atomic path the live evaluator uses (badge + PX + entitlement + the achievement.unlocked event,
 * one tx per unlock — rule-05 emissions ride the shared `unlock`). Safe under F36 (two parallel reads
 * race into the unique(userId, achievementId) index → one row, one reward) and safe to call on every
 * read (already-unlocked defs short-circuit). Returns the newly-unlocked keys (observability/tests).
 */
export async function reconcileUserAchievements(userId: string): Promise<string[]> {
  const defs = await achievementRepo.listActiveDefinitions();
  if (defs.length === 0) return [];
  const unlocked = await achievementRepo.unlockedAchievementIds(userId);
  const newlyUnlocked: string[] = [];
  for (const def of defs) {
    if (unlocked.has(def.id)) continue;
    const criterion = criterionOf(def);
    if (!RECONCILABLE_KINDS.has(criterion.kind)) continue; // match/window/dual — live-event-only
    const target = targetOf(criterion);
    if (target === null) continue;
    try {
      const current = await computeProgress(userId, criterion);
      if (current < target) continue;
      const created = await unlock(def, userId, { current, target });
      if (created) newlyUnlocked.push(def.key);
    } catch (err) {
      // Best-effort per def — a failed reconcile never fails the read; the next read retries it.
      logger.error({ err, defKey: def.key, userId }, 'achievement reconcile-on-read failed (retries next read)');
    }
  }
  return newlyUnlocked;
}

/** Wire the engine into the post-commit seam (called by the app factory + the dev entrypoint). */
export function wireAchievementsEngine(): void {
  registerPostCommitHook(evaluateEmittedEvents);
}
