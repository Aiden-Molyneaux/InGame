import { describe, it, expect } from 'vitest';
import { RENDER_SIZES } from './flatten';

// The F3 gallery-resolution floor (decision 0076) — the flatten ladder must out-resolve its client
// consumers so a native <Image> DOWN-scales (crisp) instead of UP-scaling (mush). The regression the
// owner hit (E1e): a 48px thumb stretched across a 96pt gallery cell at 3× DPR = a 6× blow-up.

// The gallery cell is `cell` = 96pt wide (FlatCardImage SIZE_DIMS); iPhone tops out at 3× DPR.
const GALLERY_CELL_PT = 96;
const MAX_DPR = 3;

describe('flatten RENDER_SIZES — the gallery-resolution floor', () => {
  it('the thumb is at least the gallery cell width × device-pixel-ratio (≥ 288px)', () => {
    expect(RENDER_SIZES.thumb.w).toBeGreaterThanOrEqual(GALLERY_CELL_PT * MAX_DPR);
  });

  it('the full render is at least as large as the thumb (it backs the inspect/detail large view)', () => {
    expect(RENDER_SIZES.full.w).toBeGreaterThanOrEqual(RENDER_SIZES.thumb.w);
    expect(RENDER_SIZES.full.h).toBeGreaterThanOrEqual(RENDER_SIZES.thumb.h);
  });

  it('both sizes keep the portrait card aspect ratio (~0.715, w/h)', () => {
    for (const s of [RENDER_SIZES.full, RENDER_SIZES.thumb]) {
      expect(s.w / s.h).toBeCloseTo(0.715, 1);
    }
  });
});
