import { compositionSchema } from '@ingame/shared';
import type { CardComposition, CardElement } from '../render/composition';
import { ESSENTIAL_ICONS } from '../render/icons';
import {
  BACKDROPS,
  BASE_GRADIENTS,
  DEFAULT_BASE,
  EMBLEMS,
  START_SOURCES,
  TITLE_LAYOUTS,
  composeDeal,
  dealPlan,
  structureTones,
  surpriseDeal,
  tonesFromBase,
  type StructureZone,
} from './roster';
import { collectPremiumRosterIds, premiumStatusOf } from './premium';

// W-6 structural rebuild (2026-07-21, attempt three) — start-froms are STRUCTURAL SKELETONS
// (backdrops / title layouts / emblem starts) and SURPRISE ME became DEAL A CARD (one backdrop +
// one title layout + one emblem — or deliberately none — composed under zone rules). The owner
// invariants under test: (1) every start-from + every deal is SCHEMA-VALID and opens with a ZERO
// cost-stack (free-only — never a premium debt the user didn't choose); (2) colours are structure,
// not a palette sale — every fill/stroke is base-derived or the neutral cream; (3) a dealt emblem
// NEVER collides with the title layout's text zones; (4) deals are deterministic per seed and reach
// every structure across seeds.

// A tiny seeded PRNG (mulberry32) so the pure combo logic is deterministic under test.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const schemaValid = (c: CardComposition) => compositionSchema.safeParse(c).success;

// The whole allowed colour vocabulary: the default base gradient's stops + its derived structural
// tones (raise/raiseHi/shade) + the neutral cream line. Anything else is a palette sale — vetoed.
const TONES = structureTones(BASE_GRADIENTS[0]!);
const VOCAB = new Set([...BASE_GRADIENTS[0]!, TONES.raise, TONES.raiseHi, TONES.shade, TONES.line]);

const ICON_IDS = new Set(ESSENTIAL_ICONS.map((i) => i.id));

function assertStructuralColours(elements: CardElement[]) {
  for (const el of elements) {
    expect(VOCAB.has(el.fill)).toBe(true);
    const stroke = (el as { stroke?: { color: string } }).stroke;
    if (stroke) expect(VOCAB.has(stroke.color)).toBe(true);
  }
}

