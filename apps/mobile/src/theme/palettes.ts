// The InGame theme roster — the 6 screen themes (`scr.*`) + 5 shell colourways (`shell.*`) the Device
// editor (M4 §3.5, DEV-02/04) swaps between. Authored from design-spec §1.1 (the full hex tables) and
// the theme-engine contract in `docs/planning/m4/device-manifest.md` (ARCH 1). These are pure token
// tables — no dependency on the static `theme` const; `useTheme()` merges the selected pair onto the
// static tokens (brand/type/font/space/corner/step).
//
// ── OQ-143 mapping table (design-spec §1.1 token names → the CODE's live keys) ──────────────────────
// The §1.1 palettes use `well/tools/head/text/soft/…`; the code has drifted to `panel/panelHi/ink/…`.
// Per ARCH 1 the code keys are NOT renamed (60-file blast radius, zero user value); instead §1.1 maps
// ONTO them BY ROLE. Each key below carries the §1.1 role it fills. MIDNIGHT ★ + TEAL ★ are the code's
// TODAY values VERBATIM (the value-identity review bar — `useTheme()` under defaults deep-equals the
// static `theme`); the code's Midnight has itself drifted from §1.1 (bg #14121f vs §1.1 #232045) — that
// drift is ACCEPTED for the default. The other five themes / four shells are §1.1 translated by role.

/** The on-screen tokens every screen theme carries (the code's live `scr.*` keys). */
export interface ScreenTheme {
  bg: string; // §1.1 `bg`     — the screen field
  panel: string; // §1.1 `well`    — a flat raised surface (one step over bg, F-09)
  panelHi: string; // §1.1 `tools`   — the tool-tray / higher surface tone
  hairline: string; // derived — a step off `panel` toward `ink` (the divider; see note below)
  ink: string; // §1.1 `text`    — primary on-screen text
  dim: string; // §1.1 `dim`     — secondary text
  faint: string; // §1.1 `soft`    — tertiary / faint text
  accent: string; // §1.1 `accent`  — the on-screen StateMark accent (re-themeable, F-09)
  accentInk: string; // §1.1 `accentInk` — text that sits on `accent`
  // ── the light-theme legibility set (decision 0070 / OQ-144 — "adapt the hue", owner 2026-07-10) ──
  key: string; // §1.1 `chip` — the on-screen SECONDARY/keycap face (0069): CREAM on dark themes, WHITE
  //             on light. On light themes a flat light key can't self-contrast → it also gets a border
  //             (ScreenButton reads `isLight`). Dark themes: `key === brand.cream` (identity, no change).
  value: string; // F-02 gold/value tone: bright `#ffd23f` on dark themes, a DEEPER gold on light (so
  //               gold/value reads on the cream/paper bgs; still gold-family — the F-02 signal holds).
  valueInk: string; // text that sits ON a `value` FACE (the `add` button): dark `goldInk` on bright gold
  //                  (dark themes), CREAM on the deep gold (light themes). Gold TEXT uses `value` itself.
  isLight: boolean; // theme polarity — light themes give flat light keys a border (figure/ground) + drive
  //                   any dark/light-dependent treatment. Dark themes: false (no change to the 0069 look).
}

/** The 9 physical tokens every shell colourway carries (the code's live `shell.*` keys). */
export interface ShellPalette {
  hi: string; // §1.1 `plasticHi` — the lit plastic bevel
  plastic: string; // §1.1 `plastic`   — the body plastic
  lo: string; // §1.1 `plasticLo`  — the shaded plastic / label ink on teal
  silk: string; // §1.1 `silk`      — the silkscreen faceplate / label tone
  cap: string; // the NAV-KEYCAP face — CREAM on every shell EXCEPT Carbon (grey), owner ruling 2026-07-10;
  //             decoupled from `silk` (whose §1.1 tone is dark on grape/sunset/pink → dark keycaps)
  ink: string; // §1.1 `ink`       — logo/grille/key-shadow ink
  bezel: string; // constant — the dark screen-bezel frame (F: never re-colours)
  led: string; // constant — the POWER LED (F-05: the LED never re-colours)
  pipOff: string; // §1.1 `pipOff`    — an unlit nav pip
}

