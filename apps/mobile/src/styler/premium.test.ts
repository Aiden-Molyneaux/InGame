import {
  collectPremiumRosterIds,
  explicitFrameRosterId,
  explicitPlateRosterId,
  premiumStatusOf,
  resolvePremiumRefs,
} from './premium';
import { NAMEPLATES } from './roster';
import { COMPOSITION_SCHEMA_VERSION, type CosmeticListItem } from '@ingame/shared';
import type { CardComposition } from '../render/composition';

// CARD-13 (M5 P7) — the client premium derivation + cost-stack math. Mirrors the server's
// collectCosmeticRefs closed-attribute extension; the cost-stack sums ONLY unowned premium.

const base = (extra: Partial<CardComposition>): CardComposition => ({
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  base: { gradient: ['#241a4d', '#0e0b1e'] },
  elements: [],
  ...extra,
});

const LIB: CosmeticListItem[] = [
  { id: 'frost', type: 'effect', name: 'FROST', tier: 'showpiece', price: 8, owned: false },
  { id: 'scanline', type: 'effect', name: 'SCANLINE', tier: 'standard', price: 3, owned: false },
  { id: 'thin-gold', type: 'frame', name: 'GOLD', tier: 'standard', price: 3, owned: false },
  { id: 'chrome', type: 'frame', name: 'CHROME', tier: 'standard', price: 3, owned: true },
  { id: 'metallic', type: 'finish', name: 'METALLIC', tier: 'showpiece', price: 8, owned: false },
  { id: 'brass', type: 'nameplate', name: 'BRASS', tier: 'standard', price: 3, owned: false },
  { id: 'bitter', type: 'font', name: 'SLAB', tier: 'standard', price: 3, owned: false },
];

describe('CARD-13: collectPremiumRosterIds — closed attributes resolve to premium roster ids', () => {
  it('premium effect kind (frost) is collected; a free effect is not', () => {
    expect(collectPremiumRosterIds(base({ effect: { kind: 'frost', intensity: 0.5 } }))).toEqual(['frost']);
    expect(collectPremiumRosterIds(base({ effect: { kind: 'vignette', intensity: 0.5 } }))).toEqual([]);
  });

  it('frames resolve by kind+color — GOLD (premium) vs plain LINE (free) share kind thin-line', () => {
    expect(
      collectPremiumRosterIds(base({ frame: { kind: 'thin-line', color: '#e8c14a', width: 0.045 } })),
    ).toEqual(['thin-gold']);
    expect(
      collectPremiumRosterIds(base({ frame: { kind: 'thin-line', color: '#c9c5e6', width: 0.045 } })),
    ).toEqual([]);
  });

  it('premium finish, plate shape, and fonts (plate + text element) are all collected, deduped', () => {
    const comp = base({
      finish: { kind: 'metallic' },
      nameplate: { shape: 'brass', fontId: 'bitter', title: 'X', plate: '#000', ink: '#fff', size: 0.05 },
      elements: [
        { type: 'text', x: 0.5, y: 0.5, text: 'A', size: 0.06, fill: '#fff', fontId: 'bitter' },
      ],
    });
    expect(collectPremiumRosterIds(comp).sort()).toEqual(['bitter', 'brass', 'metallic']);
  });

  it('an all-free composition collects nothing', () => {
    const comp = base({
      frame: { kind: 'ticket-notch', color: '#f3ecd9', width: 0.045 },
      effect: { kind: 'dust', intensity: 0.4 },
      finish: { kind: 'matte' },
      nameplate: { shape: 'slab', fontId: 'clean-sans', title: 'X', plate: '#000', ink: '#fff', size: 0.05 },
    });
    expect(collectPremiumRosterIds(comp)).toEqual([]);
  });
});

