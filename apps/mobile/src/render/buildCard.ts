import { createElement } from 'react';
import { steppedRectPath } from '../theme/steppedPath';
import { MAX_ELEMENTS, type CardComposition, type CardElement } from './composition';
import { ICON_PATHS, ICON_VIEWBOX } from './icons';

// buildCardElements — the CARD-15 draw logic as a skia element tree (M4 §1 spike, GO). The skia
// component set + Skia factory are PASSED IN, so the SAME builder runs against the react-native-skia
// build (the live editor <Canvas>) AND the headless/canvaskit build (the node flatten harness + the
// render test). The card is clipped to the F-02 stepped silhouette; the effect renders as a RUNTIME
// overlay on the flattened base (viewers download one image; the animated effect paints on top).
//
// M4 §3.4 Canvas additions: icon elements (the 0063 Essentials registry) · pentagon/hexagon/octagon
// polys · the CARD-10 creative fields (opacity/gradient/stroke/glow/blend/flip/radius) · CARD-11 arc
// text · CARD-08 hidden-skip — plus two new exported builders: `buildBedElements` (the press bed —
// base + vectors BARE, isolation ghosting) and `buildOverlayElements` (effect+finish only, painted
// over the PROOF flatten — the CARD-15 image+overlay viewer architecture). One `element()` serves
// all three, so the bed, the live card, and the flatten can never drift.

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
  /** Radial gradient (soft-glow / vignette, 0063). Optional — omitted, those effects degrade to none. */
  RadialGradient?: any;
  /** Blur mask (the CARD-10 element glow). Optional — omitted, glow degrades to none. */
  BlurMask?: any;
  Skia: any;
  typeface?: any;
  /** Optional per-fontId typefaces (0063 free fonts); `typeface` stays the fallback. */
  typefaces?: Record<string, any>;
};

function polyPoints(shape: 'star' | 'diamond' | 'triangle' | 'pentagon' | 'hexagon' | 'octagon'): Array<[number, number]> {
  if (shape === 'diamond') return [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]];
  if (shape === 'triangle') return [[0, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  if (shape === 'pentagon' || shape === 'hexagon' || shape === 'octagon') {
    const n = shape === 'pentagon' ? 5 : shape === 'hexagon' ? 6 : 8;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      pts.push([Math.cos(a) * 0.5, Math.sin(a) * 0.5]);
    }
    return pts;
  }
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.22;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/** A rounded-rect SVG path (radius clamped to the half-side) — works on both skia builds. */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return (
    `M${x + rr} ${y} H${x + w - rr} A${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V${y + h - rr} ` +
    `A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} H${x + rr} A${rr} ${rr} 0 0 1 ${x} ${y + h - rr} ` +
    `V${y + rr} A${rr} ${rr} 0 0 1 ${x + rr} ${y} Z`
  );
}

/** The per-char approximate width (canvaskit-web lacks measureText — the recorded 0066 limit). */
const CHAR_W = 0.58;

/** CARD-11 arc text — per-char placement along a circle; deterministic, same math live + flatten. */
function arcTextNodes(e: Extract<CardElement, { type: 'text' }>, W: number, H: number, ctx: SkiaCtx, font: any): any[] {
  const h = createElement;
  const { Text, Group } = ctx;
  const fontSize = e.size * H;
  const chars = [...e.text];
  const charW = fontSize * CHAR_W;
  const totalW = chars.length * charW;
  const theta = (Math.abs(e.arc!) * Math.PI) / 180;
  const R = Math.max(totalW / Math.max(theta, 0.01), fontSize);
  const up = e.arc! > 0; // positive arc = rainbow (bows up); negative bows down
  const cx = e.x * W;
  const cy = e.y * H;
  const centerY = up ? cy + R : cy - R;
  const nodes: any[] = [];
  chars.forEach((ch, i) => {
    const s = -totalW / 2 + charW * (i + 0.5); // arc-length offset of the char center
    const phi = s / R; // angle off the apex
    const px = cx + Math.sin(phi) * R;
    const py = centerY + (up ? -Math.cos(phi) * R : Math.cos(phi) * R);
    const rot = up ? phi : -phi;
    nodes.push(
      h(
        Group,
        { key: `ch${i}`, transform: [{ rotate: rot }], origin: { x: px, y: py } },
        h(Text, { x: px - charW / 2, y: py + fontSize / 3, text: ch, font, color: e.fill }),
      ),
    );
  });
  return nodes;
}

