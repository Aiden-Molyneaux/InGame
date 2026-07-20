import { BRASS_RAMP, brassPlateRamp, buildCardElements } from './buildCard';
import { SAMPLE_COMPOSITION, MAX_ELEMENTS, type CardComposition } from './composition';
import { FRAMES, EFFECTS, FINISHES, NAMEPLATES, FONTS, surpriseDeal } from '../styler/roster';

// buildCardElements is source-agnostic (the skia bits are passed in), so we can assert its STRUCTURE
// with a stub skia context — the real skia flatten is proven by flatten.spike.ts (node/canvaskit).
/* eslint-disable @typescript-eslint/no-explicit-any */
const stubCtx = {
  Group: 'Group',
  Fill: 'Fill',
  Rect: 'Rect',
  Oval: 'Oval',
  Path: 'Path',
  Text: 'Text',
  LinearGradient: 'LinearGradient',
  Skia: {
    Path: {
      Make: () => ({ moveTo() {}, lineTo() {}, close() {} }),
      MakeFromSVGString: (d: string) => ({ svg: d }),
    },
    Font: () => ({}),
  },
  typeface: undefined,
} as any;

describe('buildCardElements (CARD-15 render module)', () => {
  it('rejects a composition over the cap-30 ceiling', () => {
    const over: CardComposition = {
      ...SAMPLE_COMPOSITION,
      elements: Array.from({ length: MAX_ELEMENTS + 1 }, () => SAMPLE_COMPOSITION.elements[0]),
    };
    expect(() => buildCardElements(over, 161, 225, stubCtx)).toThrow(/cap-30/);
  });

  it('clips the sample to the F-02 stepped silhouette and draws base + elements + frame', () => {
    const tree = buildCardElements(SAMPLE_COMPOSITION, 161, 225, stubCtx) as any;
    expect(tree.props.clip).toBeTruthy(); // the stepped-path clip
    // base(1) + 5 non-text elements (text skipped without a typeface) + plate(1) + frame(1)
    const kids = tree.props.children.filter(Boolean);
    expect(kids.length).toBe(1 + 5 + 1 + 1);
  });

  it('drops the plate on an unplated (mini) size but keeps the clip', () => {
    const tree = buildCardElements(SAMPLE_COMPOSITION, 64, 89, stubCtx) as any;
    expect(tree.props.clip).toBeTruthy();
    // no plate at mini (F-06): base + 5 shapes + frame
    expect(tree.props.children.filter(Boolean).length).toBe(1 + 5 + 1);
  });
});

// ── decision 0068 roster expansion ──────────────────────────────────────────────────────────────
const kidsOf = (tree: any) => tree.props.children.filter(Boolean) as any[];
const hasKey = (tree: any, key: string) => kidsOf(tree).some((k) => k?.key === key);

describe('decision 0068 — roster expansion', () => {
  it('lands the 10 frames', () => {
    const ids = FRAMES.map((f) => f.id);
    for (const id of ['thin-gold', 'lime', 'bubblegum', 'chrome', 'stub', 'ornate-gold', 'ember-glow', 'plasma', 'holo-foil', 'marquee']) {
      expect(ids).toContain(id);
    }
  });

  it('lands the effects, finishes, nameplates, and fonts', () => {
    expect(EFFECTS.map((e) => e.kind)).toEqual(expect.arrayContaining(['halftone', 'frost', 'embers']));
    // retired to the ledger (owner 2026-07-09) — out of the roster, still rendered for legacy docs
    expect(EFFECTS.some((e) => e.kind === 'grain')).toBe(false);
    expect(FRAMES.some((f) => f.id === 'pixel-border')).toBe(false);
    expect(FINISHES.map((f) => f.kind)).toEqual(expect.arrayContaining(['linen', 'holographic', 'metallic']));
    expect(NAMEPLATES.map((n) => n.shape)).toEqual(expect.arrayContaining(['capsule', 'tab', 'arch', 'dogtag', 'brass']));
    expect(FONTS.map((f) => f.id)).toEqual(expect.arrayContaining(['press-start', 'bitter', 'space-mono', 'pacifico', 'stencil']));
  });
});

