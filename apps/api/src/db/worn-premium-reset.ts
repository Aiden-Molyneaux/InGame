import { sql } from 'drizzle-orm';
import { getDb, type Executor } from './client';

// decision 0076 §0.12 — the one-time worn-premium-shell data fix (M6 P1, rides the migration window).
//
// The M5 write gate (F-2b `PREMIUM_UNRECONCILED`) stops a NEW un-entitled premium shell/theme from
// being worn, but PRE-ECONOMY device rows may already wear a premium `active_shell_id`/`screen_theme_id`
// with no matching `user_entitlements` grant (the roster was all-free before P10; entitlements did not
// exist). This resets those specific fields to the FREE launch defaults (schema defaults: teal shell ·
// midnight theme). An ENTITLED premium row (a real `user_entitlements` grant for that cosmetic) is left
// untouched.
//
// The premium id lists are the decision-0075 launch roster (config/cosmetics.ts, premium device_shell /
// screen_theme entries) — hard-coded here because this is a POINT-IN-TIME historical cleanup, not a
// living rule (a future roster change does not re-open this fix). This function is the TESTED source of
// truth; migration 0015's SQL mirrors it verbatim for the one-time prod application (P15/G-C cutover).
// This is db/ INFRA (not a repository) — a deliberately cross-user bulk maintenance op, like reset.ts;
// it uses parameterized raw `sql` (the rule-02 raw-SQL ban applies only to the strict repository
// surface). Idempotent: re-running it over already-reset rows changes nothing.

/** The decision-0075 PREMIUM device shells (all others are free; teal/grape are the free defaults). */
export const PREMIUM_SHELL_IDS = ['sunset', 'pink', 'carbon'] as const;
/** The decision-0075 PREMIUM screen themes (all others are free; midnight/paper are the free defaults). */
export const PREMIUM_THEME_IDS = ['deepsea', 'berry', 'mint', 'lilac'] as const;
/** The free launch defaults reset targets (the `device_configs` column defaults). */
export const FREE_DEFAULT_SHELL = 'teal';
export const FREE_DEFAULT_THEME = 'midnight';

export interface WornPremiumResetResult {
  shellsReset: number;
  themesReset: number;
}

/**
 * Reset every device row wearing an UN-ENTITLED premium shell/theme to the free default. Returns the
 * per-facet change counts (for the migration/startup NOTICE). Idempotent.
 */
export async function resetWornUnentitledPremium(
  exec: Executor = getDb(),
): Promise<WornPremiumResetResult> {
  const shellRows = await exec.execute(sql`
    UPDATE device_configs dc
       SET active_shell_id = ${FREE_DEFAULT_SHELL}, updated_at = now()
     WHERE dc.active_shell_id IN (${sql.join(
       PREMIUM_SHELL_IDS.map((id) => sql`${id}`),
       sql`, `,
     )})
       AND NOT EXISTS (
         SELECT 1 FROM user_entitlements ue
          WHERE ue.user_id = dc.user_id AND ue.cosmetic_id = dc.active_shell_id
       )
    RETURNING dc.id
  `);
  const themeRows = await exec.execute(sql`
    UPDATE device_configs dc
       SET screen_theme_id = ${FREE_DEFAULT_THEME}, updated_at = now()
     WHERE dc.screen_theme_id IN (${sql.join(
       PREMIUM_THEME_IDS.map((id) => sql`${id}`),
       sql`, `,
     )})
       AND NOT EXISTS (
         SELECT 1 FROM user_entitlements ue
          WHERE ue.user_id = dc.user_id AND ue.cosmetic_id = dc.screen_theme_id
       )
    RETURNING dc.id
  `);
  return { shellsReset: shellRows.rowCount ?? 0, themesReset: themeRows.rowCount ?? 0 };
}