function element(e: CardElement, W: number, H: number, ctx: SkiaCtx, key: string): any {
  const h = createElement;
  const { Rect, Oval, Path, Text, Group, LinearGradient, Skia, typeface, BlurMask } = ctx;
  if (e.hidden) return null; // CARD-08 hide — not rendered anywhere (rack keeps the slip)
  const cx = e.x * W;
  const cy = e.y * H;

  /** Wrap a node with the creative modifiers shared by every kind (rotation/flip/opacity/blend). */
  const dress = (nodes: any[]): any => {
    const transform: any[] = [];
    if (e.rotation) transform.push({ rotate: (e.rotation * Math.PI) / 180 });
    if (e.type !== 'text' && (e as any).flipH) transform.push({ scaleX: -1 });
    if (e.type !== 'text' && (e as any).flipV) transform.push({ scaleY: -1 });
    const props: any = { key };
    if (transform.length) {
      props.transform = transform;
      props.origin = { x: cx, y: cy };
    }
    if (e.opacity != null && e.opacity < 1) props.opacity = e.opacity;
    if (e.blend) props.blendMode = e.blend;
    if (!transform.length && props.opacity == null && !props.blendMode && nodes.length === 1) {
      return nodes[0]; // already uniquely keyed (`${key}f`)
    }
    return h(Group, props, ...nodes);
  };

  if (e.type === 'text') {
    const face = (e.fontId && ctx.typefaces?.[e.fontId]) || typeface;
    if (!face) return null;
    const fontSize = e.size * H;
    const font = Skia.Font(face, fontSize);
    if (e.arc) return dress(arcTextNodes(e, W, H, ctx, font));
    const tw = e.text.length * fontSize * CHAR_W; // approx (measureText unimplemented on the web backend)
    return dress([h(Text, { key: `${key}t`, x: cx - tw / 2, y: cy, text: e.text, font, color: e.fill })]);
  }

  const ew = e.w * W;
  const eh = e.h * H;
  const nodes: any[] = [];

  /** Build the kind's geometry once; reused for the fill, the glow ghost, and the stroke. */
  const geometry = (k: string, paint: { color?: string; style?: string; strokeWidth?: number }, children?: any): any => {
    if (e.type === 'rect') {
      if (e.radius && e.radius > 0) {
        const p = Skia.Path.MakeFromSVGString(roundedRectPath(cx - ew / 2, cy - eh / 2, ew, eh, e.radius * Math.min(ew, eh)));
        return h(Path, { key: k, path: p, ...paint }, children);
      }
      return h(Rect, { key: k, x: cx - ew / 2, y: cy - eh / 2, width: ew, height: eh, ...paint }, children);
    }
    if (e.type === 'ellipse') return h(Oval, { key: k, x: cx - ew / 2, y: cy - eh / 2, width: ew, height: eh, ...paint }, children);
    if (e.type === 'icon') {
      const d = ICON_PATHS[e.iconId];
      if (!d) return null; // unknown icon id — degrade, never a crash (F21 posture)
      const p = Skia.Path.MakeFromSVGString(d);
      if (!p) return null;
      // the group scale multiplies stroke widths — divide by the mean scale so strokes stay true
      const meanScale = (ew / ICON_VIEWBOX + eh / ICON_VIEWBOX) / 2 || 1;
      const iconPaint = paint.strokeWidth ? { ...paint, strokeWidth: paint.strokeWidth / meanScale } : paint;
      return h(
        Group,
        {
          key: k,
          transform: [{ translateX: cx - ew / 2 }, { translateY: cy - eh / 2 }, { scaleX: ew / ICON_VIEWBOX }, { scaleY: eh / ICON_VIEWBOX }],
        },
        h(Path, { path: p, ...iconPaint }, children),
      );
    }
    // poly
    const p = Skia.Path.Make();
    polyPoints(e.shape).forEach(([px, py], i) => (i === 0 ? p.moveTo(cx + px * ew, cy + py * eh) : p.lineTo(cx + px * ew, cy + py * eh)));
    p.close();
    return h(Path, { key: k, path: p, ...paint }, children);
  };

  // glow ghost BEHIND the fill (CARD-10) — degrades to none without a BlurMask in the ctx
  if (e.glow && BlurMask) {
    const g = geometry(`${key}g`, { color: e.fill }, h(BlurMask, { blur: Math.max(4, W * 0.035), style: 'normal' }));
    if (g) nodes.push(g);
  }
  // the fill — gradient when a second stop rides (CARD-10 SOLID/GRADIENT)
  const fillNode = e.fill2
    ? geometry(
        `${key}f`,
        {},
        h(LinearGradient, {
          start: { x: cx - ew / 2, y: cy - eh / 2 },
          end: { x: cx - ew / 2, y: cy + eh / 2 },
          colors: [e.fill, e.fill2],
        }),
      )
    : geometry(`${key}f`, { color: e.fill });
  if (fillNode) nodes.push(fillNode);
  // the stroke OVER the fill (CARD-10)
  if (e.stroke) {
    const s = geometry(`${key}s`, { color: e.stroke.color, style: 'stroke', strokeWidth: Math.max(1, e.stroke.width * W) });
    if (s) nodes.push(s);
  }
  if (!nodes.length) return null;
  return dress(nodes);
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

// ── the 0063 free effect/finish overlays (COSM-02 — runtime, never baked; intensity = the effect's
// alone, finishes are binary materials — CARD-12/OQ-048) ─────────────────────────────────────────

/** A diagonal light band (gradient-sheen; also subtle-gloss at a fixed low alpha). */
function sheenOverlay(W: number, H: number, alpha: number, ctx: SkiaCtx, key: string): any {
  const h = createElement;
  const { Rect, LinearGradient } = ctx;
  return h(
    Rect,
    { key, x: 0, y: 0, width: W, height: H },
    h(LinearGradient, {
      start: { x: 0, y: H * 0.15 },
      end: { x: W, y: H * 0.85 },
      colors: ['rgba(255,255,255,0)', `rgba(255,255,255,${alpha})`, 'rgba(180,235,255,0.0)'],
      positions: [0.3, 0.5, 0.7],
    }),
  );
}

/** Deterministic dust particles — a fixed LCG seed, so the flatten and the live render agree. */
function dustOverlay(W: number, H: number, intensity: number, ctx: SkiaCtx): any {
  const h = createElement;
  const { Group, Oval } = ctx;
  let s = 42;
  const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const motes: any[] = [];
  for (let i = 0; i < 26; i++) {
    const r = 0.6 + rand() * 1.8;
    motes.push(
      h(Oval, {
        key: `d${i}`,
        x: rand() * W,
        y: rand() * H,
        width: r * (W / 100),
        height: r * (W / 100),
        color: `rgba(243,236,217,${(0.25 + rand() * 0.45) * intensity})`,
      }),
    );
  }
  return h(Group, { key: 'fx-dust' }, ...motes);
}

function effectOverlay(kind: string, intensity: number, W: number, H: number, ctx: SkiaCtx): any {
  const h = createElement;
  const { Rect, RadialGradient } = ctx;
  if (kind === 'scanline') return scanlineOverlay(W, H, intensity, ctx);
  if (kind === 'gradient-sheen') return sheenOverlay(W, H, 0.34 * intensity, ctx, 'fx-sheen');
  if (kind === 'dust') return dustOverlay(W, H, intensity, ctx);
  if (kind === 'soft-glow' && RadialGradient) {
    return h(
      Rect,
      { key: 'fx-glow', x: 0, y: 0, width: W, height: H },
      h(RadialGradient, {
        c: { x: W / 2, y: H * 0.42 },
        r: W * 0.72,
        colors: [`rgba(235,240,255,${0.36 * intensity})`, 'rgba(235,240,255,0)'],
      }),
    );
  }
  if (kind === 'vignette' && RadialGradient) {
    return h(
      Rect,
      { key: 'fx-vig', x: 0, y: 0, width: W, height: H },
      h(RadialGradient, {
        c: { x: W / 2, y: H / 2 },
        r: H * 0.72,
        colors: ['rgba(0,0,0,0)', `rgba(0,0,0,${0.5 * intensity})`],
        positions: [0.55, 1],
      }),
    );
  }
  return null;
}

function finishOverlay(kind: string, W: number, H: number, ctx: SkiaCtx): any {
  const h = createElement;
  const { Rect } = ctx;
  if (kind === 'matte') {
    // A flat, light-killing wash — the anti-gloss material.
    return h(Rect, { key: 'fin-matte', x: 0, y: 0, width: W, height: H, color: 'rgba(16,14,26,0.10)' });
  }
  if (kind === 'subtle-gloss') return sheenOverlay(W, H, 0.16, ctx, 'fin-gloss');
  return null;
}

/** The 0063 free frame kinds — drawn over the elements, inside the stepped clip. */
function frameNodes(
  frame: { kind?: string; color: string; width: number },
  W: number,
  H: number,
  u: number,
  ctx: SkiaCtx,
): any[] {
  const h = createElement;
  const { Path, Skia } = ctx;
  const kind = frame.kind ?? 'thin-line';
  const sw = Math.max(1, frame.width * W);
  const stepped = (inset: number, unit: number) =>
    Skia.Path.MakeFromSVGString(steppedRectPath(W - inset * 2, H - inset * 2, unit));
  const stroke = (key: string, path: any, width: number, transform?: any[]) =>
    h(Path, { key, path, style: 'stroke', strokeWidth: width, color: frame.color, ...(transform ? { transform } : {}) });

  if (kind === 'double-line') {
    const inset = sw * 2.5;
    return [
      stroke('frame', stepped(0, u), sw),
      stroke('frame2', stepped(inset, u), Math.max(1, sw * 0.5), [{ translateX: inset }, { translateY: inset }]),
    ];
  }
  if (kind === 'pixel-border') {
    // The chunky retro border — a doubled stair unit + a thicker stroke.
    return [stroke('frame', stepped(0, u * 2), sw * 1.8)];
  }
  if (kind === 'bracket-corners') {
    // Four corner brackets, no full border. Arm length ~18% of the width.
    const a = W * 0.18;
    const m = sw * 1.5; // margin off the edge
    const p = Skia.Path.Make();
    p.moveTo(m, m + a); p.lineTo(m, m); p.lineTo(m + a, m);
    p.moveTo(W - m - a, m); p.lineTo(W - m, m); p.lineTo(W - m, m + a);
    p.moveTo(W - m, H - m - a); p.lineTo(W - m, H - m); p.lineTo(W - m - a, H - m);
    p.moveTo(m + a, H - m); p.lineTo(m, H - m); p.lineTo(m, H - m - a);
    return [stroke('frame', p, sw)];
  }
  if (kind === 'ticket-notch') {
    // The stepped stroke + two side punch-notches (ticket grammar); punched in the base tone.
    const notchR = W * 0.045;
    const punch = (key: string, x: number) =>
      h(ctx.Oval, { key, x: x - notchR, y: H / 2 - notchR, width: notchR * 2, height: notchR * 2, color: frame.color, style: 'stroke', strokeWidth: Math.max(1, sw * 0.75) });
    return [stroke('frame', stepped(0, u), sw), punch('notchL', 0), punch('notchR', W)];
  }
  // thin-line (the default)
  return [stroke('frame', stepped(0, u), sw)];
}

/** The plate reservation shared by the plated draw and the bed (positions must agree — WYSIWYG). */
export const PLATE_H_RATIO = 0.11;

/** Build the skia element tree for a composition at the given pixel size (the size-ladder input). */
export function buildCardElements(c: CardComposition, W: number, H: number, ctx: SkiaCtx, withEffect = false): any {
  if (c.elements.length > MAX_ELEMENTS) {
    throw new Error(`CARD-15 cap-${MAX_ELEMENTS} exceeded: ${c.elements.length}`);
  }
  const h = createElement;
  const { Group, Fill, Rect, Path, Text, LinearGradient, Skia, typeface } = ctx;
  const u = W >= 96 ? 6 : 3; // matches GameCard: plated sizes step 6, mini/thumb 3
  const clip = Skia.Path.MakeFromSVGString(steppedRectPath(W, H, u));
  // F-06 drops the plate on mini/thumb. A plate is REQUIRED (OQ-135 ruling) — legacy 'none'
  // documents keep their object and render as SLAB (see the shape coercion below).
  const plated = W >= 96 && !!c.nameplate;
  const plateH = plated ? Math.round(H * PLATE_H_RATIO) : 0;

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
    const raw = c.nameplate.shape ?? 'slab';
    const shape = raw === 'none' ? 'slab' : raw; // OQ-135: the name always renders
    if (shape === 'slab') {
      children.push(h(Rect, { key: 'plate', x: 0, y: H - plateH, width: W, height: plateH, color: c.nameplate.plate }));
    } else {
      // ribbon = side-notched banner (the board `.pl-ribbon` grammar); bevel = chamfered corners.
      const p = Skia.Path.Make();
      const top = H - plateH;
      if (shape === 'ribbon') {
        const nx = W * 0.06;
        p.moveTo(nx, top); p.lineTo(W - nx, top); p.lineTo(W, top + plateH / 2); p.lineTo(W - nx, H);
        p.lineTo(nx, H); p.lineTo(0, top + plateH / 2);
      } else {
        const ch = plateH * 0.35;
        p.moveTo(ch, top); p.lineTo(W - ch, top); p.lineTo(W, top + ch); p.lineTo(W, H);
        p.lineTo(0, H); p.lineTo(0, top + ch);
      }
      p.close();
      children.push(h(Path, { key: 'plate', path: p, color: c.nameplate.plate }));
    }
    const face = (c.nameplate.fontId && ctx.typefaces?.[c.nameplate.fontId]) || typeface;
    if (face) {
      const font = Skia.Font(face, c.nameplate.size * H);
      children.push(h(Text, { key: 'title', x: Math.round(W * (shape === 'slab' ? 0.08 : 0.12)), y: H - plateH / 2 + (c.nameplate.size * H) / 3, text: c.nameplate.title, font, color: c.nameplate.ink }));
    }
  }
  if (c.frame) {
    children.push(...frameNodes(c.frame, W, H, u, ctx));
  }
  // The runtime overlay stack (never baked): the ONE effect, then the finish material OVER it
  // (CARD-12 — "a separate stackable finish layer"; both 0063 free kinds here, premium rides M5).
  if (withEffect && c.effect && c.effect.kind !== 'none') {
    const fx = effectOverlay(c.effect.kind, c.effect.intensity, W, H, ctx);
    if (fx) children.push(fx);
  }
  if (withEffect && c.finish && c.finish.kind !== 'none') {
    const fin = finishOverlay(c.finish.kind, W, H, ctx);
    if (fin) children.push(fin);
  }
  return h(Group, { clip }, ...children);
}

