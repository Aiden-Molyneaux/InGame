import { Suspense, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { SkiaErrorBoundary } from '../SkiaErrorBoundary';
import { Slip, SLIP_GAP, SLIP_LIFT, SLIP_PANE_H, SLIP_PANE_W, SLIP_W } from './Slip';
import { LazyBaseStrip, LazyGlyphStrip } from './lazySkia';
import { BASE_GRADIENTS } from '../../styler/roster';
import type { StripCell } from '../../render/buildCard';
import { MAX_ELEMENTS, type CardComposition, type CardElement } from '../../render/composition';

// LayerRack (component-map §8b / board P1/P2/P5) — the rail at the foot: each layer a physical
// Slip; TAP pulls to isolate (CARD-08 solved spatially); Z-ORDER IS THE RACK ORDER — long-press-
// drag a slip left/right reorders (the gesture) and the ops row's ◂ ▸ keys reorder without a
// gesture (CARD-16/OQ-105, built alongside). Long-press ARMS drag-Z here and asks the parent to
// OPEN the ops row via `onOps` — round 5: the ops/rename rows themselves render in the
// CanvasSurface bench-button slot (constant height, no panel shift), not under the rail. The
// cap-meter holds the line at 30 (OQ-008), red at cap. The pane GLYPHS all draw in ONE strip
// canvas behind the Slip chrome — one WebGL context for the whole rack, never one per slip.
// CR-08 (gate-5, revised device-walk): base is no longer "added" — and no longer a separate pinned
// bottom row. It rides IN the horizontal slip rail as a non-deletable BASE slip (a composition
// field, not an element: no cap-30 / Z impact / ops / drag). Round 3: the rail reads Z-ASCENDING
// left→right, so the base (bottom-most) LEADS the rail. Tapping it opens the colour-only EDIT
// sheet via `onEditBase`; `baseEditing` highlights it while that sheet is open.

const SOLID_BASES = ['#1c1a2e', '#0d0b1e'];

const SLIP_STRIDE = SLIP_W + SLIP_GAP; // one drag "notch"

export function LayerRack({
  elements,
  pulledIndex,
  onPull,
  onReorder,
  onOps,
  currentBase,
  onEditBase,
  baseEditing = false,
}: {
  elements: CardElement[];
  pulledIndex: number | null;
  onPull: (i: number | null) => void;
  onReorder: (i: number, dir: -1 | 1) => void;
  /** long-press pulled slip i — the parent opens the ops row in the bench-button slot (round 5) */
  onOps: (i: number) => void;
  // CR-08 gate-5: the base pseudo-slip. Tapping it OPENS the colour-only EDIT sheet (onEditBase);
  // `baseEditing` highlights it while that sheet is open. `currentBase` drives its colour preview.
  currentBase?: CardComposition['base'];
  onEditBase?: () => void;
  baseEditing?: boolean;
}) {

  // ── drag-Z (long-press arms, horizontal pan reorders one notch per stride) ────────────────────
  // CR-06 (gate-5): the HELD slip stays highlighted through the z-stack. `dragIndex` tracks the held
  // slip's LIVE index as it walks past neighbours — the highlight follows the slip's identity, not
  // the static slot it overlaps. The parent keeps `pulledIndex` in lockstep, but driving the raised
  // treatment off drag-local state closes the async round-trip gap (no one-frame jump to the displaced
  // neighbour).
  const dragRef = useRef<{ index: number; moved: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const lenRef = useRef(elements.length);
  lenRef.current = elements.length;
  // the PanResponder is created once — a frozen `onReorder` called the MOUNT-TIME opReorder, whose
  // stale pulledIndex broke the pull-highlight lockstep after a drag (murr round 3): read live.
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const disarmDrag = () => {
    dragRef.current = null;
    setDragging(false);
    setDragIndex(null);
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => dragRef.current !== null,
      onPanResponderMove: (_e, g) => {
        const d = dragRef.current;
        if (!d) return;
        const notches = Math.trunc((g.dx - d.moved) / SLIP_STRIDE);
        if (notches !== 0) {
          const dir: -1 | 1 = notches > 0 ? 1 : -1;
          const target = d.index + dir;
          if (target < 0 || target >= lenRef.current) return; // a no-op reorder must not advance the notch (murr)
          onReorderRef.current(d.index, dir);
          d.index = target;
          d.moved += dir * SLIP_STRIDE;
          setDragIndex(target); // the highlight rides the held slip to its new slot
        }
      },
      onPanResponderRelease: disarmDrag,
      onPanResponderTerminate: disarmDrag,
    }),
  ).current;

  const atCap = elements.length >= MAX_ELEMENTS;

  const armOps = (i: number) => {
    onPull(i);
    onOps(i); // the parent renders the ops row in the bench-button slot (round 5 — no panel shift)
    dragRef.current = { index: i, moved: 0 }; // the same long-press arms drag-Z — moving takes over
    setDragging(true);
    setDragIndex(i);
  };

  // during a drag the held slip owns the highlight; otherwise it's the pulled slip (CR-06)
  const heldIndex = dragging ? dragIndex : pulledIndex;

  return (
    // onTouchEnd disarms on native; onPointerUp is the WEB disarm — mouse input never fires
    // touchend, and an armed dragRef otherwise captures every later press over the rack (murr)
    <View style={styles.rack} onTouchEnd={disarmDrag} onPointerUp={disarmDrag} {...pan.panHandlers}>
      {/* round 5 — the caption row reverts to round 3 (caption above the rail, chip right) */}
      <View style={styles.head}>
        <Text style={styles.headText}>
          {pulledIndex == null ? 'THE SLIPS — PULL ONE TO WORK IT' : 'LONG-PRESS FOR OPS · DRAG TO REORDER Z'}
        </Text>
        <Text style={[styles.capMeter, atCap && styles.capMeterFull]}>
          {elements.length} / {MAX_ELEMENTS}
        </Text>
      </View>
      <ScrollView horizontal scrollEnabled={!dragging} showsHorizontalScrollIndicator={false}>
        {/* the rail: the base slip PLUS the element slips — the base is a slip in the SAME row that
            can't be deleted (gate-5). Round 3: the rail reads Z-ASCENDING left→right, so the base
            (the bottom-most layer) LEADS the rail and the topmost element sits at the rail end. */}
        <View style={styles.railRow}>
          <BaseRailSlip base={currentBase} pulled={baseEditing} onPress={onEditBase} />
          {elements.length ? (
            <View style={{ width: elements.length * SLIP_STRIDE - SLIP_GAP, paddingTop: SLIP_LIFT }}>
              {/* ONE canvas for every pane glyph (context budget); cells lift in sync with the chrome */}
              <View pointerEvents="none" style={styles.stripWrap}>
                <SkiaErrorBoundary fallback={null}>
                  <Suspense fallback={null}>
                    <StripView elements={elements} pulledIndex={heldIndex} />
                  </Suspense>
                </SkiaErrorBoundary>
              </View>
              <View style={styles.slips}>
                {elements.map((e, i) => (
                  <Slip
                    key={i}
                    element={e}
                    index={i}
                    pulled={i === heldIndex}
                    onPress={() => onPull(i === pulledIndex ? null : i)}
                    onLongPress={() => armOps(i)}
                  />
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>NO SLIPS YET — ADD ONE TO START LAYERING</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** The rack's one glyph canvas — cells align 1:1 under the Slip chrome (stride/lift shared). */
function StripView({ elements, pulledIndex }: { elements: CardElement[]; pulledIndex: number | null }) {
  const cells = useMemo<StripCell[]>(
    () =>
      elements.map((e, i) => ({
        el: e,
        dim: e.hidden ? 0.42 : undefined,
        lift: i === pulledIndex ? 0 : SLIP_LIFT,
        bg: theme.scr.panelHi,
      })),
    [elements, pulledIndex],
  );
  const w = elements.length * SLIP_STRIDE;
  const h = SLIP_PANE_H + SLIP_LIFT;
  return (
    <LazyGlyphStrip
      cells={cells}
      cellW={SLIP_PANE_W - 2}
      cellH={SLIP_PANE_H - 2}
      strideX={SLIP_STRIDE}
      strideY={0}
      cols={Math.max(1, elements.length)}
      width={w}
      height={h}
    />
  );
}

function sameBase(a: CardComposition['base'] | undefined, b: CardComposition['base']): boolean {
  if (!a) return false;
  if ('gradient' in a && 'gradient' in b) return a.gradient[0] === b.gradient[0] && a.gradient[1] === b.gradient[1];
  if ('fill' in a && 'fill' in b) return a.fill === b.fill;
  return false;
}

const BASE_OPTIONS: Array<CardComposition['base']> = [
  ...BASE_GRADIENTS.map((g) => ({ gradient: g }) as CardComposition['base']),
  ...SOLID_BASES.map((fill) => ({ fill }) as CardComposition['base']),
];

/**
 * CR-08 (gate-5) — the base as a non-deletable SLIP inside the horizontal rail; round 3 seats it at
 * the rail HEAD (the rail reads z-ascending L→R and the base is the bottom-most layer). It matches
 * the Slip footprint (pane + name) so it reads as "a slip in the rail that can't be deleted", shows
 * the current base through the shared one-canvas BaseStrip (never its own <Canvas> — one context),
 * and TAP opens the colour-only EDIT sheet (onEditBase). It is NOT an element: no pull-index, no
 * cap, no Z-order, no ops row, no drag. `pulled` (= baseEditing) highlights it while its EDIT is open.
 */
function BaseRailSlip({
  base,
  pulled,
  onPress,
}: {
  base: CardComposition['base'] | undefined;
  pulled: boolean;
  onPress?: () => void;
}) {
  const preview = base ?? BASE_OPTIONS[0]!;
  return (
    <View style={[baseStyles.slip, pulled && baseStyles.slipPulled]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Base slip${pulled ? ', pulled' : ''} — colour only, non-deletable`}
        accessibilityState={{ selected: pulled, disabled: !onPress }}
        disabled={!onPress}
        onPress={onPress}
        style={baseStyles.press}
      >
        <View style={[baseStyles.pane, pulled && baseStyles.panePulled]}>
          <View pointerEvents="none" style={baseStyles.paneStrip}>
            <SkiaErrorBoundary fallback={null}>
              <Suspense fallback={null}>
                <LazyBaseStrip bases={[preview]} cell={SLIP_PANE_W - 2} stride={SLIP_STRIDE} width={SLIP_PANE_W - 2} height={SLIP_PANE_H - 2} />
              </Suspense>
            </SkiaErrorBoundary>
          </View>
        </View>
        <Text style={baseStyles.label} numberOfLines={1}>
          BASE
        </Text>
      </Pressable>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  // matches the Slip footprint so the base reads as an inline rail item (a trailing gap divides it
  // from the element slips — round 3: the base LEADS the z-ascending rail); never lifts/drags.
  slip: { width: SLIP_W, alignItems: 'center', marginRight: SLIP_GAP, paddingTop: SLIP_LIFT },
  slipPulled: {},
  press: { alignItems: 'center', gap: 3 },
  pane: {
    width: SLIP_PANE_W,
    height: SLIP_PANE_H,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panelHi,
  },
  panePulled: { borderWidth: 1.5, borderColor: theme.scr.accent },
  paneStrip: { position: 'absolute', left: 0, top: 0 },
  label: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5, maxWidth: SLIP_W },
});

const styles = StyleSheet.create({
  rack: { borderTopWidth: 1, borderTopColor: theme.scr.hairline, paddingTop: theme.space.md, gap: theme.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  headText: { flex: 1, fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  capMeter: {
    // CR-03 (gate-5): orange (scr.accent), not gold — gold is currency/authorship only (F-02)
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro,
    color: theme.scr.accent,
    borderWidth: 1,
    borderColor: 'rgba(255,159,67,0.5)',
    backgroundColor: 'rgba(255,159,67,0.08)',
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  capMeterFull: {
    color: theme.brand.alert,
    borderColor: 'rgba(227,65,78,0.55)',
    backgroundColor: 'rgba(227,65,78,0.1)',
  },
  empty: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 1, paddingVertical: theme.space.md, alignSelf: 'center' },
  railRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stripWrap: { position: 'absolute', left: 3, top: 1 }, // pane inset (border 1 + centering 2)
  slips: { flexDirection: 'row', gap: SLIP_GAP },
});
