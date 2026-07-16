// steppedRectPath — the F-02 TL+BR pixel-step silhouette as an SVG path `d` (decision 0041, the
// GameCard corner signature). RN has no clip-path, so components draw this filled `<Path>` instead
// of a background colour (R1-1's ScreenButton `add` pattern, generalized to one shared helper).
// `u` = the unit stair; the total notch is 2u. Pass which corners to notch — the default {tl, br}
// is the card / StateMark / intent-button signature; TR + BL stay square. Clockwise, closed.
export type SteppedCorners = { tl?: boolean; tr?: boolean; bl?: boolean; br?: boolean };

// The canonical card: a 224px-wide face steps at `u = 6` (theme.step). The full CARD-15 flatten is
// exactly 3× that (672px — a 224pt card at iPhone 3× DPR); the thumb flatten is 3× the 96px cell.
export const CANONICAL_CARD_W = 224;
export const CANONICAL_STEP = 6;

/**
 * The F-02 pixel-step unit (`u` in `steppedRectPath`), scaled PROPORTIONALLY to the card's pixel
 * width so a card's stepped silhouette is IDENTICAL live vs flattened at ANY size (F-18). A card is
 * rendered LIVE at its display px, but the CARD-15 flatten renders at 3× DPR (672px for a 224pt card)
 * and the PNG is then downscaled into the display box — so a FIXED-px `u` (the old `W>=96?6:3`) drew
 * ~3× finer steps on the flattened card than on the live one at the same on-screen size (7× at the
 * 96px cell: live 12.5%-of-width notch vs flat 1.8%). Scaling `u` with `w` makes `u/w` constant, so
 * the silhouette is resolution-independent and live == flatten everywhere. Anchored to the canonical
 * 224px card so it (and the hero/detail showcase it maps to) keeps its historical `u = 6`.
 */
export function cardStepUnit(w: number): number {
  return (w * CANONICAL_STEP) / CANONICAL_CARD_W;
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