/**
 * The PRESS BED draw (Canvas P1/P2 — the composition BARE): base + vector elements ONLY — no
 * frame/plate/effect/finish (closed attributes show only on PROOF, board P1 hint). Elements keep
 * the plated draw's plate-zone reservation (PLATE_H_RATIO) so bed positions match the finished
 * card exactly. `pulledIndex` ghosts every OTHER element to 28% (CARD-08 isolation).
 */
export function buildBedElements(
  c: CardComposition,
  W: number,
  H: number,
  ctx: SkiaCtx,
  opts: { pulledIndex?: number | null; plateZone?: boolean } = {},
): any {
  if (c.elements.length > MAX_ELEMENTS) {
    throw new Error(`CARD-15 cap-${MAX_ELEMENTS} exceeded: ${c.elements.length}`);
  }
  const h = createElement;
  const { Group, Fill, Rect, LinearGradient } = ctx;
  const plateH = opts.plateZone === false ? 0 : Math.round(H * PLATE_H_RATIO); // thumbs skip the reservation
  const children: any[] = [];
  if ('gradient' in c.base) {
    children.push(
      h(Rect, { key: 'base', x: 0, y: 0, width: W, height: H }, h(LinearGradient, { start: { x: 0, y: 0 }, end: { x: 0, y: H }, colors: c.base.gradient })),
    );
  } else {
    children.push(h(Fill, { key: 'base', color: c.base.fill }));
  }
  const pulled = opts.pulledIndex ?? null;
  c.elements.forEach((e, i) => {
    const el = element(e, W, H - plateH, ctx, `el${i}`);
    if (!el) return;
    if (pulled != null && i !== pulled) {
      children.push(h(Group, { key: `gh${i}`, opacity: 0.28 }, el)); // isolation — the rest ghost
    } else {
      children.push(el);
    }
  });
  return h(Group, {}, ...children);
}

