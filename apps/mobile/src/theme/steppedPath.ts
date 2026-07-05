// steppedRectPath — the F-02 TL+BR pixel-step silhouette as an SVG path `d` (decision 0041, the
// GameCard corner signature). RN has no clip-path, so components draw this filled `<Path>` instead
// of a background colour (R1-1's ScreenButton `add` pattern, generalized to one shared helper).
// `u` = the unit stair; the total notch is 2u. Pass which corners to notch — the default {tl, br}
// is the card / StateMark / intent-button signature; TR + BL stay square. Clockwise, closed.
export type SteppedCorners = { tl?: boolean; tr?: boolean; bl?: boolean; br?: boolean };

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
