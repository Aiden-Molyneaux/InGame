import { collectPremiumRosterIds, premiumStatusOf, resolvePremiumRefs } from './premium';
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
    expect(refs[0]).toEqual({ cosmeticId: 'frost', name: 'FROST', type: 'effect', price: 8, owned: false });
    expect(refs[1]).toEqual({ cosmeticId: 'mystery', name: 'MYSTERY', type: 'frame', price: 0, owned: false });
  });
});