/** Axis-aligned bbox of a box-type element (text excluded — emblems build only box elements). */
function bboxOf(el: CardElement): { x0: number; y0: number; x1: number; y1: number } | null {
  if (el.type === 'text') return null;
  return { x0: el.x - el.w / 2, y0: el.y - el.h / 2, x1: el.x + el.w / 2, y1: el.y + el.h / 2 };
}
const intersects = (a: StructureZone, b: StructureZone) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe('structural start-froms — all valid, all free (zero cost-stack)', () => {
  it.each(START_SOURCES.map((s) => [s.name, s] as const))('%s composes a schema-valid, zero-cost card', (_name, s) => {
    const comp = s.compose('Some Game');
    expect(schemaValid(comp)).toBe(true);
    // free-only: no premium roster ids referenced, so the reconcile cost-stack is 0
    expect(collectPremiumRosterIds(comp)).toEqual([]);
    expect(premiumStatusOf(comp, undefined).costStack).toBe(0);
    // structure, not chrome: no frame/effect/finish is stamped on (the chrome stays the user's)
    expect(comp.frame).toBeUndefined();
    expect(comp.effect).toBeUndefined();
    expect(comp.finish).toBeUndefined();
    // never a blank canvas for the structures (DEFAULT is the intentional plain floor)
    if (s.kindLabel !== 'DEFAULT') {
      expect(comp.elements.length).toBeGreaterThan(0);
      // hand-editing budget — no grouping exists, so a template stays ≤ 6 elements
      expect(comp.elements.length).toBeLessThanOrEqual(6);
      // colours are base-derived + cream only — structure is the offer, not a palette
      assertStructuralColours(comp.elements);
      // every scaffold element is labelled for the layers rack (CARD-08 name)
      for (const el of comp.elements) expect((el as { name?: string }).name).toBeTruthy();
    }
    // the title is the game title, uppercased (CARD-11)
    expect(comp.nameplate?.title).toBe('SOME GAME');
  });

  it('the fan is DEFAULT first → structures → title layouts → emblems (walk-4 P5-c; 6–9 strong options)', () => {
    const labels = START_SOURCES.map((s) => s.kindLabel);
    expect(labels).toEqual([
      'DEFAULT',
      ...BACKDROPS.map(() => 'BACKDROP'),
      ...TITLE_LAYOUTS.map(() => 'TITLE'),
      ...EMBLEMS.map(() => 'EMBLEM'),
    ]);
    const curated = START_SOURCES.filter((s) => s.kindLabel !== 'DEFAULT');
    expect(curated.length).toBeGreaterThanOrEqual(6);
    expect(curated.length).toBeLessThanOrEqual(9);
    expect(START_SOURCES[0]!.id).toBe('default');
  });

  it('every icon a template or deal can reference exists in ESSENTIAL_ICONS', () => {
    // templates
    for (const s of START_SOURCES) {
      for (const el of s.compose('G').elements) {
        if (el.type === 'icon') expect(ICON_IDS.has(el.iconId)).toBe(true);
      }
    }
    // deals (the glyph pools)
    for (let seed = 1; seed <= 64; seed++) {
      for (const el of surpriseDeal('G', mulberry32(seed)).elements) {
        if (el.type === 'icon') expect(ICON_IDS.has(el.iconId)).toBe(true);
      }
    }
  });

  it('title-layout text pre-fills with the game title and fits the face at any length', () => {
    for (const layout of TITLE_LAYOUTS) {
      const long = layout.build(TONES, 'The Legend of the Extremely Long Subtitle Edition');
      for (const el of long) {
        if (el.type !== 'text') continue;
        expect(el.text.length).toBeLessThanOrEqual(64); // schema cap
        // approx rendered width must stay on the face (the renderer's CHAR_W · aspect math)
        const span = el.text.length * el.size * 0.58 * 1.244;
        expect(span).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('dealPlan / composeDeal — DEAL A CARD (coherent, free, zone-safe, deterministic)', () => {
  it('is deterministic for a given rng seed', () => {
    for (const seed of [1, 7, 42, 1234]) {
      expect(surpriseDeal('Game', mulberry32(seed))).toEqual(surpriseDeal('Game', mulberry32(seed)));
      expect(dealPlan(mulberry32(seed))).toEqual(dealPlan(mulberry32(seed)));
    }
  });

  it('every deal (200 seeds) is schema-valid, free-only, colour-coherent, and within budget', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const deal = surpriseDeal('Test Game', mulberry32(seed));
      expect(schemaValid(deal)).toBe(true);
      // the premium-in-deal rule is: NEVER
      expect(collectPremiumRosterIds(deal)).toEqual([]);
      expect(premiumStatusOf(deal, undefined).costStack).toBe(0);
      expect(deal.frame).toBeUndefined();
      expect(deal.effect).toBeUndefined();
      expect(deal.finish).toBeUndefined();
      // one composed hand: backdrop (≥1) + title layout (≥2) always; ≤ 9 keeps hand-editing sane
      expect(deal.elements.length).toBeGreaterThanOrEqual(3);
      expect(deal.elements.length).toBeLessThanOrEqual(9);
      assertStructuralColours(deal.elements);
      expect(deal.nameplate?.title).toBe('TEST GAME');
    }
  });

  it('zone rule — a dealt emblem never intersects the title layout\'s text zones (200 seeds)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const plan = dealPlan(mulberry32(seed));
      if (!plan.emblemId) continue;
      const layout = TITLE_LAYOUTS.find((l) => l.id === plan.layoutId)!;
      const emblem = EMBLEMS.find((e) => e.id === plan.emblemId)!;
      const els = emblem.build(TONES, plan.place!, plan.glyphs!);
      for (const el of els) {
        const box = bboxOf(el);
        expect(box).toBeTruthy(); // emblems build box elements only (the envelope contract)
        // stays inside the declared envelope [place ± w/2] the slots are sized against…
        expect(box!.x0).toBeGreaterThanOrEqual(plan.place!.x - plan.place!.w / 2 - 1e-9);
        expect(box!.x1).toBeLessThanOrEqual(plan.place!.x + plan.place!.w / 2 + 1e-9);
        expect(box!.y0).toBeGreaterThanOrEqual(plan.place!.y - plan.place!.w / 2 - 1e-9);
        expect(box!.y1).toBeLessThanOrEqual(plan.place!.y + plan.place!.w / 2 + 1e-9);
        // …and never crosses a text zone
        for (const zone of layout.textZones) {
          expect(intersects(box!, zone)).toBe(false);
        }
        // and stays on the face (the plate band sits below y=1 of element space)
        expect(box!.y0).toBeGreaterThanOrEqual(0);
        expect(box!.y1).toBeLessThanOrEqual(1);
      }
    }
  });

  it('z-order is sane: backdrop elements lead, title text rides topmost', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const plan = dealPlan(mulberry32(seed));
      const deal = composeDeal(plan, 'G');
      const backdrop = BACKDROPS.find((b) => b.id === plan.backdropId)!;
      const layout = TITLE_LAYOUTS.find((l) => l.id === plan.layoutId)!;
      const nBack = backdrop.build(TONES).length;
      const nTitle = layout.build(TONES, 'G').length;
      // the first nBack elements are the backdrop's, the last nTitle are the layout's
      const backNames = backdrop.build(TONES).map((e) => (e as { name?: string }).name);
      const titleNames = layout.build(TONES, 'G').map((e) => (e as { name?: string }).name);
      expect(deal.elements.slice(0, nBack).map((e) => (e as { name?: string }).name)).toEqual(backNames);
      expect(deal.elements.slice(-nTitle).map((e) => (e as { name?: string }).name)).toEqual(titleNames);
    }
  });

  it('reaches every backdrop, layout, emblem AND the emblem-free hand across 200 seeds', () => {
    const backdrops = new Set<string>();
    const layouts = new Set<string>();
    const emblems = new Set<string>();
    let emblemFree = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const plan = dealPlan(mulberry32(seed));
      backdrops.add(plan.backdropId);
      layouts.add(plan.layoutId);
      if (plan.emblemId) emblems.add(plan.emblemId);
      else emblemFree++;
    }
    expect(backdrops.size).toBe(BACKDROPS.length);
    expect(layouts.size).toBe(TITLE_LAYOUTS.length);
    expect(emblems.size).toBe(EMBLEMS.length);
    expect(emblemFree).toBeGreaterThan(0); // the deliberately-quiet hand is a real outcome
  });
});