describe('CARD-13: premiumStatusOf — the cost-stack sums only UNOWNED premium', () => {
  it('owned premium carries no debt; unowned sums exactly', () => {
    const comp = base({
      frame: { kind: 'double-line', color: '#d8d5ec', width: 0.017 }, // chrome — OWNED in LIB
      effect: { kind: 'frost', intensity: 0.5 }, // 8, unowned
      finish: { kind: 'metallic' }, // 8, unowned
    });
    const s = premiumStatusOf(comp, LIB);
    expect(s.refs.map((r) => r.cosmeticId).sort()).toEqual(['chrome', 'frost', 'metallic']);
    expect(s.unowned.map((r) => r.cosmeticId).sort()).toEqual(['frost', 'metallic']);
    expect(s.costStack).toBe(16);
  });

  it('a fully-owned premium card stacks 0 (no reconcile owed)', () => {
    const comp = base({ frame: { kind: 'double-line', color: '#d8d5ec', width: 0.017 } });
    const s = premiumStatusOf(comp, LIB);
    expect(s.refs).toHaveLength(1);
    expect(s.unowned).toHaveLength(0);
    expect(s.costStack).toBe(0);
  });

  it('a null draft / empty library degrade safely', () => {
    expect(premiumStatusOf(null, LIB).costStack).toBe(0);
    const s = premiumStatusOf(base({ effect: { kind: 'frost', intensity: 0.5 } }), undefined);
    // no library yet (first load) — the ref surfaces but priced 0/unowned; the SERVER still gates.
    expect(s.unowned).toHaveLength(1);
    expect(s.costStack).toBe(0);
  });
});

describe('CARD-13: resolvePremiumRefs — names/prices/ownership join from the library', () => {
  it('joins by id and falls back honestly for an unknown id', () => {
    const refs = resolvePremiumRefs(['frost', 'mystery'], LIB);
    // M5 F-9 (G4): `type` rides for the reconcile/keep buy-list swatch — from the library, else inferred.
    // COSM-05 (M6 W-5): `tier` also rides (from the library) so the reconcile row can wear the ULTIMATE
    // chip; an unknown id has no library row, so its tier is absent.
    expect(refs[0]).toEqual({ cosmeticId: 'frost', name: 'FROST', type: 'effect', price: 8, owned: false, tier: 'showpiece' });
    expect(refs[1]).toEqual({ cosmeticId: 'mystery', name: 'MYSTERY', type: 'frame', price: 0, owned: false, tier: undefined });
  });
});

// ── COSM-05 (M6 W-5, decision 0080) — colour-independent ultimate identity ───────────────────────

const ULTIMATE_LIB: CosmeticListItem[] = [
  ...LIB,
  { id: 'marquee', type: 'frame', name: 'MARQUEE', tier: 'showpiece', price: 8, owned: false },
  { id: 'marquee-ultimate', type: 'frame', name: 'MARQUEE ULTIMATE', tier: 'ultimate', price: 10, owned: false, colorCustomizable: true },
  { id: 'brass-ultimate', type: 'nameplate', name: 'BRASS ULTIMATE', tier: 'ultimate', price: 10, owned: false, colorCustomizable: true },
  { id: 'pacifico-ultimate', type: 'font', name: 'SCRIPT ULTIMATE', tier: 'ultimate', price: 10, owned: false, colorCustomizable: true },
];