/**
 * A grid/row of element cells drawn in ONE canvas (the LayerRack slip panes + the AssetShelf glyph
 * grids). One skia <Canvas> per cell blows the browser's ~16-WebGL-context ceiling long before the
 * cap-30 rack fills (observed live: 33 canvases, 17 lost contexts, the bed evicted to gray) — so
 * every multi-cell preview surface draws through this single-context builder.
 */
export type StripCell = {
  el: CardElement;
  /** cell opacity (the rack's HID slips draw at 0.42) */
  dim?: number;
  /** vertical offset in px (the pulled slip lifts −8, synced with its overlay) */
  lift?: number;
  /** cell background fill (the slip pane tone); absent = transparent */
  bg?: string;
};
export function buildCellStrip(
  cells: StripCell[],
  cellW: number,
  cellH: number,
  strideX: number,
  strideY: number,
  cols: number,
  ctx: SkiaCtx,
): any {
  const h = createElement;
  const { Group, Rect, Skia } = ctx;
  // per-cell clip — an off-edge element (x/y may run −0.25..1.25) must not paint into the
  // neighbouring pane (murr)
  const cellClip = Skia?.XYWHRect ? Skia.XYWHRect(0, 0, cellW, cellH) : undefined;
  const children: any[] = [];
  cells.forEach((cell, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const inner: any[] = [];
    if (cell.bg) inner.push(h(Rect, { key: 'bg', x: 0, y: 0, width: cellW, height: cellH, color: cell.bg }));
    const node = element({ ...cell.el, hidden: false, opacity: cell.el.opacity } as CardElement, cellW, cellH, ctx, 'el');
    if (node) inner.push(node);
    if (!inner.length) return;
    const props: any = {
      key: `c${i}`,
      transform: [{ translateX: col * strideX }, { translateY: row * strideY + (cell.lift ?? 0) }],
    };
    if (cellClip) props.clip = cellClip;
    if (cell.dim != null) props.opacity = cell.dim;
    children.push(h(Group, props, ...inner));
  });
  return h(Group, {}, ...children);
}