// The approved-design gap (Murr) — structural tones must follow the CURRENT base, not a fixed indigo.
// `structureTones(gradient)` was parameterized but every compose site used the default, so every
// template rendered indigo-derived panels regardless of the user's base. These lock the base-derived
// contract at compose time for the fan, template APPLY, and DEAL — and that the free/zone/cost
// invariants above hold with a VARIED base.
describe('base-derived tones — the fan / deal follow the CURRENT base', () => {
  const EMBER = { gradient: BASE_GRADIENTS[1]! } as const; // a non-default gradient base (warm coal)
  const SOLID = { fill: '#3a5f8a' } as const; // a solid base — derives from its single fill
  const DEFAULT_TONES = tonesFromBase(DEFAULT_BASE);
  const EMBER_TONES = tonesFromBase(EMBER);

  /** The allowed colour vocabulary for a given base: its stops + derived tones + the neutral cream. */
  function vocabFor(base: CardComposition['base']): Set<string> {
    const stops = 'gradient' in base ? base.gradient : ([base.fill, base.fill] as [string, string]);
    const t = structureTones(stops);
    return new Set([...stops, t.raise, t.raiseHi, t.shade, t.line]);
  }
  function assertColoursIn(elements: CardElement[], vocab: Set<string>) {
    for (const el of elements) {
      expect(vocab.has(el.fill)).toBe(true);
      const stroke = (el as { stroke?: { color: string } }).stroke;
      if (stroke) expect(vocab.has(stroke.color)).toBe(true);
    }
  }

  it('tonesFromBase derives raise/raiseHi/shade from the base stops; cream line is base-independent', () => {
    // a different gradient base yields DIFFERENT structural tones (not the indigo default)…
    expect(EMBER_TONES.raise).not.toBe(DEFAULT_TONES.raise);
    expect(EMBER_TONES.raiseHi).not.toBe(DEFAULT_TONES.raiseHi);
    expect(EMBER_TONES.shade).not.toBe(DEFAULT_TONES.shade);
    // …and matches the direct structureTones of the base's stops (the derived-from relationship)
    expect(EMBER_TONES).toEqual(structureTones(BASE_GRADIENTS[1]!));
    // …while the cream hairline/text tone stays constant across bases
    expect(EMBER_TONES.line).toBe(DEFAULT_TONES.line);
    // a SOLID base derives from its single fill used for BOTH stops (raise lightens, shade darkens)
    expect(tonesFromBase(SOLID)).toEqual(structureTones([SOLID.fill, SOLID.fill]));
  });

  it('a start-from composed on a non-default base seats that base and derives its panel fills from it', () => {
    const backdrop = START_SOURCES.find((s) => s.id === 'diagonal-split')!;
    const onEmber = backdrop.compose('Some Game', EMBER);
    const onDefault = backdrop.compose('Some Game', DEFAULT_BASE);
    // the composition carries the chosen base…
    expect(onEmber.base).toEqual(EMBER);
    // …the SPLIT PANEL derives from the EMBER raise tone, NOT the default (indigo) raise
    const panel = onEmber.elements.find((e) => (e as { name?: string }).name === 'SPLIT PANEL')!;
    expect(panel.fill).toBe(EMBER_TONES.raise);
    expect(panel.fill).not.toBe(DEFAULT_TONES.raise);
    // every fill stays inside the EMBER structural vocabulary (base-derived + cream only)
    assertColoursIn(onEmber.elements, vocabFor(EMBER));
    // and the same template on the default base differs — proof the fill tracks the base, not a constant
    expect(onEmber.elements.map((e) => e.fill)).not.toEqual(onDefault.elements.map((e) => e.fill));
  });

  it('DEAL derives its tones from the passed base (backdrop panel is base-derived, not indigo)', () => {
    for (const seed of [1, 7, 42, 1234]) {
      const deal = surpriseDeal('Test Game', mulberry32(seed), EMBER);
      expect(deal.base).toEqual(EMBER);
      assertColoursIn(deal.elements, vocabFor(EMBER));
      // the leading backdrop element is a raise/shade panel (never cream) — so it MUST have moved off
      // the default vocabulary onto the ember one (base stops + raise/shade are disjoint across bases)
      expect(vocabFor(DEFAULT_BASE).has(deal.elements[0]!.fill)).toBe(false);
    }
  });

  it('composeDeal with a SOLID base stays schema-valid, free, and colour-coherent to that fill', () => {
    const plan = dealPlan(mulberry32(99));
    const deal = composeDeal(plan, 'Solid Game', SOLID);
    expect(deal.base).toEqual(SOLID);
    expect(schemaValid(deal)).toBe(true);
    expect(collectPremiumRosterIds(deal)).toEqual([]);
    assertColoursIn(deal.elements, vocabFor(SOLID));
  });

  it('the 200-seed free/schema/colour invariants hold with a VARIED (ember) base', () => {
    const emberVocab = vocabFor(EMBER);
    for (let seed = 1; seed <= 200; seed++) {
      const deal = surpriseDeal('Test Game', mulberry32(seed), EMBER);
      expect(schemaValid(deal)).toBe(true);
      expect(collectPremiumRosterIds(deal)).toEqual([]); // free-only, unchanged by the base
      expect(premiumStatusOf(deal, undefined).costStack).toBe(0);
      expect(deal.base).toEqual(EMBER);
      assertColoursIn(deal.elements, emberVocab);
    }
  });

  it('the zone rule is colour-independent — a varied base leaves emblem/text geometry intact', () => {
    // colours changed, geometry did not: the plan (and thus every zone/place) is identical regardless
    // of the base, so the 200-seed zone proof above still governs. Assert the plan invariance directly.
    for (const seed of [3, 55, 128, 199]) {
      const plan = dealPlan(mulberry32(seed));
      const onEmber = composeDeal(plan, 'G', EMBER);
      const onDefault = composeDeal(plan, 'G', DEFAULT_BASE);
      // same element COUNT + same geometry (x/y/w/h), only fills differ
      expect(onEmber.elements.length).toBe(onDefault.elements.length);
      onEmber.elements.forEach((e, i) => {
        const d = onDefault.elements[i]!;
        if (e.type !== 'text' && d.type !== 'text') {
          expect([e.x, e.y, e.w, e.h]).toEqual([d.x, d.y, d.w, d.h]);
        }
      });
    }
  });
});
