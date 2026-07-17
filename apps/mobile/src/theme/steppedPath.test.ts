import { steppedRectPath } from './steppedPath';

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
