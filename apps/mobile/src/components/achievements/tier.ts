import type { AchievementTier } from '@ingame/shared';
import type { Theme } from '../../theme';

// ACH-09 tier colour — the ONE mapping the whole Achievements set themes by. A non-functional
// prestige/visibility signal (never touches trigger/reward logic). Token-only (naming-law rule 5 —
// never a literal): the STANDARD tier rides `t.scr.accent`, the THEME accent, so it RE-THEMES with the
// screen theme (DEV-04) rather than baking an orange. The two carve-outs are owner-ratified:
//   • PRESTIGE → `t.brand.gold` — the F-02 gold carve-out (gold ALSO marks non-acquisitive prestige).
//   • SECRET   → `t.brand.secret` (#e85ad0) — the F-05 magenta carve-out (theme-invariant; shell LEDs
//     stay round/pink). `t.scr.secret` is not a screen-theme token, so the invariant `brand.secret` is
//     the source of truth (design-spec §1.5: "SECRET scr.secret #e85ad0" == brand.secret on every theme).
export function tierColor(tier: AchievementTier, t: Theme): string {
  switch (tier) {
    case 'prestige':
      return t.brand.gold;
    case 'secret':
      return t.brand.secret;
    case 'standard':
    default:
      return t.scr.accent; // the theme accent — re-themes per DEV-04
  }
}

// PRESTIGE-first ordering (the board draws gold prestige before standard within a grid; secret rows
// carry their own magenta but sort after prestige). A stable sort key: prestige(0) < standard(1) <
// secret(2). Used to order the EARNED grid + the VIEW ALL earned list.
const TIER_RANK: Record<AchievementTier, number> = { prestige: 0, standard: 1, secret: 2 };
export function byTierPrestigeFirst<T extends { tier: AchievementTier }>(a: T, b: T): number {
  return TIER_RANK[a.tier] - TIER_RANK[b.tier];
}
