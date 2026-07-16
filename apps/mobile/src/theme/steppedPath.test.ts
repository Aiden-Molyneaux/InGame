import { cardStepUnit, CANONICAL_CARD_W, CANONICAL_STEP, steppedRectPath } from './steppedPath';

// The F-02 TL+BR pixel-step silhouette (decision 0041 — the GameCard corner signature).
// `u` = the unit stair; the total notch is 2u. TR + BL stay square by default; a consumer
// passes which corners to notch (face = TL only, card plate strip = BR only, full card /
// StateMark / intent-button = TL+BR). Clockwise trace; deterministic, so we pin exact paths.
describe('steppedRectPath', () => {
  it('notches TL+BR by default (the F-02 card / button / StateMark signature)', () => {
    // 100x140, u=6 → notch 12. This is the geometry R1-1 shipped inline in ScreenButton's `add`.
    expect(steppedRectPath(100, 140, 6)).toBe(
      'M0 12 L6 12 L6 6 L12 6 L12 0 L100 0 L100 128 L94 128 L94 134 L88 134 L88 140 L0 140 Z',
    );
  });

  it('notches only the corners requested — face = TL only', () => {
    expect(steppedRectPath(100, 140, 6, { tl: true })).toBe(
      'M0 12 L6 12 L6 6 L12 6 L12 0 L100 0 L100 140 L0 140 Z',
    );
  });

  it('notches only BR — the card plate strip', () => {
    expect(steppedRectPath(100, 20, 6, { br: true })).toBe(
      'M0 0 L100 0 L100 8 L94 8 L94 14 L88 14 L88 20 L0 20 Z',
    );
  });

  it('is a plain rectangle when no corners are notched (square chrome)', () => {
    expect(steppedRectPath(100, 140, 6, {})).toBe('M0 0 L100 0 L100 140 L0 140 Z');
  });
});

// F-18 — the step unit is PROPORTIONAL to card width so a card's silhouette is identical whether it is
// rendered LIVE at its display px or FLATTENED at 3× DPR then downscaled. The bug it fixes: a fixed-px
// `u` (old `W>=96?6:3`) drew ~3-7× finer steps on the flattened card (rendered at 672px, then shrunk to
// the display box) than on the live one at the same on-screen size.
describe('cardStepUnit (F-18 scale-invariant pixel-step)', () => {
  it('keeps the canonical 224px card at the historical u = 6', () => {
    expect(cardStepUnit(CANONICAL_CARD_W)).toBe(CANONICAL_STEP);
  });

  it('is scale-invariant — u/w is constant at every render size', () => {
    const ratio = CANONICAL_STEP / CANONICAL_CARD_W;
    for (const w of [48, 96, 138, 161, 224, 288, 672]) {
      expect(cardStepUnit(w) / w).toBeCloseTo(ratio, 10);
    }
  });

  it('the FULL flatten (672px) downscales to the SAME on-screen step as a live card at any display size', () => {
    // The full PNG (672px, cardStepUnit(672)) shown in a box of `display` px shows a step of
    // cardStepUnit(672) * display/672 — which must equal a live card at `display` px (cardStepUnit(display)).
    const flatRenderW = 672;
    for (const display of [96, 138, 161, 189, 224]) {
      const flatStepOnScreen = cardStepUnit(flatRenderW) * (display / flatRenderW);
      expect(flatStepOnScreen).toBeCloseTo(cardStepUnit(display), 10);
    }
  });
});
