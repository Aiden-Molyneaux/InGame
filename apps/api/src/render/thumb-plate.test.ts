import { describe, it, expect } from 'vitest';
import { buildCardElements } from './buildCard';
import { RENDER_SIZES, withoutNameplate } from './flatten';
import { SAMPLE_COMPOSITION } from './composition';
import type { CardComposition } from './composition';

// Decision 0047 (M6 walk) — the flattened THUMB renders PLATELESS. buildCardElements is source-agnostic
// (the skia bits are passed in), so the plate presence is asserted STRUCTURALLY with a stub ctx — the
// mobile composition.test.ts pattern. The builder's own F-06 gate (`plated = W >= 96 && !!c.nameplate`)
// checks PHYSICAL px, and the server thumb is 288px (96pt × 3 DPR — the F3 resolution pass), so the
// W-half stopped firing — `withoutNameplate` routes the thumb through the `!!c.nameplate` half instead
// (the same code path the client's sub-96pt live renders take). full keeps the plate (CARD-11/F-14).
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

const kidsOf = (tree: any) => (tree.props.children as any[]).filter(Boolean);
const hasPlate = (tree: any) => kidsOf(tree).some((k) => k?.key === 'plate');

const comp = SAMPLE_COMPOSITION as CardComposition;

describe('decision 0047: the flattened THUMB drops the nameplate; the FULL render keeps it', () => {
  it('the raw builder WOULD plate at the 288px thumb size (the F3 physical-px regression this fix closes)', () => {
    const tree = buildCardElements(comp, RENDER_SIZES.thumb.w, RENDER_SIZES.thumb.h, stubCtx);
    expect(hasPlate(tree)).toBe(true); // ≥ 96 physical px — the W-gate alone no longer drops it
  });

  it('withoutNameplate routes the thumb through the plateless branch (no plate node; clip kept)', () => {
    const stripped = withoutNameplate(comp as unknown as Record<string, unknown>) as unknown as CardComposition;
    const tree = buildCardElements(stripped, RENDER_SIZES.thumb.w, RENDER_SIZES.thumb.h, stubCtx) as any;
    expect(hasPlate(tree)).toBe(false);
    expect(tree.props.clip).toBeTruthy(); // the F-02 stepped silhouette survives
  });

  it('the FULL render keeps the plate (CARD-11/F-14 — the title is system-guaranteed on full)', () => {
    const tree = buildCardElements(comp, RENDER_SIZES.full.w, RENDER_SIZES.full.h, stubCtx);
    expect(hasPlate(tree)).toBe(true);
  });

  it('withoutNameplate drops ONLY the nameplate; other fields ride through; input not mutated', () => {
    const input = { base: { fill: '#000' }, elements: [], nameplate: { title: 'X' }, frame: { color: '#fff', width: 0.01 }, foo: 1 };
    const out = withoutNameplate(input);
    expect('nameplate' in out).toBe(false);
    expect((out as { foo: number }).foo).toBe(1);
    expect(out).toHaveProperty('frame');
    expect('nameplate' in input).toBe(true); // untouched
    // A plateless composition passes through unchanged (same reference — no needless clone).
    const bare = { base: { fill: '#000' }, elements: [] };
    expect(withoutNameplate(bare)).toBe(bare);
  });
});
