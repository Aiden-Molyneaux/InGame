// The InGame design-system tokens (component-map §2 · design-spec §1.1/§1.2 · Foundation Rules
// F-01..F-09). Canonical baseline: TEAL shell + MIDNIGHT screen (the catalog default). Tokens ONLY —
// screens/components never use literals (naming-law rule 5). F-06: the on-screen type scale is
// EXACTLY 21/15/11/9. F-07: radius lives on the shell (plastic); on-screen chrome is 90°. F-08: one
// font per surface — Chakra Petch on the screen, Paytone One on the plastic.
//
// (Values derived from the catalog palette + F-rules. A pixel-exact swatch reconciliation against
// `InGame Design System Catalog.dc.html` is an owner-side Burt audit follow-up.)

export const theme = {
  // brand.* — invariant across screen themes (F-02: gold = value/acquisitive; accent = pink shell LED).
  brand: {
    accent: '#ff3d77', // pink LED (shell) — F-05 round pink
    gold: '#ffd23f', // value / acquisitive (F-02)
    goldInk: '#3c2a09',
    cream: '#f5f1e4', // silk / plastic face text · on-screen keycap/secondary fill (decision 0069)
    creamPressed: '#d9d4c2', // darkened cream — pressed/active keycap (F-03 scanline-energize; decision 0069)
    navy: '#1d2a4a',
    alert: '#e3414e',
    success: '#d3e95e',
    secret: '#e85ad0', // SECRET achievement tier (theme-invariant magenta)
  },

  // scr.* — the MIDNIGHT screen theme (dark). `accent` is the on-screen accent (StateMark orange,
  // F-09) — re-themeable per DEV-04; `accentInk` is the text that sits on it.
  scr: {
    bg: '#14121f',
    panel: '#201d30', // one step LIGHTER than bg (F-09 — flat plane, never sunken)
    panelHi: '#282437',
    hairline: '#322d48',
    ink: '#f0ecf8', // primary on-screen text
    dim: '#9b97c0', // secondary
    faint: '#5d5870',
    accent: '#ff9f43', // the on-screen StateMark orange (F-05/F-09 selection)
    accentInk: '#14121f',
    // the light-theme legibility set (decision 0070 / OQ-144) — Midnight = the dark identity values
    // (secondary=cream, gold=bright, dark gold-ink, dark polarity); the light themes adapt in palettes.ts.
    key: '#f5f1e4', // secondary/keycap face (= brand.cream on dark)
    value: '#ffd23f', // F-02 gold (= brand.gold on dark)
    valueInk: '#3c2a09', // ink on a gold face (= brand.goldInk on dark)
    isLight: false,
  },

  // shell.* — the TEAL device plastic (the 3D body wrapping every screen).
  shell: {
    hi: '#2bb3a6',
    plastic: '#178f84',
    lo: '#0d524e',
    silk: '#f5f1e4', // the cream faceplate
    cap: '#f5f1e4', // the nav-keycap face (cream on teal; per-shell in SHELL_PALETTES — Carbon greys it)
    ink: '#0a2b28',
    bezel: '#0b0a13', // the dark screen-bezel frame the Midnight screen sits in (mockup `--bezel`,
    // darker than scr.bg so the screen reads inset) — DeviceShell §5.1
    led: '#ff5a4e', // the red POWER LED on the top-band (mockup `.power .led`)
    pipOff: '#117672', // an unlit nav pip (mockup `--pip-off`)
  },

  // F-06 — the ONLY on-screen type scale.
  type: { display: 21, title: 15, body: 11, micro: 9 },

  // F-08 — one font per surface.
  font: {
    screen: 'ChakraPetch_500Medium',
    screenSemi: 'ChakraPetch_600SemiBold',
    screenBold: 'ChakraPetch_700Bold',
    shell: 'PaytoneOne_400Regular',
  },

  space: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 24 },

  // F-07 — radius on the shell only; on-screen chrome is square (0). The device-frame radii are the
  // fixed structural dimensions of the physical shell (mockup profile-states.html): the outer plastic
  // `.device` (30), the `.screen-bezel` (20), the inner `.screen` glass (13), the `.nav-btn` keys (15).
  corner: { shell: 14, screen: 0, device: 30, bezel: 20, glass: 13, navKey: 15 },

  // F-02 — the GameCard TL+BR pixel-step (the card signature; borrowed at half-scale by intent buttons).
  step: 6,
} as const;

// The live `scr.*`/`shell.*` layers are WIDENED to the palette interfaces (string-valued) so a theme/
// shell swap type-checks — the static `theme` const bakes Midnight/Teal as `as const` LITERALS, but the
// engine returns whichever palette is selected. brand/type/font/space/corner/step keep their literal
// types. (The `theme` const VALUE is unchanged; this only relaxes the two swappable layers' types.)
export type Theme = Omit<typeof theme, 'scr' | 'shell'> & {
  scr: import('./palettes').ScreenTheme;
  shell: import('./palettes').ShellPalette;
};

// The theme ENGINE (device-manifest ARCH 1) — the live `scr.*`/`shell.*` layers. Consumers that read
// those tokens use `useTheme()` / `themedStyles()` instead of the static `theme`; brand/type/font/
// space/corner/step stay on the static `theme`. Re-exported here so imports stay `from '../theme'`.
export { useTheme, themedStyles } from './useTheme';
export {
  SCREEN_THEMES,
  SHELL_PALETTES,
  SCREEN_THEME_IDS,
  SHELL_IDS,
  SCREEN_THEME_NAMES,
  SHELL_NAMES,
  DEFAULT_THEME_ID,
  DEFAULT_SHELL_ID,
  resolveShellId,
  resolveScreenThemeId,
  type ScreenTheme,
  type ShellPalette,
  type ScreenThemeId,
  type ShellId,
} from './palettes';

// withAlpha(hex, a) — a `#rrggbb` + opacity → `rgba(...)`. Used to derive a theme-following tint from a
// live token (e.g. the SectionDock active wash = the theme accent at 10%, so it isn't a fixed orange
// under a teal/violet theme). Decision 0070 / OQ-144.
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
