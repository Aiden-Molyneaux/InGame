import { describe, it, expect } from 'vitest';
import { collectCosmeticRefs, isPremiumComposition } from './cosmetics';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';

// CARD-06 / M5 P7 — the CLOSED-ATTRIBUTE derivation extension. `collectCosmeticRefs` must now see
// premium frame/effect/finish/nameplate closed attributes (the reconcile gate stood on fontId/iconId
// only before P7). Pure config logic — no DB. Tags: CARD-06, CARD-13, COSM-03.

const base = { gradient: ['#241a4d', '#0e0b1e'] as [string, string] };
const comp = (extra: Record<string, unknown>) => ({
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  base,
  elements: [],
  ...extra,
});

describe('CARD-06: effect closed attribute — kind IS the roster id', () => {
  it('premium effect kinds (frost/scanline/halftone/embers) flip isPremium true', () => {
    for (const kind of ['frost', 'scanline', 'halftone', 'embers']) {
      const c = comp({ effect: { kind, intensity: 0.5 } });
      expect(collectCosmeticRefs(c)).toContain(kind);
      expect(isPremiumComposition(c)).toBe(true);
    }
  });
  it('free effect kinds (soft-glow/vignette/dust/gradient-sheen/none) stay free', () => {
    for (const kind of ['soft-glow', 'vignette', 'dust', 'gradient-sheen', 'none']) {
      expect(isPremiumComposition(comp({ effect: { kind, intensity: 0.5 } }))).toBe(false);
    }
  });
});

describe('CARD-06: finish closed attribute — kind IS the roster id', () => {
  it('premium finishes (linen/holographic/metallic) flip isPremium true; matte/none stay free', () => {
    for (const kind of ['linen', 'holographic', 'metallic']) {
      expect(isPremiumComposition(comp({ finish: { kind } }))).toBe(true);
    }
    for (const kind of ['matte', 'none']) {
      expect(isPremiumComposition(comp({ finish: { kind } }))).toBe(false);
    }
  });
});

describe('CARD-06: nameplate closed attribute — shape IS the roster id', () => {
  it('the premium BRASS plate flips isPremium true; free shapes stay free', () => {
    expect(isPremiumComposition(comp({ nameplate: { shape: 'brass', title: 'X', plate: '#000', ink: '#fff', size: 0.05 } }))).toBe(true);
    for (const shape of ['slab', 'ribbon', 'bevel', 'capsule', 'tab', 'arch', 'dogtag']) {
      expect(isPremiumComposition(comp({ nameplate: { shape, title: 'X', plate: '#000', ink: '#fff', size: 0.05 } }))).toBe(false);
    }
  });
  it('a premium nameplate fontId flips isPremium true (both id-bearing plate fields)', () => {
    expect(isPremiumComposition(comp({ nameplate: { shape: 'slab', fontId: 'bitter', title: 'X', plate: '#000', ink: '#fff', size: 0.05 } }))).toBe(true);
  });
});

describe('CARD-06: frame closed attribute — kind+color resolves the id', () => {
  it('all-premium kinds (ornate/glow/foil/marquee) flip premium regardless of exact color', () => {
    expect(isPremiumComposition(comp({ frame: { kind: 'ornate', color: '#e8c14a', width: 0.04 } }))).toBe(true);
    expect(isPremiumComposition(comp({ frame: { kind: 'foil', color: '#e85ad0', width: 0.04 } }))).toBe(true);
    expect(isPremiumComposition(comp({ frame: { kind: 'marquee', color: '#e8c14a', width: 0.04 } }))).toBe(true);
    // glow disambiguates ember-glow vs plasma by color; both premium
    expect(collectCosmeticRefs(comp({ frame: { kind: 'glow', color: '#ff5a5a', width: 0.04 } }))).toContain('ember-glow');
    expect(collectCosmeticRefs(comp({ frame: { kind: 'glow', color: '#5ad0ff', width: 0.04 } }))).toContain('plasma');
  });
  it('mixed kinds are premium ONLY on an exact premium-color match (thin-gold / chrome)', () => {
    expect(collectCosmeticRefs(comp({ frame: { kind: 'thin-line', color: '#e8c14a', width: 0.045 } }))).toContain('thin-gold');
    expect(isPremiumComposition(comp({ frame: { kind: 'thin-line', color: '#e8c14a', width: 0.045 } }))).toBe(true);
    expect(collectCosmeticRefs(comp({ frame: { kind: 'double-line', color: '#d8d5ec', width: 0.017 } }))).toContain('chrome');
    // free variants of a mixed kind stay free
    expect(isPremiumComposition(comp({ frame: { kind: 'thin-line', color: '#c9c5e6', width: 0.045 } }))).toBe(false); // plain LINE
    expect(isPremiumComposition(comp({ frame: { kind: 'thin-line', color: '#a9e34b', width: 0.045 } }))).toBe(false); // LIME
    expect(isPremiumComposition(comp({ frame: { kind: 'double-line', color: '#9b97c0', width: 0.017 } }))).toBe(false); // plain DOUBLE LINE
    expect(isPremiumComposition(comp({ frame: { kind: 'ticket-notch', color: '#ff9f43', width: 0.045 } }))).toBe(false); // STUB (free)
  });
  it('a kindless legacy frame (the AURORA sample / CARD-18 default) stays free', () => {
    expect(isPremiumComposition(comp({ frame: { color: '#e8c14a', width: 0.012 } }))).toBe(false);
  });
});

describe('CARD-06: style_presets .style shape — ids carried directly', () => {
  it('premium frameId/effect.id/finishId/nameplateId/title.fontId each flip premium', () => {
    expect(isPremiumComposition({ frameId: 'thin-gold' })).toBe(true);
    expect(isPremiumComposition({ effect: { id: 'frost', intensity: 0.5 } })).toBe(true);
    expect(isPremiumComposition({ finishId: 'metallic' })).toBe(true);
    expect(isPremiumComposition({ nameplateId: 'brass' })).toBe(true);
    expect(isPremiumComposition({ title: { fontId: 'pacifico', ink: '#fff' } })).toBe(true);
    // an all-free preset stays free
    expect(isPremiumComposition({ frameId: 'clean', nameplateId: 'slab', title: { fontId: 'clean-sans', ink: '#fff' } })).toBe(false);
  });
});

describe('CARD-06: an all-free composition references no premium', () => {
  it('is not premium', () => {
    const c = comp({
      elements: [{ type: 'text', x: 0.5, y: 0.5, text: 'X', size: 0.06, fill: '#fff', fontId: 'clean-sans' }],
      frame: { kind: 'thin-line', color: '#c9c5e6', width: 0.045 },
      effect: { kind: 'vignette', intensity: 0.5 },
      finish: { kind: 'matte' },
      nameplate: { shape: 'slab', fontId: 'clean-sans', title: 'X', plate: '#000', ink: '#fff', size: 0.05 },
    });
    expect(isPremiumComposition(c)).toBe(false);
  });
});
