import { useEffect, useState } from 'react';
import type { EarnedAchievement } from '@ingame/shared';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setLastSeenUnlockCount } from '../../store/prefsSlice';
import { useGetMyAchievementsQuery } from '../../store/achievementsApi';

// useUnlockCelebration (ACH-06 in-app half · ARCH-A4 / ASSUMPTION-1) — the poll-FREE unlock detector.
// There is NO push and NO event stream at M6, so an unlock is detected as a `/me/achievements`
// refetch-DELTA: the total unlock count (`summary.earned + summary.secretsFound`) is compared against
// a persisted `lastSeenUnlockCount`. A first observation (`null`) baselines SILENTLY — a fresh login
// never re-celebrates existing achievements. A later INCREASE fires the celebration for the NEWEST
// unlocked row (max `unlockedAt` across `earned` + `secrets.found`), and the baseline advances so it
// can't re-fire. `refetchOnFocus`/`refetchOnReconnect` (setupListeners, store/index.ts) make returning
// to the app or reconnecting re-read /me/achievements and surface the delta — no timer poll (owner
// directive). The M7 push half replaces this detection; the CelebrationMoment component is unchanged.
export function useUnlockCelebration(): {
  pending: EarnedAchievement | null;
  dismiss: () => void;
} {
  const dispatch = useAppDispatch();
  const authed = useAppSelector((s) => s.auth.accessToken != null);
  const lastSeen = useAppSelector((s) => s.prefs.lastSeenUnlockCount);
  const { data } = useGetMyAchievementsQuery(undefined, {
    skip: !authed,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [pending, setPending] = useState<EarnedAchievement | null>(null);

  const total = data ? data.summary.earned + data.summary.secretsFound : null;

  useEffect(() => {
    if (!authed || data == null || total == null) return;
    if (lastSeen == null) {
      // FIRST observation — baseline silently (never celebrate existing unlocks on a fresh session).
      dispatch(setLastSeenUnlockCount(total));
      return;
    }
    if (total > lastSeen) {
      const newest = newestUnlock(data.earned, data.secrets.found);
      if (newest) setPending(newest);
      dispatch(setLastSeenUnlockCount(total)); // advance the baseline so it can't re-fire
    } else if (total < lastSeen) {
      // defensive: the count dropped (data reset / account change mid-session) — re-baseline down.
      dispatch(setLastSeenUnlockCount(total));
    }
  }, [authed, data, total, lastSeen, dispatch]);

  // A session-scoped clear: on logout `authed` flips false and the pending overlay must not linger.
  useEffect(() => {
    if (!authed && pending) setPending(null);
  }, [authed, pending]);

  return { pending, dismiss: () => setPending(null) };
}

// The newest unlocked row across the earned milestones + the found secrets (both EarnedAchievement).
function newestUnlock(
  earned: EarnedAchievement[],
  found: EarnedAchievement[],
): EarnedAchievement | null {
  let best: EarnedAchievement | null = null;
  for (const a of [...earned, ...found]) {
    if (best == null || Date.parse(a.unlockedAt) > Date.parse(best.unlockedAt)) best = a;
  }
  return best;
}
