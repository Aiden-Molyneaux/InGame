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
  /** Radial gradient (soft-glow / vignette, 0063). Optional — omitted, those effects degrade to none. */
  RadialGradient?: any;
  Skia: any;
  typeface?: any;
  /** Optional per-fontId typefaces (0063 free fonts); `typeface` stays the fallback. */
  typefaces?: Record<string, any>;
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
    const shape = c.nameplate.shape ?? 'slab';
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
