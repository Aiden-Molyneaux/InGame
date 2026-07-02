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
    cream: '#f5f1e4', // silk / plastic face text
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
  },

  // shell.* — the TEAL device plastic (the 3D body wrapping every screen).
  shell: {
    hi: '#2bb3a6',
    plastic: '#178f84',
    lo: '#0d524e',
    silk: '#f5f1e4', // the cream faceplate
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

export type Theme = typeof theme;
