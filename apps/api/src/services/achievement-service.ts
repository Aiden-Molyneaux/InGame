import { z } from 'zod';
import type {
  AchievementCriterion,
  AchievementDef,
  AchievementDefView,
  AchievementReward,
  AchievementTier,
  AchievementKind,
  EarnedAchievement,
  InProgressAchievement,
  MeAchievementsResponse,
  ShowcaseAchievement,
  UserAchievementsResponse,
} from '@ingame/shared';
import * as achievementRepo from '../repositories/achievement-repo';
import * as profileRepo from '../repositories/profile-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as suspensionRepo from '../repositories/suspension-repo';
import { NotFoundError } from '../errors/AppError';
import { computeProgress, targetOf, unitOf } from '../achievements/criteria';
import type { AchievementDefinitionRow, UserAchievementRow } from '../db/schema';

// The achievements READ surface (M6 P6 — api-contract §Achievements 0.36). Three privacy-aware reads:
//   - GET /achievements        — the active DEFINITIONS; a caller-unlocked secret shows full, an unearned
//                                secret is MASKED to the `???` slot (OQ-005 pole A).
//   - GET /me/achievements     — the caller's own state (summary + earned/inProgress/secrets), in-progress
//                                bars computed LIVE from the same counters the engine uses.
//   - GET /users/:id/achievements — a friend's SHOWCASE (earned-only, no secret-existence leak); a
//                                non-friend gets the honest headline count only; blocked → unavailable.

const uuidSchema = z.string().uuid();

const toDef = (row: AchievementDefinitionRow): AchievementDef => ({
  id: row.id,
  key: row.key,
  name: row.name,
  description: row.description,
  criterion: row.criterion as unknown as AchievementCriterion,
  tier: row.tier as AchievementTier,
  kind: row.kind as AchievementKind,
  reward: row.reward as unknown as AchievementReward,
});

const maskSecret = (row: AchievementDefinitionRow): AchievementDefView => ({
  id: row.id,
  kind: 'secret',
  tier: 'secret',
  locked: true,
});

const isSecret = (row: AchievementDefinitionRow): boolean => row.kind === 'secret';

/**
 * GET /achievements — the active definitions. A `secret`-kind def the caller HASN'T unlocked is masked
 * to `{ id, kind, tier, locked }` (no name/criterion/reward — the sealed mystery slot); everything else
 * (milestones + the caller's own unlocked secrets) is the full def view.
 */
export async function getDefinitions(actorId: string): Promise<AchievementDefView[]> {
  const [defs, unlocked] = await Promise.all([
    achievementRepo.listActiveDefinitions(),
    achievementRepo.unlockedAchievementIds(actorId),
  ]);
  return defs.map((row) => (isSecret(row) && !unlocked.has(row.id) ? maskSecret(row) : toDef(row)));
}

/**
 * GET /me/achievements — the caller's own trophy-case state. `earned`/`inProgress` cover MILESTONES;
 * `secrets.found` reveals the caller's unlocked secrets (full def), and `secrets.lockedCount` is only a
 * number (no locked-secret detail). In-progress bars are the LIVE counters (COUNT criteria only — a
 * match/dual criterion has no bar and never appears here).
 */
export async function getMyAchievements(actorId: string): Promise<MeAchievementsResponse> {
  const defs = await achievementRepo.listActiveDefinitions();
  const unlocks = await achievementRepo.listUnlocks(actorId);
  const unlockedAt = new Map<string, Date>(unlocks.map((u: UserAchievementRow) => [u.achievementId, u.unlockedAt]));

  const earned: EarnedAchievement[] = [];
  const inProgress: InProgressAchievement[] = [];
  const secretsFound: EarnedAchievement[] = [];
  let secretsTotal = 0;

  for (const row of defs) {
    const secret = isSecret(row);
    if (secret) secretsTotal += 1;
    const when = unlockedAt.get(row.id);
    if (when) {
      const earnedView: EarnedAchievement = { ...toDef(row), unlockedAt: when.toISOString() };
      if (secret) secretsFound.push(earnedView);
      else earned.push(earnedView);
      continue;
    }
    if (secret) continue; // an unearned secret stays hidden from the caller's own progress list
    const criterion = row.criterion as unknown as AchievementCriterion;
    const target = targetOf(criterion);
    if (target === null) continue; // a milestone with no bar (none seeded) — never listed in-progress
    const current = await computeProgress(actorId, criterion);
    inProgress.push({ ...toDef(row), progress: { current, target, unit: unitOf(criterion) ?? 'events' } });
  }

  earned.sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));
  secretsFound.sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));

  return {
    summary: {
      earned: earned.length,
      inProgress: inProgress.length,
      secretsFound: secretsFound.length,
      secretsTotal,
    },
    earned,
    inProgress,
    secrets: { found: secretsFound, lockedCount: secretsTotal - secretsFound.length },
  };
}

/**
 * GET /users/:id/achievements (ACH-05) — a user's SHOWCASE. The MOD-09 non-disclosure collapse FIRST
 * (blocked-either-direction / suspended / deleted / unknown / malformed → the generic 404, indistinguishable),
 * THEN the friend gate: a friend (or self) sees the full EARNED list (milestones AND unlocked secrets as
 * plain earned rows — never in-progress, never the locked-secret count); a non-friend sees only the honest
 * `summary.earned` headline. No secret-EXISTENCE ever leaks across the wire.
 */
export async function getUserAchievements(
  actorId: string,
  rawTargetId: string,
): Promise<UserAchievementsResponse> {
  const parsed = uuidSchema.safeParse(rawTargetId);
  if (!parsed.success) throw new NotFoundError('User not found.'); // malformed → same as unknown
  const targetId = parsed.data;

  const target = await profileRepo.getOwnProfile(targetId);
  if (!target || target.deletedAt) throw new NotFoundError('User not found.'); // unknown / AUTH-07
  if (await relationshipRepo.isBlockedBetween(actorId, targetId)) {
    throw new NotFoundError('User not found.'); // SOC-09 (either direction)
  }
  if (await suspensionRepo.getActiveSuspension(targetId)) {
    throw new NotFoundError('User not found.'); // MOD-09
  }

  const defs = await achievementRepo.listActiveDefinitions();
  const activeById = new Map(defs.map((d) => [d.id, d]));
  const unlocks = await achievementRepo.listUnlocks(targetId);
  const earnedActive = unlocks.filter((u) => activeById.has(u.achievementId));

  const isSelf = actorId === targetId;
  const isFriend = isSelf || (await relationshipRepo.getRelationship(actorId, targetId)) === 'friend';
  if (!isFriend) {
    // Non-friend / hidden — the honest headline count only (no rows, no in-progress, no secret leak).
    return { summary: { earned: earnedActive.length }, locked: true };
  }

  const earned: ShowcaseAchievement[] = earnedActive
    .map((u): ShowcaseAchievement => {
      const def = activeById.get(u.achievementId)!;
      return {
        id: def.id,
        key: def.key,
        name: def.name,
        tier: def.tier as AchievementTier,
        unlockedAt: u.unlockedAt.toISOString(),
      };
    })
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));

  return { summary: { earned: earned.length }, earned };
}