describe('COSM-05: explicit composition cosmeticId — validated-first, inference-fallback', () => {
  it('a recoloured MARQUEE ULTIMATE frame resolves to ITS OWN SKU, never base marquee or free', () => {
    const frame = { kind: 'marquee' as const, color: '#12e0b8', width: 0.045, cosmeticId: 'marquee-ultimate' };
    expect(explicitFrameRosterId(frame)).toBe('marquee-ultimate');
    expect(collectPremiumRosterIds(base({ frame }))).toEqual(['marquee-ultimate']);
  });

  it('without the explicit id, colour inference stays BASE-first (default-gold marquee reads marquee)', () => {
    expect(
      collectPremiumRosterIds(base({ frame: { kind: 'marquee', color: '#e8c14a', width: 0.045 } })),
    ).toEqual(['marquee']);
  });

  it('roster invariant — every colorCustomizable plate carries its plateSeed (preset/styler agreement — Murr W-5 LOW)', () => {
    // preset-apply requires BOTH (colorCustomizable && plateSeed) while styler-apply falls back — a
    // flagged-but-seedless row would diverge the two paths. Pin the invariant so a future authoring
    // slip fails here, not in a user's preset.
    for (const p of NAMEPLATES) {
      if (p.colorCustomizable) expect(p.plateSeed).toBeTruthy();
    }
  });

  it('a BASIC (non-premium) cosmeticId never validates — the cost-stack mirrors the server (Murr W-5 MED)', () => {
    // Murr's smuggle: a free/basic id on a premium-coloured frame. The server's resolveExplicitCosmeticId
    // is PREMIUM_BY_ID-only so it colour-infers thin-gold (3 PX); a client that accepted 'lime' would
    // say 0 PX and the publish reconcile would surprise the user. Reject → same inference → same price.
    const frame = { kind: 'thin-line' as const, color: '#e8c14a', width: 0.045, cosmeticId: 'lime' };
    expect(explicitFrameRosterId(frame)).toBeUndefined();
    expect(collectPremiumRosterIds(base({ frame }))).toEqual(['thin-gold']);
    // same rule on plates: a basic plate id (slab) never validates as explicit identity
    expect(explicitPlateRosterId({ shape: 'slab', cosmeticId: 'slab' })).toBeUndefined();
  });

  it('a mismatched/unknown frame cosmeticId falls back to inference (never trusted blind)', () => {
    // kind mismatch — brass-ultimate is not a frame of kind thin-line
    expect(explicitFrameRosterId({ kind: 'thin-line', cosmeticId: 'brass-ultimate' })).toBeUndefined();
    // unknown id → inference: thin-line at the GOLD colour is thin-gold
    expect(
      collectPremiumRosterIds(base({ frame: { kind: 'thin-line', color: '#e8c14a', width: 0.045, cosmeticId: 'nope' } })),
    ).toEqual(['thin-gold']);
  });

  it('an ultimate plate resolves as ITSELF and REPLACES the shape ref (never also its base SKU)', () => {
    const comp = base({
      nameplate: { shape: 'brass', fontId: 'clean-sans', title: 'X', plate: '#3a86ff', ink: '#fff', size: 0.05, cosmeticId: 'brass-ultimate' },
    });
    expect(collectPremiumRosterIds(comp)).toEqual(['brass-ultimate']);
    expect(explicitPlateRosterId(comp.nameplate)).toBe('brass-ultimate');
  });

  it('a shape-mismatched plate cosmeticId falls back to the shape ref (base brass)', () => {
    const comp = base({
      nameplate: { shape: 'brass', fontId: 'clean-sans', title: 'X', plate: '#000', ink: '#fff', size: 0.05, cosmeticId: 'marquee-ultimate' },
    });
    expect(collectPremiumRosterIds(comp)).toEqual(['brass']);
  });

  it('SCRIPT ULTIMATE rides fontId directly — the fontId IS the cosmetic id', () => {
    const comp = base({
      nameplate: { shape: 'slab', fontId: 'pacifico-ultimate', title: 'X', plate: '#000', ink: '#0f0', size: 0.05 },
    });
    expect(collectPremiumRosterIds(comp)).toEqual(['pacifico-ultimate']);
  });

  it('the reconcile prices a recoloured unowned ultimate design at the 10-PX band', () => {
    const comp = base({
      frame: { kind: 'marquee', color: '#12e0b8', width: 0.045, cosmeticId: 'marquee-ultimate' },
      nameplate: { shape: 'brass', fontId: 'pacifico-ultimate', title: 'X', plate: '#12e0b8', ink: '#0f0', size: 0.05, cosmeticId: 'brass-ultimate' },
    });
    const s = premiumStatusOf(comp, ULTIMATE_LIB);
    expect(s.unowned.map((r) => r.cosmeticId).sort()).toEqual(['brass-ultimate', 'marquee-ultimate', 'pacifico-ultimate']);
    expect(s.costStack).toBe(30);
  });
});