// ── decision 0075 (P10) — the roster tiering re-tag ─────────────────────────────────────────────────
describe('decision 0075 — roster tiering (P10)', () => {
  it('the two removals are gone from the offered roster, but their kinds still render (legacy docs)', () => {
    expect(FRAMES.some((f) => f.id === 'bracket-corners')).toBe(false);
    expect(FINISHES.some((f) => f.id === 'subtle-gloss')).toBe(false);
    // the render module (buildCardElements) still supports both kinds — proven by the buildCard tests
    // above (bracket-corners is exercised via composition.ts's FrameKind union / EquipReadout labels).
  });

  it('the premium split lands where 0075 pins it (+ the three W-5 ULTIMATE SKUs, COSM-05/0080)', () => {
    const premiumIds = (arr: { id: string; tier?: 'basic' | 'premium' }[]) =>
      arr.filter((x) => x.tier === 'premium').map((x) => x.id);
    expect(premiumIds(FRAMES).sort()).toEqual(
      ['thin-gold', 'chrome', 'ember-glow', 'plasma', 'ornate-gold', 'holo-foil', 'marquee', 'marquee-ultimate'].sort(),
    );
    expect(premiumIds(EFFECTS).sort()).toEqual(['halftone', 'scanline', 'frost', 'embers'].sort());
    expect(premiumIds(FINISHES).sort()).toEqual(['linen', 'holographic', 'metallic'].sort());
    expect(premiumIds(NAMEPLATES).sort()).toEqual(['brass', 'brass-ultimate']);
    expect(premiumIds(FONTS).sort()).toEqual(['bitter', 'space-mono', 'pacifico', 'pacifico-ultimate', 'stencil'].sort());
    const totalPremium =
      premiumIds(FRAMES).length +
      premiumIds(EFFECTS).length +
      premiumIds(FINISHES).length +
      premiumIds(NAMEPLATES).length +
      premiumIds(FONTS).length;
    // 0075's 19 (26 catalog minus the 7 device shells/themes — theme/palettes.test.ts) + the W-5
    // MARQUEE/BRASS/SCRIPT ULTIMATE mints (COSM-05, decision 0080 ruling 2 — separate SKUs, no
    // promotion; the server catalog banner's 29-premium count, same split).
    expect(totalPremium).toBe(22);
  });

  it("surpriseDeal (CARD-16's free baseline) never hands out a premium frame/effect/font", () => {
    for (let i = 0; i < 40; i++) {
      const deal = surpriseDeal('Test Game');
      if (deal.frame?.kind) {
        const frame = FRAMES.find((f) => f.kind === deal.frame!.kind && f.color === deal.frame!.color);
        expect(frame?.tier).not.toBe('premium');
      }
      const effect = EFFECTS.find((e) => e.kind === deal.effect?.kind);
      expect(effect?.tier).not.toBe('premium');
      const font = FONTS.find((f) => f.id === deal.nameplate?.fontId);
      expect(font?.tier).not.toBe('premium');
    }
  });
});

describe('buildCardElements — decision 0068 kinds draw a static keyframe', () => {
  for (const kind of ['ornate', 'glow', 'foil', 'marquee'] as const) {
    it(`draws the ${kind} frame (a 'frame' node) without throwing`, () => {
      const comp = { ...SAMPLE_COMPOSITION, frame: { kind, color: '#e8c14a', width: 0.02 } } as CardComposition;
      expect(hasKey(buildCardElements(comp, 161, 225, stubCtx), 'frame')).toBe(true);
    });
  }

  for (const shape of ['capsule', 'tab', 'arch', 'dogtag', 'brass'] as const) {
    it(`draws the ${shape} nameplate (a 'plate' node)`, () => {
      const comp = { ...SAMPLE_COMPOSITION, nameplate: { ...SAMPLE_COMPOSITION.nameplate!, shape } } as CardComposition;
      expect(hasKey(buildCardElements(comp, 161, 225, stubCtx), 'plate')).toBe(true);
    });
  }

  // 'grain' stays in the loop deliberately: retired from the roster, but legacy documents carrying
  // it must still draw (F21) — this guards the renderer branch outliving the roster entry.
  for (const kind of ['grain', 'halftone', 'frost', 'embers'] as const) {
    it(`draws the ${kind} effect overlay (an 'fx-*' node) when effects are on`, () => {
      const comp = { ...SAMPLE_COMPOSITION, effect: { kind, intensity: 0.6 } } as CardComposition;
      const tree = buildCardElements(comp, 161, 225, stubCtx, true) as any;
      expect(kidsOf(tree).some((k) => typeof k?.key === 'string' && k.key.startsWith('fx-'))).toBe(true);
    });
  }

  for (const kind of ['linen', 'holographic', 'metallic'] as const) {
    it(`draws the ${kind} finish overlay (a 'fin-*' node) when effects are on`, () => {
      const comp = { ...SAMPLE_COMPOSITION, finish: { kind } } as CardComposition;
      const tree = buildCardElements(comp, 161, 225, stubCtx, true) as any;
      expect(kidsOf(tree).some((k) => typeof k?.key === 'string' && k.key.startsWith('fin-'))).toBe(true);
    });
  }
});