/** A row of card-base swatches (solid / gradient) in ONE canvas (the AssetShelf BASE rows). */
export function buildBaseStrip(
  bases: Array<CardComposition['base']>,
  cell: number,
  stride: number,
  ctx: SkiaCtx,
): any {
  const h = createElement;
  const { Group, Rect, LinearGradient } = ctx;
  const children: any[] = [];
  bases.forEach((b, i) => {
    const x = i * stride;
    if ('gradient' in b) {
      children.push(
        h(
          Rect,
          { key: `b${i}`, x, y: 0, width: cell, height: cell },
          h(LinearGradient, { start: { x, y: 0 }, end: { x, y: cell }, colors: b.gradient }),
        ),
      );
    } else {
      children.push(h(Rect, { key: `b${i}`, x, y: 0, width: cell, height: cell, color: b.fill }));
    }
  });
  return h(Group, {}, ...children);
}

/**
 * The PROOF overlay draw — effect + finish ONLY, clipped to the card silhouette; painted OVER the
 * flattened PNG (the CARD-15 viewer architecture: one image + the runtime overlay on top).
 */
export function buildOverlayElements(c: CardComposition, W: number, H: number, ctx: SkiaCtx): any {
  const h = createElement;
  const { Group, Skia } = ctx;
  const u = W >= 96 ? 6 : 3;
  const clip = Skia.Path.MakeFromSVGString(steppedRectPath(W, H, u));
  const children: any[] = [];
  if (c.effect && c.effect.kind !== 'none') {
    const fx = effectOverlay(c.effect.kind, c.effect.intensity, W, H, ctx);
    if (fx) children.push(fx);
  }
  if (c.finish && c.finish.kind !== 'none') {
    const fin = finishOverlay(c.finish.kind, W, H, ctx);
    if (fin) children.push(fin);
  }
  return h(Group, { clip }, ...children);
}
