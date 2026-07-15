import { createContext, useMemo, type ReactNode } from 'react';

// ThemePreview (M5 F-10 live inspect, decision 0076) — re-theme a SUBTREE to a specific screen theme /
// shell WITHOUT touching the persisted `prefs` (no PATCH, no global repaint). The store's theme
// item-sheet wraps its preview stage in this so "PREVIEWING — BERRY" actually paints BERRY: the stage's
// bg/panel/ink/accent/gold all adopt the previewed palette, a genuine live preview instead of a static
// thumbnail (owner device-walk F-10 — "the shells and theme say Previewing, but they are not previewing
// live"). `useTheme()` reads this override FIRST and falls back to the redux prefs when it's absent —
// which is everywhere else, so the default behavior is value-identical (the review bar).

export interface ThemeOverride {
  /** Screen-theme id to force within this subtree (undefined → inherit the live prefs). */
  themeId?: string;
  /** Shell id to force within this subtree (undefined → inherit the live prefs). */
  shellId?: string;
}

export const ThemeOverrideContext = createContext<ThemeOverride | null>(null);

export function ThemePreview({ themeId, shellId, children }: ThemeOverride & { children: ReactNode }) {
  const value = useMemo(() => ({ themeId, shellId }), [themeId, shellId]);
  return <ThemeOverrideContext.Provider value={value}>{children}</ThemeOverrideContext.Provider>;
}
