import { createElement } from 'react';
import { steppedRectPath } from '../theme/steppedPath';
import { MAX_ELEMENTS, type CardComposition, type CardElement } from './composition';

// buildCardElements — the CARD-15 draw logic as a skia element tree (M4 §1 spike, GO). The skia
// component set + Skia factory are PASSED IN, so the SAME builder runs against the react-native-skia
// build (the live editor <Canvas>) AND the headless/canvaskit build (the node flatten harness + the
// render test). The card is clipped to the F-02 stepped silhouette; the effect renders as a RUNTIME
// overlay on the flattened base (viewers download one image; the animated effect paints on top).

// The interop boundary is deliberately untyped (any) — the two skia builds expose the same shapes.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type SkiaCtx = {
  Group: any;
  Fill: any;
  Rect: any;
  Oval: any;
  Path: any;
  Text: any;
  LinearGradient: any;
  Skia: any;
  typeface?: any;
};

function polyPoints(shape: 'star' | 'diamond' | 'triangle'): Array<[number, number]> {
  if (shape === 'diamond') return [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]];
  if (shape === 'triangle') return [[0, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.22;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

function element(e: CardElement, W: number, H: number, ctx: SkiaCtx, key: string): any {
  const h = createElement;
  const { Rect, Oval, Path, Text, Group, Skia, typeface } = ctx;
  const cx = e.x * W;
  const cy = e.y * H;
  if (e.type === 'text') {
    if (!typeface) return null;
    const fontSize = e.size * H;
    const font = Skia.Font(typeface, fontSize);
    const tw = e.text.length * fontSize * 0.58; // approx (measureText unimplemented on the web backend)
    return h(Text, { key, x: cx - tw / 2, y: cy, text: e.text, font, color: e.fill });
  }
  const ew = e.w * W;
  const eh = e.h * H;
  let node: any;
  if (e.type === 'rect') node = h(Rect, { key, x: cx - ew / 2, y: cy - eh / 2, width: ew, height: eh, color: e.fill });
  else if (e.type === 'ellipse') node = h(Oval, { key, x: cx - ew / 2, y: cy - eh / 2, width: ew, height: eh, color: e.fill });
  else {
    const p = Skia.Path.Make();
    polyPoints(e.shape).forEach(([px, py], i) => (i === 0 ? p.moveTo(cx + px * ew, cy + py * eh) : p.lineTo(cx + px * ew, cy + py * eh)));
    p.close();
    node = h(Path, { key, path: p, color: e.fill });
  }
  if (e.rotation) return h(Group, { key, transform: [{ rotate: (e.rotation * Math.PI) / 180 }], origin: { x: cx, y: cy } }, node);
  return node;
}

function scanlineOverlay(W: number, H: number, intensity: number, ctx: SkiaCtx): any {
  const h = createElement;
  const { Group, Rect } = ctx;
  const lines: any[] = [];
  const gap = Math.max(3, Math.round(H / 60));
  for (let y = 0; y < H; y += gap) {
    lines.push(h(Rect, { key: `sl${y}`, x: 0, y, width: W, height: 1, color: `rgba(0,0,0,${0.5 * intensity})` }));
  }
  return h(Group, { key: 'fx' }, ...lines);
}

/** Build the skia element tree for a composition at the given pixel size (the size-ladder input). */
export function buildCardElements(c: CardComposition, W: number, H: number, ctx: SkiaCtx, withEffect = false): any {
  if (c.elements.length > MAX_ELEMENTS) {
    throw new Error(`CARD-15 cap-${MAX_ELEMENTS} exceeded: ${c.elements.length}`);
  }
  const h = createElement;
  const { Group, Fill, Rect, Path, Text, LinearGradient, Skia, typeface } = ctx;
  const u = W >= 96 ? 6 : 3; // matches GameCard: plated sizes step 6, mini/thumb 3
  const clip = Skia.Path.MakeFromSVGString(steppedRectPath(W, H, u));
  const plated = W >= 96 && !!c.nameplate; // F-06 drops the plate on mini/thumb
  const plateH = plated ? Math.round(H * 0.11) : 0;

  const children: any[] = [];
  if ('gradient' in c.base) {
    children.push(
      h(Rect, { key: 'base', x: 0, y: 0, width: W, height: H }, h(LinearGradient, { start: { x: 0, y: 0 }, end: { x: 0, y: H }, colors: c.base.gradient })),
    );
  } else {
    children.push(h(Fill, { key: 'base', color: c.base.fill }));
  }
  c.elements.forEach((e, i) => {
    const el = element(e, W, H - plateH, ctx, `el${i}`);
    if (el) children.push(el);
  });
  if (plated && c.nameplate) {
    children.push(h(Rect, { key: 'plate', x: 0, y: H - plateH, width: W, height: plateH, color: c.nameplate.plate }));
    if (typeface) {
      const font = Skia.Font(typeface, c.nameplate.size * H);
      children.push(h(Text, { key: 'title', x: Math.round(W * 0.08), y: H - plateH / 2 + (c.nameplate.size * H) / 3, text: c.nameplate.title, font, color: c.nameplate.ink }));
    }
  }
  if (c.frame) {
    children.push(h(Path, { key: 'frame', path: Skia.Path.MakeFromSVGString(steppedRectPath(W, H, u)), style: 'stroke', strokeWidth: Math.max(1, c.frame.width * W), color: c.frame.color }));
  }
  if (withEffect && c.effect && c.effect.kind === 'scanline') {
    children.push(scanlineOverlay(W, H, c.effect.intensity, ctx));
  }
  return h(Group, { clip }, ...children);
}
