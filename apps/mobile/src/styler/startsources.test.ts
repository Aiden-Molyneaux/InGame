import { compositionSchema } from '@ingame/shared';
import type { CardComposition } from '../render/composition';
import { FRAMES, PALETTES, START_SOURCES, startSourcesFor, surpriseDeal } from './roster';
import { collectPremiumRosterIds, premiumStatusOf } from './premium';

// W-6 taste pass (2026-07-20) — the curated start-from families + the coherent SURPRISE deal.
// The two invariants the owner asked for: (1) every start-from + every surprise is SCHEMA-VALID and
// opens with a ZERO cost-stack (free-only — never a premium debt the user didn't choose); (2) a
// surprise deal is COHERENT — every output belongs to a single curated palette family (element fills
// drawn from that family's accents + gradient, and the chrome is that family's).

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

/** Which curated family a composition belongs to (the gradient is unique per family). */
const familyOf = (c: CardComposition) =>
  'gradient' in c.base ? PALETTES.find((p) => p.gradient[0] === (c.base as { gradient: [string, string] }).gradient[0] && p.gradient[1] === (c.base as { gradient: [string, string] }).gradient[1]) : undefined;

describe('start-from options — all valid, all free (zero cost-stack)', () => {
  it.each(START_SOURCES.map((s) => [s.name, s] as const))('%s composes a schema-valid, zero-cost card', (_name, s) => {
    const comp = s.compose('Some Game');
    expect(schemaValid(comp)).toBe(true);
    // free-only: no premium roster ids referenced, so the reconcile cost-stack is 0
    expect(collectPremiumRosterIds(comp)).toEqual([]);
    expect(premiumStatusOf(comp, undefined).costStack).toBe(0);
    // never a blank canvas for the curated families (DEFAULT is the intentional plain floor)
    if (s.kindLabel !== 'DEFAULT') expect(comp.elements.length).toBeGreaterThan(0);
    // the title is the game title, uppercased (CARD-11)
    expect(comp.nameplate?.title).toBe('SOME GAME');
  });

  it('there are 4–8 curated options plus DEFAULT (strong beats many-weak)', () => {
    const curated = START_SOURCES.filter((s) => s.kindLabel !== 'DEFAULT');
    expect(curated.length).toBeGreaterThanOrEqual(4);
    expect(curated.length).toBeLessThanOrEqual(8);
    expect(START_SOURCES[START_SOURCES.length - 1]!.id).toBe('default');
  });
});

describe('startSourcesFor — genre-aware ordering', () => {
  it('leads with EMBER for Horror, HORIZON for Racing (case-insensitive)', () => {
    expect(startSourcesFor([{ name: 'Horror' }])[0]!.id).toBe('ember');
    expect(startSourcesFor([{ name: 'horror' }])[0]!.id).toBe('ember');
    expect(startSourcesFor([{ name: 'Racing' }])[0]!.id).toBe('horizon');
    expect(startSourcesFor([{ name: 'Puzzle' }])[0]!.id).toBe('grove'); // grove lists puzzle before monolith (curated tie order)
  });

  it('an unmatched / empty genre set keeps the curated order, DEFAULT always last', () => {
    const none = startSourcesFor([]);
    expect(none.map((s) => s.id)).toEqual(START_SOURCES.map((s) => s.id));
    expect(startSourcesFor([{ name: 'Nonexistent' }])[startSourcesFor([]).length - 1]!.id).toBe('default');
    // DEFAULT is never bubbled up by any genre
    for (const g of ['Horror', 'Racing', 'RPG', 'Puzzle', 'Fighting']) {
      expect(startSourcesFor([{ name: g }]).at(-1)!.id).toBe('default');
    }
  });

  it('every reordering is a permutation — no option is dropped', () => {
    const base = new Set(START_SOURCES.map((s) => s.id));
    for (const g of ['Horror', 'Racing', 'Simulation', 'Strategy']) {
      expect(new Set(startSourcesFor([{ name: g }]).map((s) => s.id))).toEqual(base);
    }
  });
});

describe('surpriseDeal — coherent, free-tier, deterministic', () => {
  it('is deterministic for a given rng seed', () => {
    const a = surpriseDeal('Game', mulberry32(42));
    const b = surpriseDeal('Game', mulberry32(42));
    expect(a).toEqual(b);
  });

  it('every deal is schema-valid, free-only (zero cost-stack), and coherent to ONE family', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const deal = surpriseDeal('Test Game', mulberry32(seed));

      // schema-valid + free-only (the premium-in-surprise rule is: NEVER)
      expect(schemaValid(deal)).toBe(true);
      expect(collectPremiumRosterIds(deal)).toEqual([]);
      expect(premiumStatusOf(deal, undefined).costStack).toBe(0);

      // coherent: the deal belongs to a single curated family…
      const fam = familyOf(deal);
      expect(fam).toBeTruthy();
      if (!fam) continue;

      // …every element fill (and any stroke colour) is from that family's vocabulary (accents + gradient)
      const allowed = new Set([...fam.gradient, ...fam.accents]);
      expect(deal.elements.length).toBeGreaterThan(0);
      for (const el of deal.elements) {
        expect(allowed.has(el.fill)).toBe(true);
        const stroke = (el as { stroke?: { color: string } }).stroke;
        if (stroke) expect(allowed.has(stroke.color)).toBe(true);
      }

      // …and the chrome is the family's: ink, plate shape, font, frame, effect kind
      expect(deal.nameplate?.ink).toBe(fam.ink);
      expect(deal.nameplate?.shape).toBe(fam.plateShape);
      expect(deal.nameplate?.fontId).toBe(fam.fontId);
      if (fam.frameId) {
        const fr = FRAMES.find((f) => f.id === fam.frameId)!;
        expect(deal.frame).toMatchObject({ kind: fr.kind, color: fr.color });
      } else {
        expect(deal.frame).toBeUndefined();
      }
      expect(deal.effect?.kind).toBe(fam.effect?.kind);
    }
  });

  it('reaches every family across seeds (not stuck on one)', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const fam = familyOf(surpriseDeal('G', mulberry32(seed)));
      if (fam) seen.add(fam.id);
    }
    expect(seen.size).toBe(PALETTES.length);
  });
});
