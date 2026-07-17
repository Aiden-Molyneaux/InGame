-- decision 0076 §0.12 — the one-time worn-premium-shell data fix (M6 P1, hand-authored DATA migration).
-- Resets pre-economy device rows wearing an UN-ENTITLED premium shell/theme to the free defaults
-- (teal shell · midnight theme). An ENTITLED premium row (a real user_entitlements grant) survives.
-- The premium id lists are the decision-0075 launch roster (config/cosmetics.ts). This MIRRORS the
-- tested src/db/worn-premium-reset.ts (resetWornUnentitledPremium) — keep them in step. Idempotent.
DO $$
DECLARE
  shells_reset integer;
  themes_reset integer;
BEGIN
  WITH reset AS (
    UPDATE device_configs dc
       SET active_shell_id = 'teal', updated_at = now()
     WHERE dc.active_shell_id IN ('sunset', 'pink', 'carbon')
       AND NOT EXISTS (
         SELECT 1 FROM user_entitlements ue
          WHERE ue.user_id = dc.user_id AND ue.cosmetic_id = dc.active_shell_id
       )
    RETURNING dc.id
  )
  SELECT count(*) INTO shells_reset FROM reset;

  WITH reset AS (
    UPDATE device_configs dc
       SET screen_theme_id = 'midnight', updated_at = now()
     WHERE dc.screen_theme_id IN ('deepsea', 'berry', 'mint', 'lilac')
       AND NOT EXISTS (
         SELECT 1 FROM user_entitlements ue
          WHERE ue.user_id = dc.user_id AND ue.cosmetic_id = dc.screen_theme_id
       )
    RETURNING dc.id
  )
  SELECT count(*) INTO themes_reset FROM reset;

  RAISE NOTICE '[0015 worn-premium-reset] reset % un-entitled premium shells, % themes to free defaults', shells_reset, themes_reset;
END $$;
