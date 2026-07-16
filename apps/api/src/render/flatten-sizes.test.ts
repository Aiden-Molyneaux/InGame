import { describe, it, expect } from 'vitest';
import { RENDER_SIZES } from './flatten';
import { cardStepUnit, CANONICAL_CARD_W, CANONICAL_STEP } from './steppedPath';

// The F3 gallery-resolution floor (decision 0076) — the flatten ladder must out-resolve its client
// consumers so a native <Image> DOWN-scales (crisp) instead of UP-scaling (mush). The regression the
// owner hit (E1e): a 48px thumb stretched across a 96pt gallery cell at 3× DPR = a 6× blow-up.

// The gallery cell is `cell` = 96pt wide (FlatCardImage SIZE_DIMS); iPhone tops out at 3× DPR.
const GALLERY_CELL_PT = 96;
const MAX_DPR = 3;
// The largest single-card flattened consumer is the CardDetail inspect view (CardFace width={189}); an
// adopted (composition-less) card fills it from the FULL render. 189pt × 3 DPR = 567 physical px — the
// full render must out-resolve THAT so it down-scales (owner round-2 bug 2: 448px up-scaled = mush).
const DETAIL_INSPECT_PT = 189;

describe('flatten RENDER_SIZES — the gallery-resolution floor', () => {
  it('the thumb is at least the gallery cell width × device-pixel-ratio (≥ 288px)', () => {
    expect(RENDER_SIZES.thumb.w).toBeGreaterThanOrEqual(GALLERY_CELL_PT * MAX_DPR);
  });

  it('the full render is at least as large as the thumb (it backs the inspect/detail large view)', () => {
    expect(RENDER_SIZES.full.w).toBeGreaterThanOrEqual(RENDER_SIZES.thumb.w);
    expect(RENDER_SIZES.full.h).toBeGreaterThanOrEqual(RENDER_SIZES.thumb.h);
  });

  it('the full render out-resolves the CardDetail inspect view at 3× DPR (≥ 567px)', () => {
    expect(RENDER_SIZES.full.w).toBeGreaterThanOrEqual(DETAIL_INSPECT_PT * MAX_DPR);
  });

  it('both sizes keep the portrait card aspect ratio (~0.715, w/h)', () => {
    for (const s of [RENDER_SIZES.full, RENDER_SIZES.thumb]) {
      expect(s.w / s.h).toBeCloseTo(0.715, 1);
    }
  });

  // F-18 — the flatten canvas is proportional to the CANONICAL card, and the full render is exactly the
  // 224px canonical card at 3× DPR. That anchoring is what makes cardStepUnit(full) downscale to the
  // live card's step (the sibling invariant is pinned in the mobile steppedPath test).
  it('the full render is exactly the canonical card at 3× DPR (so its stepped silhouette matches live)', () => {
    expect(RENDER_SIZES.full.w).toBe(CANONICAL_CARD_W * 3);
    // and cardStepUnit at the full render, downscaled to the canonical display, is the historical step
    expect(cardStepUnit(RENDER_SIZES.full.w) * (CANONICAL_CARD_W / RENDER_SIZES.full.w)).toBeCloseTo(
      CANONICAL_STEP,
      10,
    );
  });

  it('full and thumb share one canonical aspect (w/h within integer-rounding of each other)', () => {
    expect(RENDER_SIZES.full.w / RENDER_SIZES.full.h).toBeCloseTo(
      RENDER_SIZES.thumb.w / RENDER_SIZES.thumb.h,
      2,
    );
  });
});
