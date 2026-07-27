// Owner sitting 2026-07-27 — the marquee chase LIGHT tints from `frame.color` (reverses the
// warm-bulb deferral). The registry gold pins the legacy pair pixel-identically; other colours
// lighten per-channel toward white; junk degrades to legacy. Pure-function pins for `marqueeLightColors`.

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: number) => ({ value: initial }),
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  useReducedMotion: () => false,
  withRepeat: () => 0,
  withTiming: () => 1,
  cancelAnimation: () => {},
  Easing: { linear: () => 0 },
}));
jest.mock('@shopify/react-native-skia', () => ({
  Group: () => null,
  Circle: () => null,
  Rect: () => null,
  LinearGradient: () => null,
  BlurMask: () => null,
  Skia: { Path: { MakeFromSVGString: () => null } },
}));

import { marqueeLightColors, MARQUEE_LIGHT_LEGACY } from './animated';

describe('marqueeLightColors — the chase light tints from frame.color (registry pins legacy)', () => {
  it('the registry gold returns the EXACT legacy pair (pixel-identity, case/hash-insensitive)', () => {
    expect(marqueeLightColors('#e8c14a')).toEqual(MARQUEE_LIGHT_LEGACY);
    expect(marqueeLightColors('#E8C14A')).toEqual(MARQUEE_LIGHT_LEGACY);
    expect(marqueeLightColors('e8c14a')).toEqual(MARQUEE_LIGHT_LEGACY);
    expect(MARQUEE_LIGHT_LEGACY).toEqual({ glow: '#fff2b0', core: '#ffffff' });
  });

  it('a recoloured marquee derives a LIGHTER glow + a near-white core carrying the hue', () => {
    const { glow, core } = marqueeLightColors('#12e0b8'); // the walkseed teal
    expect(glow).toMatch(/^#[0-9a-f]{6}$/);
    const [gr, gg, gb] = [1, 3, 5].map((i) => parseInt(glow.slice(i, i + 2), 16));
    expect(gr).toBeGreaterThan(0x12); // strictly lighter than the pick, per channel
    expect(gg).toBeGreaterThanOrEqual(0xe0);
    expect(gb).toBeGreaterThan(0xb8);
    const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(core.slice(i, i + 2), 16));
    expect(Math.min(cr, cg, cb)).toBeGreaterThanOrEqual(200); // near-white…
    expect(core).not.toBe('#ffffff'); // …but not pure white — the hue trace survives
  });

  it('missing/junk colour degrades to the legacy pair — never a dark or broken light', () => {
    expect(marqueeLightColors(undefined)).toEqual(MARQUEE_LIGHT_LEGACY);
    expect(marqueeLightColors(null)).toEqual(MARQUEE_LIGHT_LEGACY);
    expect(marqueeLightColors('not-a-color')).toEqual(MARQUEE_LIGHT_LEGACY);
    expect(marqueeLightColors(7)).toEqual(MARQUEE_LIGHT_LEGACY);
  });
});
