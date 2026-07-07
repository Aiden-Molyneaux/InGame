import { Suspense, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';
import { SkiaErrorBoundary } from '../SkiaErrorBoundary';
import { Slip, SLIP_GAP, SLIP_LIFT, SLIP_PANE_H, SLIP_PANE_W, SLIP_W } from './Slip';
import { LazyGlyphStrip } from './lazySkia';
import type { StripCell } from '../../render/buildCard';
import { MAX_ELEMENTS, type CardElement } from '../../render/composition';

// LayerRack (component-map §8b / board P1/P2/P5) — the Ops dashboard at the foot: each layer a
// physical Slip; TAP pulls to isolate (CARD-08 solved spatially); Z-ORDER IS THE RACK ORDER —
// long-press-drag a slip left/right reorders (the gesture) and the ops row's ◂ ▸ keys reorder
// without a gesture (CARD-16/OQ-105, built alongside). Long-press (or the pulled slip's ⋯ badge)
// opens the ops row: RENAME · LOCK · HIDE · DUPLICATE · GROUP (at-scale, disabled) · ◂ ▸ · X·Y ·
// DELETE (undo-covered — 0040's ConfirmSheet is reserved for non-undoable destroys). The
// cap-meter holds the line at 30 (OQ-008), red at cap. The pane GLYPHS all draw in ONE strip
// canvas behind the Slip chrome — one WebGL context for the whole rack, never one per slip.

const SLIP_STRIDE = SLIP_W + SLIP_GAP; // one drag "notch"

export function LayerRack({
  elements,
  pulledIndex,
  onPull,
  onReorder,
  onPatch,
  onDuplicate,
  onDelete,
  onNumPop,
}: {
  elements: CardElement[];
  pulledIndex: number | null;
  onPull: (i: number | null) => void;
  onReorder: (i: number, dir: -1 | 1) => void;
  onPatch: (i: number, patch: Partial<CardElement>) => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onNumPop: () => void;
}) {
  const [opsOpen, setOpsOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  // ── drag-Z (long-press arms, horizontal pan reorders one notch per stride) ────────────────────
  const dragRef = useRef<{ index: number; moved: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const lenRef = useRef(elements.length);
  lenRef.current = elements.length;
  const disarmDrag = () => {
    dragRef.current = null;
    setDragging(false);
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
          onReorder(d.index, dir);
          d.index = target;
          d.moved += dir * SLIP_STRIDE;
        }
      },
      onPanResponderRelease: disarmDrag,
      onPanResponderTerminate: disarmDrag,
    }),
  ).current;

  const pulled = pulledIndex != null ? elements[pulledIndex] : undefined;
  const atCap = elements.length >= MAX_ELEMENTS;

  const armOps = (i: number) => {
    onPull(i);
    setOpsOpen(true);
    setRenaming(false);
    dragRef.current = { index: i, moved: 0 }; // the same long-press arms drag-Z — moving takes over
    setDragging(true);
  };

  const startRename = () => {
    if (pulledIndex == null || !pulled) return;
    setRenameDraft(pulled.name ?? '');
    setRenaming(true);
  };

  return (
    // onTouchEnd disarms on native; onPointerUp is the WEB disarm — mouse input never fires
    // touchend, and an armed dragRef otherwise captures every later press over the rack (murr)
    <View style={styles.rack} onTouchEnd={disarmDrag} onPointerUp={disarmDrag} {...pan.panHandlers}>
      <View style={styles.head}>
        <Text style={styles.headText}>
          {pulledIndex == null ? 'THE SLIPS — PULL ONE TO WORK IT' : 'LONG-PRESS FOR OPS · DRAG TO REORDER Z'}
        </Text>
        <Text style={[styles.capMeter, atCap && styles.capMeterFull]}>
          {elements.length} / {MAX_ELEMENTS}
        </Text>
      </View>
      {elements.length === 0 ? (
        <Text style={styles.empty}>NO SLIPS YET — ADD ONE TO START LAYERING</Text>
      ) : (
        <ScrollView horizontal scrollEnabled={!dragging} showsHorizontalScrollIndicator={false}>
          <View style={{ width: elements.length * SLIP_STRIDE - SLIP_GAP, paddingTop: SLIP_LIFT }}>
            {/* ONE canvas for every pane glyph (context budget); cells lift in sync with the chrome */}
            <View pointerEvents="none" style={styles.stripWrap}>
              <SkiaErrorBoundary fallback={null}>
                <Suspense fallback={null}>
                  <StripView elements={elements} pulledIndex={pulledIndex} />
                </Suspense>
              </SkiaErrorBoundary>
            </View>
            <View style={styles.slips}>
              {elements.map((e, i) => (
                <Slip
                  key={i}
                  element={e}
                  index={i}
                  pulled={i === pulledIndex}
                  onPress={() => {
                    setOpsOpen(false);
                    setRenaming(false);
                    onPull(i === pulledIndex ? null : i);
                  }}
                  onLongPress={() => armOps(i)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {opsOpen && pulledIndex != null && pulled ? (
        renaming ? (
          <View style={styles.renameRow}>
            <TextInput
              value={renameDraft}
              onChangeText={setRenameDraft}
              maxLength={24}
              autoFocus
              placeholder="Slip name"
              placeholderTextColor={theme.scr.faint}
              style={styles.renameInput}
              accessibilityLabel="Slip name"
            />
            <Op label="✓ SAVE" onPress={() => { onPatch(pulledIndex, { name: renameDraft.trim() || undefined }); setRenaming(false); }} />
            <Op label="CANCEL" onPress={() => setRenaming(false)} />
          </View>
        ) : (
          <View style={styles.opsRow}>
            <Op label="RENAME" onPress={startRename} />
            <Op label={pulled.locked ? 'UNLOCK' : 'LOCK'} onPress={() => onPatch(pulledIndex, { locked: pulled.locked ? undefined : true })} />
            <Op label={pulled.hidden ? 'SHOW' : 'HIDE'} onPress={() => onPatch(pulledIndex, { hidden: pulled.hidden ? undefined : true })} />
            <Op label="DUPLICATE" disabled={atCap} onPress={() => onDuplicate(pulledIndex)} />
            {/* multi-select + group ride the CARD-08 at-scale pass — present, honest, disabled */}
            <Op label="GROUP" disabled onPress={() => {}} />
            <Op label="◂" disabled={pulledIndex === 0} onPress={() => onReorder(pulledIndex, -1)} accessibilityLabel="Move slip back" />
            <Op label="▸" disabled={pulledIndex === elements.length - 1} onPress={() => onReorder(pulledIndex, 1)} accessibilityLabel="Move slip forward" />
            <Op label="X·Y" disabled={!!pulled.locked} onPress={onNumPop} accessibilityLabel="Numeric position and size" />
            <Op label="DELETE" danger onPress={() => { setOpsOpen(false); onDelete(pulledIndex); }} />
          </View>
        )
      ) : null}
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

function Op({
  label,
  onPress,
  disabled = false,
  danger = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[opStyles.op, disabled && opStyles.disabled]}
    >
      <Text style={[opStyles.text, danger && opStyles.danger]}>{label}</Text>
    </Pressable>
  );
}

const opStyles = StyleSheet.create({
  op: {
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panel,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm + 1,
  },
  disabled: { opacity: 0.4 },
  text: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.ink, letterSpacing: 0.5 },
  danger: { color: theme.brand.alert },
});

const styles = StyleSheet.create({
  rack: { borderTopWidth: 1, borderTopColor: theme.scr.hairline, paddingTop: theme.space.md, gap: theme.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  headText: { flex: 1, fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  capMeter: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro,
    color: theme.brand.gold,
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.5)',
    backgroundColor: 'rgba(255,210,63,0.08)',
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  capMeterFull: {
    color: theme.brand.alert,
    borderColor: 'rgba(227,65,78,0.55)',
    backgroundColor: 'rgba(227,65,78,0.1)',
  },
  empty: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 1, paddingVertical: theme.space.md },
  stripWrap: { position: 'absolute', left: 3, top: 1 }, // pane inset (border 1 + centering 2)
  slips: { flexDirection: 'row', gap: SLIP_GAP },
  opsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm + 1 },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  renameInput: {
    flex: 1,
    fontFamily: theme.font.screen,
    fontSize: theme.type.body,
    color: theme.scr.ink,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
});