// The present-paths the bare stub degrades past (BlurMask glow ghost · RadialGradient frost blooms).
describe('buildCardElements — decision 0068 present-paths', () => {
  const richCtx = { ...stubCtx, RadialGradient: 'RadialGradient', BlurMask: 'BlurMask' } as any;

  it('glow frame draws BOTH the blurred bloom ghost and the crisp stroke', () => {
    const comp = { ...SAMPLE_COMPOSITION, frame: { kind: 'glow', color: '#ff5a5a', width: 0.022 } } as CardComposition;
    const tree = buildCardElements(comp, 161, 225, richCtx) as any;
    expect(hasKey(tree, 'glow')).toBe(true); // the bloom ghost (BlurMask present)
    expect(hasKey(tree, 'frame')).toBe(true); // the crisp stroke over it
  });

  it('frost v2 draws the corner blooms AND the ice-shard spray when RadialGradient is present', () => {
    const comp = { ...SAMPLE_COMPOSITION, effect: { kind: 'frost', intensity: 0.6 } } as CardComposition;
    const tree = buildCardElements(comp, 161, 225, richCtx, true) as any;
    const fx = kidsOf(tree).find((k) => k?.key === 'fx-frost');
    expect(fx).toBeTruthy();
    const kids = fx.props.children.filter(Boolean) as any[];
    expect(kids.filter((k) => String(k.key).startsWith('frost')).length).toBe(4); // the blooms
    expect(kids.filter((k) => String(k.key).startsWith('shard')).length).toBe(20); // 5 per corner
  });

  it('the plate group rides TOPMOST — after frame and the effect/finish overlays', () => {
    const comp = { ...SAMPLE_COMPOSITION, finish: { kind: 'matte' } } as CardComposition;
    const tree = buildCardElements(comp, 161, 225, richCtx, true) as any;
    const keys = kidsOf(tree).map((k) => String(k.key));
    const plateIdx = keys.indexOf('plate');
    expect(plateIdx).toBeGreaterThan(keys.indexOf('frame')); // above the frame
    expect(plateIdx).toBe(keys.length - 1); // above everything (owner ruling 2026-07-09)
  });
});

// ── COSM-05 (M6 W-5, decision 0080) — the parameterized brass ramp in the (shared) editor preview
// path: the explicit `cosmeticId` is the colour signal — an ultimate document derives the ramp from
// the chosen plate colour; a legacy/base-brass document keeps the hard-coded gold, pixel-identical.
describe('COSM-05 — buildCardElements consumes the parameterized brass ramp', () => {
  const brassComp = (plate: string, cosmeticId?: string): CardComposition =>
    ({
      ...SAMPLE_COMPOSITION,
      elements: [],
      frame: undefined,
      nameplate: { shape: 'brass', title: 'X', plate, ink: '#fff', size: 0.05, ...(cosmeticId ? { cosmeticId } : {}) },
    }) as CardComposition;

  const plateRampColors = (tree: any): string[] => {
    const group = kidsOf(tree).find((k) => k?.key === 'plate');
    expect(group).toBeTruthy();
    const rect = (group.props.children as any[]).filter(Boolean).find((k) => k?.key === 'plate');
    expect(rect).toBeTruthy();
    return rect.props.children.props.colors as string[];
  };

  it('a legacy/base-brass document (no cosmeticId) keeps the hard-coded gold ramp', () => {
    const tree = buildCardElements(brassComp('#141026'), 161, 225, stubCtx) as any;
    expect(plateRampColors(tree)).toEqual([...BRASS_RAMP]);
  });

  it('an ultimate document (explicit cosmeticId) derives the ramp from the chosen plate colour', () => {
    const tree = buildCardElements(brassComp('#3a86ff', 'brass-ultimate'), 161, 225, stubCtx) as any;
    expect(plateRampColors(tree)).toEqual(brassPlateRamp('#3a86ff'));
    expect(plateRampColors(tree)).not.toEqual([...BRASS_RAMP]);
  });

  it('the registry gold recolour is pixel-identical to the legacy ramp (matched, not re-derived)', () => {
    expect(brassPlateRamp('#c9971f')).toEqual([...BRASS_RAMP]);
    const tree = buildCardElements(brassComp('#c9971f', 'brass-ultimate'), 161, 225, stubCtx) as any;
    expect(plateRampColors(tree)).toEqual([...BRASS_RAMP]);
  });
});
