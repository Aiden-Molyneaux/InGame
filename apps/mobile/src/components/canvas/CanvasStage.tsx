import { Suspense, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { theme } from '../../theme';
import { SkiaErrorBoundary } from '../SkiaErrorBoundary';
import { LazyCardBed } from './lazySkia';
import { NumPop, type NumPopField } from './NumPop';
import { PLATE_H_RATIO } from '../../render/buildCard';
import type { CardComposition, CardElement } from '../../render/composition';

// CanvasStage (component-map §8b / board P1/P2/P5) — the press bed: registration corners, the
// composition lying BARE (base + vectors — closed attributes show only on PROOF), the thumbnail
// safe-area, slip isolation (the rest ghost to 28%), and the element gesture surface. The skia
// bed itself is DISPLAY-ONLY (faces never own touches — the gate-5 A.3 lesson); gestures live on
// an overlay: tap selects (stacked-tap cycles, CARD-08), drag moves, corner handles scale, with
// center snap-guides (CARD-09) — and every gesture's tap pair rides the NumPop (CARD-16).

const CHAR_W = 0.58; // the render module's text-width approximation (kept in lockstep)

type Box = { left: number; top: number; width: number; height: number };

function elementBox(e: CardElement, bedW: number, fieldH: number): Box {
  if (e.type === 'text') {
    const fontSize = e.size * fieldH;
    const w = Math.max(fontSize, e.text.length * fontSize * CHAR_W);
    const h = fontSize * 1.3;
    return { left: e.x * bedW - w / 2, top: e.y * fieldH - fontSize * 0.9, width: w, height: h };
  }
  const w = e.w * bedW;
  const h = e.h * fieldH;
  return { left: e.x * bedW - w / 2, top: e.y * fieldH - h / 2, width: w, height: h };
}

const inBox = (px: number, py: number, b: Box, slop = 4) =>
  px >= b.left - slop && px <= b.left + b.width + slop && py >= b.top - slop && py <= b.top + b.height + slop;

/** Rotate a touch into the element's unrotated space so hit-tests match the DRAWN shape (murr). */
function unrotate(px: number, py: number, e: CardElement, bedW: number, fieldH: number): [number, number] {
  if (!e.rotation) return [px, py];
  const cx = e.x * bedW;
  const cy = e.y * fieldH;
  const a = (-e.rotation * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

export function CanvasStage({
  composition,
  pulledIndex,
  onPull,
  onBeginGesture,
  onMove,
  onResize,
  onRotate,
  numPopOpen,
  onNumPopClose,
}: {
  composition: CardComposition;
  pulledIndex: number | null;
  onPull: (i: number | null) => void;
  /** called ONCE at gesture start so the whole drag is one history entry (undo granularity) */
  onBeginGesture: () => void;
  onMove: (i: number, x: number, y: number) => void; // normalized
  onResize: (i: number, w: number, h: number) => void; // normalized (text: h → size)
  onRotate: (i: number, deg: number) => void;
  numPopOpen: boolean;
  onNumPopClose: () => void;
}) {
  const [zone, setZone] = useState({ w: 0, h: 0 });
  const [guides, setGuides] = useState({ v: false, h: false });

  // the largest 63:88 bed that fits the zone, with breathing room
  const bed = useMemo(() => {
    const availW = zone.w - 48;
    const availH = zone.h - 40;
    if (availW <= 0 || availH <= 0) return { w: 0, h: 0 };
    const w = Math.min(availW, (availH * 63) / 88);
    return { w, h: (w * 88) / 63 };
  }, [zone]);
  const fieldH = bed.h * (1 - PLATE_H_RATIO); // elements live above the plate zone (WYSIWYG)

  const pulled = pulledIndex != null ? composition.elements[pulledIndex] : undefined;
  // a HIDDEN slip leaves the bed entirely — no ring, no gestures (manifest P2 row 5 / murr)
  const pulledBox = pulled && !pulled.hidden && bed.w > 0 ? elementBox(pulled, bed.w, fieldH) : null;

  // gesture bookkeeping (refs — PanResponder callbacks must see current values)
  const stateRef = useRef({
    composition,
    pulledIndex,
    pulledBox,
    bedW: bed.w,
    fieldH,
  });
  stateRef.current = { composition, pulledIndex, pulledBox, bedW: bed.w, fieldH };
  const gestureRef = useRef<{
    mode: 'idle' | 'move' | 'scale';
    corner: { rx: number; ry: number } | null;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startSize: number;
    moved: boolean;
    began: boolean;
    downX: number;
    downY: number;
  }>({ mode: 'idle', corner: null, startX: 0, startY: 0, startW: 0, startH: 0, startSize: 0, moved: false, began: false, downX: 0, downY: 0 });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { pulledIndex: pi, pulledBox: pb, composition: c } = stateRef.current;
        const px = e.nativeEvent.locationX;
        const py = e.nativeEvent.locationY;
        const g = gestureRef.current;
        g.mode = 'idle';
        g.corner = null;
        g.moved = false;
        g.began = false;
        g.downX = px;
        g.downY = py;
        if (pi != null && pb) {
          const el = c.elements[pi];
          const corners = [
            { rx: 0, ry: 0 },
            { rx: 1, ry: 0 },
            { rx: 0, ry: 1 },
            { rx: 1, ry: 1 },
          ];
          const hit = corners.find(
            (k) => Math.abs(px - (pb.left + k.rx * pb.width)) <= 14 && Math.abs(py - (pb.top + k.ry * pb.height)) <= 14,
          );
          if (hit && el && !el.locked && !el.hidden) {
            g.mode = 'scale';
            g.corner = hit;
            g.startW = el.type === 'text' ? 0 : el.w;
            g.startH = el.type === 'text' ? 0 : el.h;
            g.startSize = el.type === 'text' ? el.size : 0;
            return;
          }
          if (inBox(px, py, pb) && el && !el.locked && !el.hidden) {
            g.mode = 'move';
            g.startX = el.x;
            g.startY = el.y;
            return;
          }
        }
      },
      onPanResponderMove: (_e, gs) => {
        const g = gestureRef.current;
        const { pulledIndex: pi, bedW, fieldH: fh, composition: c } = stateRef.current;
        if (Math.abs(gs.dx) + Math.abs(gs.dy) > 6) g.moved = true;
        if (g.mode === 'idle' || pi == null || bedW <= 0) return;
        const el = c.elements[pi];
        if (!el || el.locked || el.hidden) return;
        if (!g.began && g.moved) {
          g.began = true;
          onBeginGesture(); // one history entry per drag
        }
        if (!g.began) return;
        if (g.mode === 'move') {
          let nx = g.startX + gs.dx / bedW;
          let ny = g.startY + gs.dy / fh;
          const snapV = Math.abs(nx - 0.5) < 0.02;
          const snapH = Math.abs(ny - 0.5) < 0.02;
          if (snapV) nx = 0.5;
          if (snapH) ny = 0.5;
          setGuides((prev) => (prev.v === snapV && prev.h === snapH ? prev : { v: snapV, h: snapH }));
          onMove(pi, nx, ny);
        } else if (g.mode === 'scale' && g.corner) {
          const sx = (g.corner.rx === 1 ? gs.dx : -gs.dx) * 2;
          const sy = (g.corner.ry === 1 ? gs.dy : -gs.dy) * 2;
          if (el.type === 'text') {
            onResize(pi, 0, g.startSize + sy / fh);
          } else {
            onResize(pi, g.startW + sx / bedW, g.startH + sy / fh);
          }
        }
      },
      onPanResponderRelease: () => {
        const g = gestureRef.current;
        setGuides({ v: false, h: false });
        if (!g.moved) {
          // a TAP — select topmost under the touch; repeat-tap cycles deeper (CARD-08)
          const { composition: c, pulledIndex: pi, bedW, fieldH: fh } = stateRef.current;
          if (bedW <= 0) return;
          const hits: number[] = [];
          for (let i = c.elements.length - 1; i >= 0; i--) {
            const el = c.elements[i]!;
            if (el.hidden) continue;
            const [ux, uy] = unrotate(g.downX, g.downY, el, bedW, fh); // hit the DRAWN shape, not the AABB
            if (inBox(ux, uy, elementBox(el, bedW, fh))) hits.push(i);
          }
          if (!hits.length) {
            onPull(null);
          } else if (pi != null && hits.includes(pi)) {
            const next = hits[(hits.indexOf(pi) + 1) % hits.length]!;
            onPull(next === pi ? pi : next);
          } else {
            onPull(hits[0]!);
          }
        }
        g.mode = 'idle';
        g.began = false;
      },
      onPanResponderTerminate: () => {
        setGuides({ v: false, h: false });
        gestureRef.current.mode = 'idle';
        gestureRef.current.began = false;
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setZone((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  return (
    <View style={styles.zone} onLayout={onLayout}>
      {bed.w > 0 ? (
        <View style={[styles.bed, { width: bed.w + 24, height: bed.h + 24 }]}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <View style={{ width: bed.w, height: bed.h }}>
            <View pointerEvents="none">
              <SkiaErrorBoundary fallback={<View style={{ width: bed.w, height: bed.h, backgroundColor: theme.scr.panel }} />}>
                <Suspense fallback={<View style={{ width: bed.w, height: bed.h, backgroundColor: theme.scr.panel }} />}>
                  <LazyCardBed composition={composition} width={bed.w} height={bed.h} pulledIndex={pulledIndex} />
                </Suspense>
              </SkiaErrorBoundary>
            </View>
            {/* the thumbnail safe-area (board `.safe`) */}
            <View pointerEvents="none" style={styles.safe} />
            {/* center snap-guides (CARD-09) */}
            {guides.v ? <View pointerEvents="none" style={[styles.guideV, { left: bed.w / 2 }]} /> : null}
            {guides.h ? <View pointerEvents="none" style={[styles.guideH, { top: fieldH / 2 }]} /> : null}
            {/* the gesture surface — the skia bed never owns a touch */}
            <View style={StyleSheet.absoluteFill} {...pan.panHandlers} accessibilityLabel="Press bed" />
            {/* sel-ring + handles over the pulled element */}
            {pulledBox ? (
              <View pointerEvents="none" style={[styles.selRing, pulledBox]}>
                <View style={[styles.handle, { left: -5, top: -5 }]} />
                <View style={[styles.handle, { right: -5, top: -5 }]} />
                <View style={[styles.handle, { left: -5, bottom: -5 }]} />
                <View style={[styles.handle, { right: -5, bottom: -5 }]} />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      {pulledIndex != null ? (
        <View style={styles.isoChip} pointerEvents="none">
          <Text style={styles.isoText}>
            ISOLATION · <Text style={styles.isoOn}>ON</Text>
          </Text>
        </View>
      ) : null}
      {numPopOpen && pulled && pulledIndex != null ? (
        <NumPop
          element={pulled}
          bedW={bed.w}
          bedH={fieldH}
          onNudge={(field, delta) => nudge(field, delta, pulled, pulledIndex, bed.w, fieldH, { onBeginGesture, onMove, onResize, onRotate })}
          onSet={(field, value) => setAbs(field, value, pulled, pulledIndex, bed.w, fieldH, { onBeginGesture, onMove, onResize, onRotate })}
          onClose={onNumPopClose}
        />
      ) : null}
    </View>
  );
}

type PatchFns = {
  onBeginGesture: () => void;
  onMove: (i: number, x: number, y: number) => void;
  onResize: (i: number, w: number, h: number) => void;
  onRotate: (i: number, deg: number) => void;
};

function nudge(field: NumPopField, delta: number, e: CardElement, i: number, bedW: number, fieldH: number, fns: PatchFns) {
  if (e.locked) return; // the CARD-08 lock covers the numeric pair too (murr)
  fns.onBeginGesture();
  if (field === 'x') fns.onMove(i, e.x + delta / bedW, e.y);
  else if (field === 'y') fns.onMove(i, e.x, e.y + delta / fieldH);
  else if (field === 'rot') fns.onRotate(i, (e.rotation ?? 0) + delta);
  else if (e.type === 'text') fns.onResize(i, 0, e.size + delta / fieldH);
  else if (field === 'w') fns.onResize(i, e.w + delta / bedW, e.h);
  else fns.onResize(i, e.w, e.h + delta / fieldH);
}

function setAbs(field: NumPopField, value: number, e: CardElement, i: number, bedW: number, fieldH: number, fns: PatchFns) {
  if (e.locked) return; // the CARD-08 lock covers the numeric pair too (murr)
  fns.onBeginGesture();
  if (field === 'x') fns.onMove(i, value / bedW, e.y);
  else if (field === 'y') fns.onMove(i, e.x, value / fieldH);
  else if (field === 'rot') fns.onRotate(i, value);
  else if (e.type === 'text') fns.onResize(i, 0, value / fieldH);
  else if (field === 'w') fns.onResize(i, value / bedW, e.h);
  else fns.onResize(i, e.w, value / fieldH);
}

const styles = StyleSheet.create({
  zone: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  bed: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.35)', // the press-bed well over the workshop tone (scrim family)
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: 7, height: 7, borderColor: theme.scr.faint },
  tl: { left: 3, top: 3, borderLeftWidth: 1.5, borderTopWidth: 1.5 },
  tr: { right: 3, top: 3, borderRightWidth: 1.5, borderTopWidth: 1.5 },
  bl: { left: 3, bottom: 3, borderLeftWidth: 1.5, borderBottomWidth: 1.5 },
  br: { right: 3, bottom: 3, borderRightWidth: 1.5, borderBottomWidth: 1.5 },
  safe: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '6%',
    bottom: '12%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,159,67,0.35)', // scr.accent at guide opacity
  },
  guideV: { position: 'absolute', top: '-4%', bottom: '-4%', width: 1, backgroundColor: theme.scr.accent, opacity: 0.8 },
  guideH: { position: 'absolute', left: '-4%', right: '-4%', height: 1, backgroundColor: theme.scr.accent, opacity: 0.8 },
  selRing: { position: 'absolute', borderWidth: 1.5, borderColor: theme.scr.accent },
  handle: {
    position: 'absolute',
    width: 9,
    height: 9,
    backgroundColor: theme.brand.cream,
    borderWidth: 1.5,
    borderColor: theme.scr.accent,
  },
  isoChip: {
    position: 'absolute',
    right: theme.space.md,
    top: theme.space.md,
    backgroundColor: theme.scr.bg,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  isoText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  isoOn: { color: theme.scr.ink },
});
