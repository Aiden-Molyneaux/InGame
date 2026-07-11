import { Suspense, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { theme } from '../../theme';
import { SkiaErrorBoundary } from '../SkiaErrorBoundary';
import { LazyCardBed } from './lazySkia';
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

// the rotation handle (round 4) — a knob this far off the ring's top edge; drag it to rotate.
// Light snap at the quarters (0/90/180/270) within this tolerance.
const ROT_KNOB_DIST = 24;
const ROT_SNAP_DEG = 5;

/** the knob flips BELOW the box when the top side would leave the gesture surface (murr F3) */
const knobBelow = (b: Box) => b.top - ROT_KNOB_DIST - 10 < 0;

export function CanvasStage({
  composition,
  pulledIndex,
  onPull,
  onBeginGesture,
  onMove,
  onResize,
  onRotate,
  isolationOn,
  onToggleIsolation,
  showHandles = true,
}: {
  composition: CardComposition;
  pulledIndex: number | null;
  onPull: (i: number | null) => void;
  /** called ONCE at gesture start so the whole drag is one history entry (undo granularity) */
  onBeginGesture: () => void;
  onMove: (i: number, x: number, y: number) => void; // normalized
  onResize: (i: number, w: number, h: number) => void; // normalized (text: h → size)
  /** degrees — the sel-ring rotation handle (round 4; the TransformDrawer slider is its CARD-16 pair) */
  onRotate: (i: number, deg: number) => void;
  /** CR-05 isolation toggle — when off, the bed stops ghosting the other elements */
  isolationOn: boolean;
  onToggleIsolation: () => void;
  /** the RESIZE BOX toggle — when false the WHOLE sel-ring hides (border + handles + corner grab; round 3) */
  showHandles?: boolean;
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

  // gesture bookkeeping (refs — the PanResponder is created ONCE, so its handlers must read current
  // values AND current callbacks through this ref; a frozen `onPull` called the mount-time `pull`
  // whose stale pulledIndex/elements re-armed the RESET-rebase bug on bed re-taps (murr round 3)
  const stateRef = useRef({
    composition,
    pulledIndex,
    pulledBox,
    bedW: bed.w,
    fieldH,
    showHandles,
    onPull,
    onRotate,
  });
  stateRef.current = { composition, pulledIndex, pulledBox, bedW: bed.w, fieldH, showHandles, onPull, onRotate };
  const gestureRef = useRef<{
    mode: 'idle' | 'move' | 'scale' | 'rotate';
    corner: { rx: number; ry: number } | null;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startSize: number;
    /** rotate mode: the touch's start angle (deg, screen space) minus the element's start rotation */
    rotOffset: number;
    moved: boolean;
    began: boolean;
    downX: number;
    downY: number;
  }>({ mode: 'idle', corner: null, startX: 0, startY: 0, startW: 0, startH: 0, startSize: 0, rotOffset: 0, moved: false, began: false, downX: 0, downY: 0 });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { pulledIndex: pi, pulledBox: pb, composition: c, showHandles: sh, bedW, fieldH: fh } = stateRef.current;
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
          if (!el || el.locked || el.hidden) return;
          // the ring ROTATES with the slip (round 4) — so grab tests run in the element's UNROTATED
          // space: unrotate the touch around the render anchor (the same pivot buildCard uses).
          const [ux, uy] = unrotate(px, py, el, bedW, fh);
          if (sh) {
            // CR-10 — larger corner hit-areas: a 22px grab radius so the sel-ring handles are easy to
            // catch on a small bed. Corners test FIRST so they win a tie with the knob's square on
            // narrow slips (murr round 4 F5). gate-5 (murr m2): RESIZE BOX OFF disables both grabs.
            const hit = [
              { rx: 0, ry: 0 },
              { rx: 1, ry: 0 },
              { rx: 0, ry: 1 },
              { rx: 1, ry: 1 },
            ].find(
              (k) => Math.abs(ux - (pb.left + k.rx * pb.width)) <= 22 && Math.abs(uy - (pb.top + k.ry * pb.height)) <= 22,
            );
            if (hit) {
              g.mode = 'scale';
              g.corner = hit;
              g.startW = el.type === 'text' ? 0 : el.w;
              g.startH = el.type === 'text' ? 0 : el.h;
              g.startSize = el.type === 'text' ? el.size : 0;
              return;
            }
            // the rotation handle — a knob off the ring's top-centre; it FLIPS below the box when the
            // top side would leave the gesture surface (murr round 4 F3 — a knob drawn above the bed
            // was visible but ungrabbable). knobSide() keeps the draw + the hit-test in agreement.
            const knobX = pb.left + pb.width / 2;
            const knobY = knobBelow(pb) ? pb.top + pb.height + ROT_KNOB_DIST : pb.top - ROT_KNOB_DIST;
            if (Math.abs(ux - knobX) <= 22 && Math.abs(uy - knobY) <= 22) {
              g.mode = 'rotate';
              // screen-space angle from the anchor to the touch, minus the current rotation
              const aDeg = (Math.atan2(py - el.y * fh, px - el.x * bedW) * 180) / Math.PI;
              g.rotOffset = aDeg - (el.rotation ?? 0);
              return;
            }
          }
          if (inBox(ux, uy, pb)) {
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
          // a rotated slip's corners move along ROTATED axes — rotate the screen delta into the
          // element's local space before applying it (round 4; the ring rotates with the slip now)
          const a = (-(el.rotation ?? 0) * Math.PI) / 180;
          const ldx = gs.dx * Math.cos(a) - gs.dy * Math.sin(a);
          const ldy = gs.dx * Math.sin(a) + gs.dy * Math.cos(a);
          const sx = (g.corner.rx === 1 ? ldx : -ldx) * 2;
          const sy = (g.corner.ry === 1 ? ldy : -ldy) * 2;
          if (el.type === 'text') {
            onResize(pi, 0, g.startSize + sy / fh);
          } else {
            onResize(pi, g.startW + sx / bedW, g.startH + sy / fh);
          }
        } else if (g.mode === 'rotate') {
          // the touch's live screen angle around the anchor, minus the grab offset (round 4)
          const tx = g.downX + gs.dx;
          const ty = g.downY + gs.dy;
          const aDeg = (Math.atan2(ty - el.y * fh, tx - el.x * bedW) * 180) / Math.PI;
          let deg = (((aDeg - g.rotOffset) % 360) + 360) % 360;
          // a light snap at the quarters (0/90/180/270)
          const quarter = Math.round(deg / 90) * 90;
          if (Math.abs(deg - quarter) <= ROT_SNAP_DEG) deg = quarter % 360;
          stateRef.current.onRotate(pi, deg);
        }
      },
      onPanResponderRelease: () => {
        const g = gestureRef.current;
        setGuides({ v: false, h: false });
        // a non-moved ROTATE/SCALE grant is a fumbled handle grab — a NO-OP, never a tap-select
        // (murr round 4 🔴F1: the knob point sits outside every element box, so the old tap branch
        // deselected the slip — or selected whatever lay underneath — on every fumbled grab)
        if (!g.moved && (g.mode === 'idle' || g.mode === 'move')) {
          // a TAP — select topmost under the touch; repeat-tap cycles deeper (CARD-08). Read the
          // LIVE onPull through stateRef — the mount-time prop closed over stale state (murr).
          const { composition: c, pulledIndex: pi, bedW, fieldH: fh, onPull: livePull } = stateRef.current;
          if (bedW <= 0) return;
          const hits: number[] = [];
          for (let i = c.elements.length - 1; i >= 0; i--) {
            const el = c.elements[i]!;
            if (el.hidden) continue;
            const [ux, uy] = unrotate(g.downX, g.downY, el, bedW, fh); // hit the DRAWN shape, not the AABB
            if (inBox(ux, uy, elementBox(el, bedW, fh))) hits.push(i);
          }
          if (!hits.length) {
            livePull(null);
          } else if (pi != null && hits.includes(pi)) {
            const next = hits[(hits.indexOf(pi) + 1) % hits.length]!;
            livePull(next === pi ? pi : next);
          } else {
            livePull(hits[0]!);
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
                  <LazyCardBed composition={composition} width={bed.w} height={bed.h} pulledIndex={isolationOn ? pulledIndex : null} />
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
            {/* sel-ring + handles over the pulled element (larger cream handles — CR-10). RESIZE BOX
                OFF hides the WHOLE ring — border AND handles (round 3). Round 4: the ring ROTATES
                WITH the slip (same pivot as the renderer — the element anchor) and carries a
                ROTATION KNOB off its top edge (drag to rotate; the TransformDrawer slider is the
                CARD-16 pair). Hit-tests unrotate the touch, so the drawn ring and the grabs agree. */}
            {pulledBox && showHandles && pulled ? (
              <View
                pointerEvents="none"
                style={[
                  styles.selRing,
                  pulledBox,
                  pulled.rotation
                    ? {
                        transform: [{ rotate: `${pulled.rotation}deg` }],
                        // the renderer rotates around the ANCHOR (e.x, e.y) — for text that sits
                        // above the box centre, so pin the origin to it
                        transformOrigin: [
                          pulledBox.width / 2,
                          pulled.type === 'text' ? pulled.size * fieldH * 0.9 : pulledBox.height / 2,
                          0,
                        ],
                      }
                    : null,
                ]}
              >
                <View style={[styles.handle, { left: -6, top: -6 }]} />
                <View style={[styles.handle, { right: -6, top: -6 }]} />
                <View style={[styles.handle, { left: -6, bottom: -6 }]} />
                <View style={[styles.handle, { right: -6, bottom: -6 }]} />
                {/* the rotation handle — stem + knob off the top edge; flips below when the box sits
                    near the bed's top so it stays grabbable (murr F3 — hit-test agrees via knobBelow) */}
                {knobBelow(pulledBox) ? (
                  <>
                    <View style={[styles.rotStem, { left: pulledBox.width / 2 - 0.75, bottom: -(ROT_KNOB_DIST - 7), height: ROT_KNOB_DIST - 7 }]} />
                    <View style={[styles.rotKnob, { left: pulledBox.width / 2 - 7, bottom: -ROT_KNOB_DIST - 7 }]} />
                  </>
                ) : (
                  <>
                    <View style={[styles.rotStem, { left: pulledBox.width / 2 - 0.75, top: -(ROT_KNOB_DIST - 7), height: ROT_KNOB_DIST - 7 }]} />
                    <View style={[styles.rotKnob, { left: pulledBox.width / 2 - 7, top: -ROT_KNOB_DIST - 7 }]} />
                  </>
                )}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      {/* CR-05 — the ISOLATION stat is now a session TOGGLE (tap to stop the others ghosting) */}
      {pulledIndex != null ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Isolation"
          accessibilityState={{ checked: isolationOn }}
          onPress={onToggleIsolation}
          style={[styles.isoChip, isolationOn && styles.isoChipOn]}
        >
          <Text style={styles.isoText}>
            ISOLATION · <Text style={isolationOn ? styles.isoOn : styles.isoOff}>{isolationOn ? 'ON' : 'OFF'}</Text>
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
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
    width: 12,
    height: 12,
    backgroundColor: theme.brand.cream,
    borderWidth: 1.5,
    borderColor: theme.scr.accent,
  },
  // the rotation handle — a cream knob off the ring's top edge + a hairline stem (round 4; F-07 square)
  rotKnob: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: theme.brand.cream,
    borderWidth: 1.5,
    borderColor: theme.scr.accent,
  },
  rotStem: { position: 'absolute', width: 1.5, backgroundColor: theme.scr.accent },
  // round 4 — the chip rides the zone's top edge (clear of the card) + reads accent when ON
  isoChip: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: theme.scr.bg,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  isoChipOn: { borderWidth: 1.5, borderColor: theme.scr.accent, backgroundColor: 'rgba(255,159,67,0.08)' },
  isoText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  isoOn: { color: theme.scr.accent },
  isoOff: { color: theme.scr.faint },
});
