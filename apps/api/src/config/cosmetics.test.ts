import { describe, it, expect } from 'vitest';
import {
  COSMETIC_CATALOG,
  collectCosmeticRefs,
  forceRegistryColors,
  isColorCustomizable,
  isPremiumComposition,
  lookupCosmeticTier,
  priceForTier,
} from './cosmetics';
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

// ── M6 W-5 — the Ultimate class (COSM-05 · decision 0080; ECON-01 10-PX band) ────────────────────────

describe('COSM-05/ECON-01: the three 0080-minted ultimate SKUs (registry shape)', () => {
  const ULTIMATES = [
    { id: 'marquee-ultimate', type: 'frame', name: 'MARQUEE ULTIMATE' },
    { id: 'brass-ultimate', type: 'nameplate', name: 'BRASS ULTIMATE' },
    { id: 'pacifico-ultimate', type: 'font', name: 'SCRIPT ULTIMATE' },
  ] as const;

  it('each SKU is registered at tier ultimate (10 PX) with colorCustomizable true', () => {
    for (const u of ULTIMATES) {
      const entry = COSMETIC_CATALOG.find((e) => e.id === u.id);
      expect(entry, u.id).toBeTruthy();
      expect(entry?.type).toBe(u.type);
      expect(entry?.name).toBe(u.name);
      expect(entry?.tier).toBe('ultimate');
      expect(entry?.colorCustomizable).toBe(true);
      expect(lookupCosmeticTier(u.id)).toBe('ultimate');
      expect(priceForTier(lookupCosmeticTier(u.id))).toBe(10);
      expect(isColorCustomizable(u.id)).toBe(true);
    }
  });

  it('0080 ruling 2 — the base designs are UNTOUCHED (no promotion, no price movement, no flag)', () => {
    expect(lookupCosmeticTier('marquee')).toBe('showpiece'); // 8 PX
    expect(lookupCosmeticTier('brass')).toBe('standard'); // 3 PX
    expect(lookupCosmeticTier('pacifico')).toBe('standard'); // 3 PX
    for (const id of ['marquee', 'brass', 'pacifico']) expect(isColorCustomizable(id)).toBe(false);
  });

  it('no OTHER catalog entry carries the flag at beta (0080 — the three SKUs are the whole cut)', () => {
    const flagged = COSMETIC_CATALOG.filter((e) => e.colorCustomizable).map((e) => e.id);
    expect(flagged.sort()).toEqual(['brass-ultimate', 'marquee-ultimate', 'pacifico-ultimate']);
  });
});

describe('COSM-05/CARD-22: the explicit composition cosmeticId — wins over inference, registry-validated', () => {
  it('a valid frame cosmeticId wins over kind+color inference (colour-independent identity)', () => {
    const c = comp({ frame: { kind: 'marquee', color: '#12e0a8', width: 0.04, cosmeticId: 'marquee-ultimate' } });
    const refs = collectCosmeticRefs(c);
    expect(refs).toContain('marquee-ultimate');
    expect(refs).not.toContain('marquee');
    expect(isPremiumComposition(c)).toBe(true);
  });

  it('a valid nameplate cosmeticId wins over the shape ref', () => {
    const c = comp({
      nameplate: { shape: 'brass', cosmeticId: 'brass-ultimate', title: 'X', plate: '#8a2be2', ink: '#fff', size: 0.05 },
    });
    const refs = collectCosmeticRefs(c);
    expect(refs).toContain('brass-ultimate');
    expect(refs).not.toContain('brass');
  });

  it('a MISMATCHED kind/shape falls back to inference (registry validation — never trusted blind)', () => {
    // marquee-ultimate binds to kind 'marquee' — on a thin-line frame it is ignored; exact gold infers thin-gold.
    const wrongKind = comp({ frame: { kind: 'thin-line', color: '#e8c14a', width: 0.045, cosmeticId: 'marquee-ultimate' } });
    expect(collectCosmeticRefs(wrongKind)).toContain('thin-gold');
    expect(collectCosmeticRefs(wrongKind)).not.toContain('marquee-ultimate');
    // a frame id on a NAMEPLATE layer is ignored; the shape ref stands.
    const wrongLayer = comp({
      nameplate: { shape: 'brass', cosmeticId: 'marquee-ultimate', title: 'X', plate: '#000', ink: '#fff', size: 0.05 },
    });
    expect(collectCosmeticRefs(wrongLayer)).toContain('brass');
    expect(collectCosmeticRefs(wrongLayer)).not.toContain('marquee-ultimate');
  });

  it('an UNKNOWN cosmeticId falls back to inference', () => {
    const c = comp({ frame: { kind: 'marquee', color: '#12e0a8', width: 0.04, cosmeticId: 'no-such-sku' } });
    expect(collectCosmeticRefs(c)).toContain('marquee');
    expect(collectCosmeticRefs(c)).not.toContain('no-such-sku');
  });

  it('colour-independence holds WITHOUT the explicit id too (belt and braces — recoloured stays premium)', () => {
    expect(collectCosmeticRefs(comp({ frame: { kind: 'marquee', color: '#00ff00', width: 0.04 } }))).toContain('marquee');
    expect(
      collectCosmeticRefs(comp({ nameplate: { shape: 'brass', title: 'X', plate: '#00ff00', ink: '#fff', size: 0.05 } })),
    ).toContain('brass');
    // a font is id-bearing — ink freedom never changes the ref
    expect(collectCosmeticRefs(comp({ nameplate: { shape: 'slab', fontId: 'pacifico', title: 'X', plate: '#000', ink: '#bada55', size: 0.05 } }))).toContain('pacifico');
  });
});

