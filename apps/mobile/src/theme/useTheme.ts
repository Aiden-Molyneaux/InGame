import { useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { theme, type Theme } from './index';
import {
  SCREEN_THEMES,
  SHELL_PALETTES,
  DEFAULT_THEME_ID,
  DEFAULT_SHELL_ID,
  type ScreenThemeId,
  type ShellId,
} from './palettes';
import { ThemeOverrideContext } from './ThemePreview';
import type { RootState } from '../store';

// The THEME ENGINE (device-manifest ARCH 1). Today `theme` is a static const with Midnight `scr.*` +
// Teal `shell.*` baked in; ~54 files freeze those into module-scope `StyleSheet.create`, so no remount
// can repaint them. This hook makes the `scr.*` + `shell.*` layers LIVE — selected from the persisted
// `prefs` slice (DEV-02/04) — while brand/type/font/space/corner/step stay static. Under the default
// Midnight/Teal the returned object is VALUE-IDENTICAL to the static `theme` (the review bar; proven in
// useTheme.test.ts). The static `theme` export is unchanged — non-scr/shell consumers keep using it.

/** Resolve the selected screen theme, falling back to the default for an unknown/absent id (DEV-03). */
function resolveScreenThemeId(id: string | undefined): ScreenThemeId {
  return id && id in SCREEN_THEMES ? (id as ScreenThemeId) : DEFAULT_THEME_ID;
}

/** Resolve the selected shell, falling back to the default (Teal always renders — DEV-03). */
function resolveShellId(id: string | undefined): ShellId {
  return id && id in SHELL_PALETTES ? (id as ShellId) : DEFAULT_SHELL_ID;
}

/**
 * The live theme: the static tokens with the selected `scr.*` + `shell.*` palettes swapped in.
 * Memoized on the resolved ids so the object identity is stable while the selection holds.
 */
export function useTheme(): Theme {
  // A ThemePreview subtree (F-10 live inspect) overrides the persisted selection WITHOUT a PATCH; absent
  // (everywhere but the store's theme/shell preview) → the redux prefs win, value-identical to before.
  const override = useContext(ThemeOverrideContext);
  const themeId = useSelector((s: RootState) => s.prefs.themeId);
  const shellId = useSelector((s: RootState) => s.prefs.shellId);
  const scrId = resolveScreenThemeId(override?.themeId ?? themeId);
  const shId = resolveShellId(override?.shellId ?? shellId);
  return useMemo(
    () => ({ ...theme, scr: SCREEN_THEMES[scrId], shell: SHELL_PALETTES[shId] }),
    [scrId, shId],
  );
}

/**
 * The themed-`StyleSheet` factory (device-manifest ARCH 1). Wraps a style factory `(t) => ({...})` and
 * returns a HOOK: call it in a component body to get a memoized `StyleSheet.create(fn(liveTheme))` that
 * re-creates only when the live theme changes. This replaces module-scope `StyleSheet.create` for any
 * sheet that reads `scr.*`/`shell.*`, so those sheets repaint on a theme/shell switch.
 *
 *   const useStyles = themedStyles((t) => ({ row: { backgroundColor: t.scr.panel } }));
 *   // in the component:  const styles = useStyles();
 */
// The `| NamedStyles<any>` branch mirrors RN's `StyleSheet.create` signature — it's what lets the style
// factory's string-literal props (`flexDirection: 'row'` etc.) narrow WITHOUT `as const` at every call
// site, keeping the ~54-file sweep a pure `theme.` → `t.` swap.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function themedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  fn: (t: Theme) => T,
): () => T {
  return function useStyles(): T {
    const t = useTheme();
    return useMemo(() => StyleSheet.create(fn(t)), [t]);
  };
}