// The nav-keycap face is CREAM on every shell (the physical plastic keycap tone, like teal today) —
// Carbon is the one exception (a light grey cap), owner ruling 2026-07-10. Kept a named constant so the
// intent reads at a glance and a new shell inherits the right default.
const CAP_CREAM = '#f5f1e4';
const CAP_CARBON = '#b9b9c6';

export type ScreenThemeId = 'midnight' | 'deepsea' | 'berry' | 'paper' | 'mint' | 'lilac';
export type ShellId = 'teal' | 'grape' | 'sunset' | 'pink' | 'carbon';

// `bezel` + `led` are theme/shell-invariant physical constants (design-spec §1.5 / F-05).
const BEZEL = '#0b0a13'; // the dark screen-bezel frame (code `shell.bezel` today) — constant across shells
const LED = '#ff5a4e'; // the POWER LED (code `shell.led` today) — constant across shells (F-05)

// The light-theme legibility set (decision 0070 / OQ-144). Dark themes keep the brand values VERBATIM
// (`key`=cream #f5f1e4, `value`=gold #ffd23f, `valueInk`=goldInk #3c2a09) so nothing changes on Midnight/
// Deep-Sea/Berry. The 3 light themes share one contrast-tuned set (all three bgs sit ~0.80 luminance):
const KEY_DARK = '#f5f1e4'; // cream secondary/keycap face (= brand.cream) on dark themes
const KEY_LIGHT = '#ffffff'; // white key face on light themes (the button also gets a border, see ScreenButton)
const VALUE_DARK = '#ffd23f'; // bright gold (= brand.gold) on dark themes
const VALUE_LIGHT = '#8a6d0a'; // deep goldenrod on light themes (~4:1 on the paper/mint/lilac bgs; still gold)
const VALUE_INK_DARK = '#3c2a09'; // dark ink on bright gold (= brand.goldInk)
const VALUE_INK_LIGHT = '#f5f1e4'; // cream ink on the deep gold (reads on VALUE_LIGHT)

