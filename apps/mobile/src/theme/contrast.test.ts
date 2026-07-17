import { SCREEN_THEMES, type ScreenThemeId } from './palettes';
import { theme } from './index';

// ── The contrast FLOOR — the law that outlives the F3 tuning (decision 0076, owner-approved Fable
// proposal) ──────────────────────────────────────────────────────────────────────────────────────
// Every text-bearing token pair the screen renders is held to a WCAG 2.1 contrast floor, computed here
// independently (the math is inlined, not imported from app code — a law you can't game by editing a
// shared helper). Any future theme or token edit that drops a reading pair below the floor FAILS CI.
//
// Floors:
//  • 4.5:1 — the AA normal-text floor, for the READING tokens (ink primary · dim secondary · value gold
//    text) on every surface (bg/panel/panelHi), plus the on-face inks (valueInk on the value face,
//    accentInk on the accent face — button labels). Enforced across ALL SIX themes.
//  • 3:1  — the AA large-text floor, applied to the deliberately-recessive TERTIARY tone (`faint`) on
//    the three LIGHT themes only. `faint` is a de-emphasis tone (hints, timestamps), not reading text;
//    on the DARK themes it sits at ~2.2–2.7:1 BY DESIGN (the signed Midnight/Deep-Sea/Berry identity),
//    so it is exempt there — the F3 pass keeps dark themes untouched. On light themes `faint` is more
//    prominent, so it is guarded at the large-text floor.
//
// WHY these pairs: the owner's F3 note — "light themes are kinda bad for legibility across the board
// against lighter fonts." The reading tokens + gold text on the light surfaces were the offenders
// (dim hit 2.63:1, gold text ~3.1:1); this law pins the fix and blocks regression.

// ── WCAG 2.1 relative-luminance + contrast (inlined; the independent oracle) ──
function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}
function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const FLOOR_TEXT = 4.5; // AA normal text
const FLOOR_LARGE = 3.0; // AA large text (≥ the 21px display, or a recessive tone)

const ALL_THEMES = Object.keys(SCREEN_THEMES) as ScreenThemeId[];
const SURFACES = ['bg', 'panel', 'panelHi'] as const;
const READING_TOKENS = ['ink', 'dim', 'value'] as const; // primary · secondary · gold text
const LIGHT_THEMES: ScreenThemeId[] = ['paper', 'mint', 'lilac'];

describe('the contrast floor — WCAG helper sanity', () => {
  it('black on white is 21:1, white on white is 1:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 2);
  });
});

describe('the contrast floor — reading text clears 4.5:1 on every surface, every theme', () => {
  const cases: Array<[ScreenThemeId, (typeof READING_TOKENS)[number], (typeof SURFACES)[number]]> = [];
  for (const id of ALL_THEMES) for (const tok of READING_TOKENS) for (const surf of SURFACES) cases.push([id, tok, surf]);

  it.each(cases)('%s: %s on %s ≥ 4.5:1', (id, tok, surf) => {
    const t = SCREEN_THEMES[id];
    const ratio = contrastRatio(t[tok], t[surf]);
    expect(ratio).toBeGreaterThanOrEqual(FLOOR_TEXT);
  });
});

describe('the contrast floor — on-face inks clear 4.5:1 (button labels)', () => {
  it.each(ALL_THEMES)('%s: valueInk on the value face ≥ 4.5:1', (id) => {
    const t = SCREEN_THEMES[id];
    expect(contrastRatio(t.valueInk, t.value)).toBeGreaterThanOrEqual(FLOOR_TEXT);
  });
  it.each(ALL_THEMES)('%s: accentInk on the accent face ≥ 4.5:1', (id) => {
    const t = SCREEN_THEMES[id];
    expect(contrastRatio(t.accentInk, t.accent)).toBeGreaterThanOrEqual(FLOOR_TEXT);
  });
});

describe('the invariant gold BUTTON face keeps the 0069 ink-on-gold pairing', () => {
  // The `add`/DESIGN-NEW button + PriceChip/CurrencyCounter chips are a bright-gold FILL with dark ink
  // on EVERY theme (F3 — gold background is not the deepened `scr.value` text token). Pin that pairing.
  it('goldInk on brand.gold ≥ 4.5:1', () => {
    expect(contrastRatio(theme.brand.goldInk, theme.brand.gold)).toBeGreaterThanOrEqual(FLOOR_TEXT);
  });
});

describe('the contrast floor — light-theme tertiary (faint) clears the 3:1 large-text floor', () => {
  const cases: Array<[ScreenThemeId, (typeof SURFACES)[number]]> = [];
  for (const id of LIGHT_THEMES) for (const surf of SURFACES) cases.push([id, surf]);

  it.each(cases)('%s: faint on %s ≥ 3:1', (id, surf) => {
    const t = SCREEN_THEMES[id];
    expect(contrastRatio(t.faint, t[surf])).toBeGreaterThanOrEqual(FLOOR_LARGE);
  });
});
