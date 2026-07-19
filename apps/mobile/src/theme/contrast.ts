// WCAG 2.1 relative-luminance contrast — the RUNTIME helper the Monogram Forge (W-4) uses to guard the
// bg↔ink colour pair. This is a DELIBERATE second copy of the math that theme/contrast.test.ts inlines:
// that test is an INDEPENDENT oracle (decision 0076 — "a law you can't game by editing a shared
// helper"), so it must NOT import from here. This twin is the app-runtime one the forge imports.

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

/** The WCAG contrast ratio between two `#rrggbb` colours (1:1 … 21:1). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// The monogram glyph is LARGE text (its size is ~40% of the avatar box — ≥ the F-06 21px display, bold),
// so the AA large-text floor (3:1) is the readability bar for the ink-on-bg pair (matching how the theme
// contrast law exempts recessive tones to 3:1 for large text).
export const MONOGRAM_CONTRAST_FLOOR = 3;

/** The Forge guard — is the bg↔ink pair legible enough to wear? (Both must be `#rrggbb`.) */
export function isReadableMonogram(bg: string, ink: string): boolean {
  return contrastRatio(bg, ink) >= MONOGRAM_CONTRAST_FLOOR;
}