describe('COSM-05/CARD-15: forceRegistryColors — the server flatten colour-force backstop', () => {
  it('forces the registry colour onto a recoloured NON-flagged premium frame', () => {
    const c = comp({ frame: { kind: 'marquee', color: '#ff0000', width: 0.04 } });
    const forced = forceRegistryColors(c) as { frame: { color: string } };
    expect(forced.frame.color).toBe('#e8c14a'); // the marquee roster gold
    // glow (all-premium kind, first-id inference → ember-glow) forces to the ember roster red
    const g = comp({ frame: { kind: 'glow', color: '#00ff00', width: 0.04 } });
    expect((forceRegistryColors(g) as { frame: { color: string } }).frame.color).toBe('#ff5a5a');
  });

  it('leaves a FLAGGED (ultimate) design untouched — colour freedom is the entitlement working', () => {
    const c = comp({ frame: { kind: 'marquee', color: '#12e0a8', width: 0.04, cosmeticId: 'marquee-ultimate' } });
    expect(forceRegistryColors(c)).toBe(c); // same reference — nothing forced
  });

  it('leaves FREE designs untouched (free kinds tolerate arbitrary colours — they read as the free variant)', () => {
    const c = comp({ frame: { kind: 'thin-line', color: '#00ff00', width: 0.045 } });
    expect(forceRegistryColors(c)).toBe(c);
    const bare = comp({});
    expect(forceRegistryColors(bare)).toBe(bare);
  });

  it('forces the brass plate to the registry gold on a non-flagged brass nameplate (+ the off-list ink)', () => {
    const c = comp({ nameplate: { shape: 'brass', title: 'X', plate: '#8a2be2', ink: '#fff', size: 0.05 } });
    const forced = forceRegistryColors(c) as { nameplate: { plate: string; ink: string } };
    expect(forced.nameplate.plate).toBe('#c9971f'); // the brass ramp base — the registry colour
    // '#fff' is off the CARD-11 curated set and no ultimate font is equipped → forced to CREAM
    // (free-pick ink IS the SCRIPT-ULTIMATE entitlement; it must not ship un-bought — Murr W-5 fix).
    expect(forced.nameplate.ink).toBe('#f3ecd9');
  });

  it('an INVALID cosmeticId does not exempt the layer (validation falls back → forced)', () => {
    const c = comp({
      nameplate: { shape: 'brass', cosmeticId: 'marquee-ultimate', title: 'X', plate: '#8a2be2', ink: '#fff', size: 0.05 },
    });
    expect((forceRegistryColors(c) as { nameplate: { plate: string } }).nameplate.plate).toBe('#c9971f');
  });

  it('leaves a flagged brass-ultimate nameplate untouched; leaves free plates untouched; never mutates input', () => {
    // curated ink in both fixtures — the plate flag exempts the PLATE only; ink rides the FONT flag.
    const ultimate = comp({
      nameplate: { shape: 'brass', cosmeticId: 'brass-ultimate', title: 'X', plate: '#8a2be2', ink: '#e8c14a', size: 0.05 },
    });
    expect(forceRegistryColors(ultimate)).toBe(ultimate);
    const free = comp({ nameplate: { shape: 'slab', title: 'X', plate: '#8a2be2', ink: '#e8c14a', size: 0.05 } });
    expect(forceRegistryColors(free)).toBe(free);
    // non-mutation: the forced case returns a NEW object, input untouched
    const recoloured = comp({ frame: { kind: 'marquee', color: '#ff0000', width: 0.04 } });
    const out = forceRegistryColors(recoloured);
    expect(out).not.toBe(recoloured);
    expect((recoloured as unknown as { frame: { color: string } }).frame.color).toBe('#ff0000');
  });

  // The INK half of the backstop (COSM-05, Murr W-5 fix) — free-pick ink is gated on the FONT SKU.
  describe('the curated-ink floor — ink freedom only under a colorCustomizable font', () => {
    const plate = (over: Record<string, unknown>) =>
      comp({ nameplate: { shape: 'slab', title: 'X', plate: '#14121f', size: 0.05, ...over } });

    it('an off-list ink under a NON-ultimate premium font forces to CREAM', () => {
      const c = plate({ fontId: 'pacifico', ink: '#ff00ff' });
      expect((forceRegistryColors(c) as { nameplate: { ink: string } }).nameplate.ink).toBe('#f3ecd9');
    });

    it('an off-list ink with NO font at all (clean-sans default — the free-font attack) forces too', () => {
      const c = plate({ ink: '#ff00ff' });
      expect((forceRegistryColors(c) as { nameplate: { ink: string } }).nameplate.ink).toBe('#f3ecd9');
    });

    it('the SAME off-list ink under pacifico-ultimate is KEPT — the 10-PX entitlement working', () => {
      const c = plate({ fontId: 'pacifico-ultimate', ink: '#ff00ff' });
      expect(forceRegistryColors(c)).toBe(c); // same reference — nothing forced
    });

    it('curated inks pass at any case; an absent ink is untouched', () => {
      const curated = plate({ fontId: 'pacifico', ink: '#E8C14A' });
      expect(forceRegistryColors(curated)).toBe(curated);
      const inkless = plate({ fontId: 'pacifico' });
      expect(forceRegistryColors(inkless)).toBe(inkless);
    });

    it('a forced ink COMPOSES with a forced plate (both smuggled on one nameplate)', () => {
      const c = comp({
        nameplate: { shape: 'brass', title: 'X', plate: '#8a2be2', fontId: 'bitter', ink: '#00ffcc', size: 0.05 },
      });
      const forced = forceRegistryColors(c) as { nameplate: { plate: string; ink: string } };
      expect(forced.nameplate.plate).toBe('#c9971f');
      expect(forced.nameplate.ink).toBe('#f3ecd9');
    });
  });
});