// ── Screen themes ───────────────────────────────────────────────────────────────────────────────────
// hairline is derived a step off `panel` toward `ink` — mirroring how today's Midnight #322d48 sits over
// panel #201d30 (a lighter step on the dark themes; on the LIGHT themes the same rule darkens the near-
// white panel into a visible divider, preserving the §1.1 relative-contrast structure).
export const SCREEN_THEMES: Record<ScreenThemeId, ScreenTheme> = {
  // ★ MIDNIGHT (dark) — the code's TODAY values, VERBATIM (identity bar).
  midnight: {
    bg: '#14121f',
    panel: '#201d30',
    panelHi: '#282437',
    hairline: '#322d48',
    ink: '#f0ecf8',
    dim: '#9b97c0',
    faint: '#5d5870',
    accent: '#ff9f43',
    accentInk: '#14121f',
    key: KEY_DARK,
    value: VALUE_DARK,
    valueInk: VALUE_INK_DARK,
    isLight: false,
  },
  // DEEP SEA (dark) — §1.1 Deep Sea translated by role.
  deepsea: {
    bg: '#0f2e2b', // §1.1 bg
    panel: '#173d38', // §1.1 well
    panelHi: '#0a1f1d', // §1.1 tools
    hairline: '#31524e', // panel→ink step
    ink: '#ffffff', // §1.1 text
    dim: '#84aaa2', // §1.1 dim
    faint: '#bcd6cf', // §1.1 soft
    accent: '#ffd23f', // §1.1 accent
    accentInk: '#3c2a09', // §1.1 accentInk
    key: KEY_DARK,
    value: VALUE_DARK,
    valueInk: VALUE_INK_DARK,
    isLight: false,
  },
  // BERRY (dark) — §1.1 Berry translated by role.
  berry: {
    bg: '#2f1733', // §1.1 bg
    panel: '#3d2042', // §1.1 well
    panelHi: '#1f0e23', // §1.1 tools
    hairline: '#523957', // panel→ink step
    ink: '#ffffff', // §1.1 text
    dim: '#b18ab8', // §1.1 dim
    faint: '#dcc4e0', // §1.1 soft
    accent: '#ff3d77', // §1.1 accent
    accentInk: '#2a1430', // §1.1 accentInk
    key: KEY_DARK,
    value: VALUE_DARK,
    valueInk: VALUE_INK_DARK,
    isLight: false,
  },
  // PAPER (light) — §1.1 Paper translated by role; ink flips dark (§1.1 text #2a2633).
  paper: {
    bg: '#ece5d1', // §1.1 bg
    panel: '#f9f5e9', // §1.1 well
    panelHi: '#dfd6bd', // §1.1 tools
    hairline: '#e2ded5', // panel→ink step (darkens the light panel into a visible divider)
    ink: '#2a2633', // §1.1 text
    dim: '#8a8270', // §1.1 dim
    faint: '#5d5747', // §1.1 soft
    accent: '#c75c12', // §1.1 accent
    accentInk: '#ffffff', // §1.1 accentInk
    key: KEY_LIGHT,
    value: VALUE_LIGHT,
    valueInk: VALUE_INK_LIGHT,
    isLight: true,
  },
  // MINT (light) — §1.1 Mint translated by role; ink flips dark (§1.1 text #16302c).
  mint: {
    bg: '#ddeee9', // §1.1 bg
    panel: '#f4faf7', // §1.1 well
    panelHi: '#c8e0d8', // §1.1 tools
    hairline: '#dce4e1', // panel→ink step
    ink: '#16302c', // §1.1 text
    dim: '#5f827b', // §1.1 dim
    faint: '#3c5a54', // §1.1 soft
    accent: '#117672', // §1.1 accent
    accentInk: '#ffffff', // §1.1 accentInk
    key: KEY_LIGHT,
    value: VALUE_LIGHT,
    valueInk: VALUE_INK_LIGHT,
    isLight: true,
  },
  // LILAC (light) — §1.1 Lilac translated by role; ink flips dark (§1.1 text #2a2444).
  lilac: {
    bg: '#e6e1f4', // §1.1 bg
    panel: '#f7f5fc', // §1.1 well
    panelHi: '#d2c9ec', // §1.1 tools
    hairline: '#e0dee8', // panel→ink step
    ink: '#2a2444', // §1.1 text
    dim: '#7d76a0', // §1.1 dim
    faint: '#4a4466', // §1.1 soft
    accent: '#6c4fd8', // §1.1 accent
    accentInk: '#ffffff', // §1.1 accentInk
    key: KEY_LIGHT,
    value: VALUE_LIGHT,
    valueInk: VALUE_INK_LIGHT,
    isLight: true,
  },
};

