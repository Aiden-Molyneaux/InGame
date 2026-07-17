import type { AchievementDefView, EarnedAchievement } from '@ingame/shared';
import type { AchievementDetail } from '../achievements/AchievementSheet';

// achievementFeedDetail (P8 walk-4 · OQ-148) — maps a tapped unlocked_achievement feed object to the
// P11 AchievementSheet detail. The definition comes from GET /achievements (the PUBLIC defs read, which
// the server masks per-CALLER):
//   • a VISIBLE def → the `earned` detail — name · tier colouring · description ("what-for") ·
//     when-earned = the FEED item's occurredAt (the actor's unlock moment). The reward is STRIPPED to
//     the bare badge ({badge:true} → the sheet's RewardBlock renders nothing): the def's PX/cosmetic
//     reward copy ("Added to your wallet") speaks to YOUR unlock, not a friend's — and the walk-4 spec
//     draws no reward on this surface. NOTE (component gap, flagged): AchievementSheet has no actor/
//     subtitle prop, so the actor's name stays on the feed row — the sheet renders as-is, not extended.
//   • a MASKED secret def (the caller hasn't unlocked it — no `name` on the shape) → the SEALED
//     `locked` variant. Structurally zero-leak: the detail carries NO fields at all (OQ-148 — the tap
//     path can't reveal what the defs read masked).
//   • defs not loaded / id unknown → null (the tap no-ops rather than opening a wrong sheet).
export function achievementDetailFor(
  defs: AchievementDefView[] | undefined,
  achievementId: string | undefined,
  occurredAt: string,
): AchievementDetail | null {
  if (!defs || !achievementId) return null;
  const def = defs.find((d) => d.id === achievementId);
  if (!def) return null;
  if (!('name' in def)) return { kind: 'locked' }; // masked secret — sealed, zero fields (OQ-148)
  const achievement: EarnedAchievement = {
    ...def,
    reward: { badge: true }, // strip PX/cosmetic — no your-wallet copy on a friend's unlock
    unlockedAt: occurredAt,
  };
  return { kind: 'earned', achievement };
}
