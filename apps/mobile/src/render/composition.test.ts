import { buildCardElements } from './buildCard';
import { SAMPLE_COMPOSITION, MAX_ELEMENTS, type CardComposition } from './composition';
import { FRAMES, EFFECTS, FINISHES, NAMEPLATES, FONTS } from '../styler/roster';

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
  it('lands the 10 frames, all basic tier', () => {
    const ids = FRAMES.map((f) => f.id);
    for (const id of ['thin-gold', 'lime', 'bubblegum', 'chrome', 'stub', 'ornate-gold', 'ember-glow', 'plasma', 'holo-foil', 'marquee']) {
      expect(ids).toContain(id);
    }
    // everything ships basic-now (the entitlement gate is a no-op until COSM-03) — nothing premium yet
    expect(FRAMES.some((f) => f.tier === 'premium')).toBe(false);
    expect([...EFFECTS, ...FINISHES, ...NAMEPLATES, ...FONTS].some((x) => x.tier === 'premium')).toBe(false);
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