// ── Shell colourways ──────────────────────────────────────────────────────────────────────────────
export const SHELL_PALETTES: Record<ShellId, ShellPalette> = {
  // ★ TEAL — the code's TODAY values, VERBATIM (identity bar).
  teal: {
    hi: '#2bb3a6',
    plastic: '#178f84',
    lo: '#0d524e',
    silk: '#f5f1e4',
    cap: CAP_CREAM,
    ink: '#0a2b28',
    bezel: BEZEL,
    led: LED,
    pipOff: '#117672',
  },
  // GRAPE — §1.1 Grape translated by role.
  grape: {
    hi: '#9f8df2', // §1.1 plasticHi
    plastic: '#8a76e8', // §1.1 plastic
    lo: '#7460cc', // §1.1 plasticLo
    silk: '#392c7a', // §1.1 silk
    cap: CAP_CREAM, // cream keycap (owner 2026-07-10 — not the dark §1.1 silk)
    ink: '#2d2164', // §1.1 ink
    bezel: BEZEL,
    led: LED,
    pipOff: '#5e4cb8', // §1.1 pipOff
  },
  // SUNSET — §1.1 Sunset translated by role.
  sunset: {
    hi: '#ffa76f', // §1.1 plasticHi
    plastic: '#ff9051', // §1.1 plastic
    lo: '#ea7437', // §1.1 plasticLo
    silk: '#7c3a12', // §1.1 silk
    cap: CAP_CREAM, // cream keycap (owner 2026-07-10)
    ink: '#6b2f0c', // §1.1 ink
    bezel: BEZEL,
    led: LED,
    pipOff: '#c96a2e', // §1.1 pipOff
  },
  // PINK — §1.1 Pink translated by role.
  pink: {
    hi: '#ffa5c4', // §1.1 plasticHi
    plastic: '#ff8ab0', // §1.1 plastic
    lo: '#e96d96', // §1.1 plasticLo
    silk: '#8a2247', // §1.1 silk
    cap: CAP_CREAM, // cream keycap (owner 2026-07-10)
    ink: '#76183a', // §1.1 ink
    bezel: BEZEL,
    led: LED,
    pipOff: '#c0577f', // §1.1 pipOff
  },
  // CARBON — §1.1 Carbon translated by role; silk flips LIGHT (labels on dark plastic, §1.1).
  carbon: {
    hi: '#4a4a54', // §1.1 plasticHi
    plastic: '#3a3a42', // §1.1 plastic
    lo: '#2c2c33', // §1.1 plasticLo
    silk: '#b9b9c6', // §1.1 silk (light — inverted)
    cap: CAP_CARBON, // the one grey keycap (owner keeps Carbon's grey caps, 2026-07-10)
    ink: '#0a0a0e', // §1.1 ink
    bezel: BEZEL,
    led: LED,
    pipOff: '#16161c', // §1.1 pipOff
  },
};

export const DEFAULT_THEME_ID: ScreenThemeId = 'midnight';
export const DEFAULT_SHELL_ID: ShellId = 'teal';

/** The ordered id lists the Device editor consumes for its ItemTile rows (board order). */
export const SCREEN_THEME_IDS: ScreenThemeId[] = ['midnight', 'deepsea', 'berry', 'paper', 'mint', 'lilac'];
export const SHELL_IDS: ShellId[] = ['teal', 'grape', 'sunset', 'pink', 'carbon'];

// Display names (board copy) — the ONE roster-identity source the Device editor + the Profile MY DEVICE
// strip read (a shell·theme has no user-given name; DEV-05/OQ-064). All-caps on-screen per F-06.
export const SHELL_NAMES: Record<ShellId, string> = {
  teal: 'TEAL',
  grape: 'GRAPE',
  sunset: 'SUNSET',
  pink: 'PINK',
  carbon: 'CARBON',
};
export const SCREEN_THEME_NAMES: Record<ScreenThemeId, string> = {
  midnight: 'MIDNIGHT',
  deepsea: 'DEEP SEA',
  berry: 'BERRY',
  paper: 'PAPER',
  mint: 'MINT',
  lilac: 'LILAC',
};

/** Resolve an id to a valid shell, falling back to the default (Teal always renders — DEV-03). */
export function resolveShellId(id: string | undefined): ShellId {
  return id && id in SHELL_PALETTES ? (id as ShellId) : DEFAULT_SHELL_ID;
}

/** Resolve an id to a valid screen theme, falling back to the default (DEV-03). */
export function resolveScreenThemeId(id: string | undefined): ScreenThemeId {
  return id && id in SCREEN_THEMES ? (id as ScreenThemeId) : DEFAULT_THEME_ID;
}
