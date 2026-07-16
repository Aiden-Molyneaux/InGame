// steppedRectPath — the F-02 TL+BR pixel-step silhouette as an SVG path `d` (decision 0041, the
// GameCard corner signature). RN has no clip-path, so components draw this filled `<Path>` instead
// of a background colour (R1-1's ScreenButton `add` pattern, generalized to one shared helper).
// `u` = the unit stair; the total notch is 2u. Pass which corners to notch — the default {tl, br}
// is the card / StateMark / intent-button signature; TR + BL stay square. Clockwise, closed.
export type SteppedCorners = { tl?: boolean; tr?: boolean; bl?: boolean; br?: boolean };

// The canonical card is a 224px-wide face (the full CARD-15 flatten is exactly 3× that — 672px, a
// 224pt card at iPhone 3× DPR; the thumb flatten is 3× the 96px cell). CANONICAL_CARD_W anchors the
// flatten ladder (see flatten-sizes.test) and is NOT the chunk knob — that is CARD_STEP_RATIO below.
export const CANONICAL_CARD_W = 224;

/**
 * OWNER TUNE-KNOB (F-20 ruling 1 — "bigger cards should scale the chunkiness of their corners to give
 * the retro feel"). The pixel-step unit `u` as a fraction of card width, so the notch (t = 2u) is
 * `2 × CARD_STEP_RATIO` of the width at EVERY size. F-18 made this proportional but deliberately subtle
 * (6/224 → notch 5.36% of width, anchored to keep the hero looking as it did); the owner instead wants
 * the RETRO CHUNK to scale UP, so this is the chunkier 6/112 (notch 10.7% of width — double F-18).
 * This is the ONLY number to touch: soften toward ~6/150 (notch ~8%) if too loud on device, or push
 * higher for more chunk. Everything downstream (live GameCard face, StatsBack, the animated clip, and
 * the server-side CARD-15 flatten) reads `cardStepUnit`, so they stay in lockstep automatically.
 * Geometry note: the TL+BR notch self-intersects only past ~50% of the min dimension; 10.7% is far
 * clear even at the smallest mini/thumb sizes (~48px → t ≈ 5px), so no clamp is required.
 */
export const CARD_STEP_RATIO = 6 / 112;

// The canonical 224pt card's resulting step (was 6 at the F-18 ratio; 12 at the F-20 chunk). Derived
// from the knob so it can never drift; kept exported for the flatten anchor + F-18 invariant tests.
export const CANONICAL_STEP = CANONICAL_CARD_W * CARD_STEP_RATIO;

/**
 * The F-02 pixel-step unit (`u` in `steppedRectPath`), scaled PROPORTIONALLY to the card's pixel width
 * (F-18) so a card's stepped silhouette is IDENTICAL live vs flattened at ANY size — a card renders
 * LIVE at its display px, but the CARD-15 flatten renders at 3× DPR then downscales into the display
 * box, so a scale-invariant `u/w` is what makes live == flatten everywhere. The ratio itself is the
 * owner's chunk knob (CARD_STEP_RATIO).
 */
export function cardStepUnit(w: number): number {
  return w * CARD_STEP_RATIO;
}

export function steppedRectPath(
  w: number,
  h: number,
  u: number,
  corners: SteppedCorners = { tl: true, br: true },
): string {
  const t = 2 * u;
  const pts: Array<[number, number]> = [];
  if (corners.tl) pts.push([0, t], [u, t], [u, u], [t, u], [t, 0]);
  else pts.push([0, 0]);
  if (corners.tr) pts.push([w - t, 0], [w - t, u], [w - u, u], [w - u, t], [w, t]);
  else pts.push([w, 0]);
  if (corners.br) pts.push([w, h - t], [w - u, h - t], [w - u, h - u], [w - t, h - u], [w - t, h]);
  else pts.push([w, h]);
  if (corners.bl) pts.push([t, h], [t, h - u], [u, h - u], [u, h - t], [0, h - t]);
  else pts.push([0, h]);
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z';
}
