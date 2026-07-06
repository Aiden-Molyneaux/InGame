import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { CanvasStage } from './CanvasStage';
import { LayerRack } from './LayerRack';
import { EditBar } from './EditBar';
import { AssetShelf } from './AssetShelf';
import { EditSlipSheet } from './EditSlipSheet';
import { PressSheet } from './PressSheet';
import { ProofView } from './ProofView';
import { ScreenButton } from '../ScreenButton';
import {
  addElement,
  duplicateElement,
  moveElement,
  patchElement,
  removeElement,
  reorderElement,
  replaceElement,
  resizeElement,
  rotateElement,
} from '../../canvas/ops';
import { MAX_ELEMENTS, type CardComposition, type CardElement } from '../../render/composition';

// CanvasSurface — the Canvas POSTURE of the one card-editor session (decision 0014 stage 3;
// CARD-24a/0066 §6: the posture switch edits the SAME draft row; the Styler route owns the
// document, the autosave, the snapshot and the two-door exits — this surface only patches through
// the one `patchDraft` pipeline). ◂ returns TO THE STYLER (the session continues — never an exit);
// the PressSheet's SAVE PRIVATE runs the Styler's one quiet-exit implementation. Publish is
// EXPECTED(M5 · 0062) — drawn disabled on the PressSheet.

export type CanvasPatch = (fn: (d: CardComposition) => CardComposition, opts?: { history?: boolean }) => void;

export function CanvasSurface({
  title,
  composition,
  subLine,
  inlineError,
  patchDraft,
  beginGesture,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  busyExit,
  onBackToStyler,
  onSavePrivate,
}: {
  title: string;
  composition: CardComposition;
  subLine: string;
  inlineError: string | null;
  patchDraft: CanvasPatch;
  /** push ONE history entry for the coming continuous mutation run (drag granularity) */
  beginGesture: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  busyExit: boolean;
  onBackToStyler: () => void;
  onSavePrivate: () => void;
}) {
  const [pulledIndex, setPulledIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pressOpen, setPressOpen] = useState(false);
  const [proofing, setProofing] = useState(false);
  const [numPopOpen, setNumPopOpen] = useState(false);

  const elements = composition.elements;
  const pulled = pulledIndex != null ? elements[pulledIndex] : undefined;
  const atCap = elements.length >= MAX_ELEMENTS;

  // the scoped RESET SLIP snapshot — the pulled element as it was when PULLED (CARD-09)
  const pullSnapshotRef = useRef<{ index: number; el: CardElement } | null>(null);
  const pull = (i: number | null) => {
    setPulledIndex(i);
    setNumPopOpen(false);
    pullSnapshotRef.current = i != null && elements[i] ? { index: i, el: elements[i]! } : null;
  };

  // Android hardware back = ◂ (back to the Styler posture), parity with the head key
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackToStyler();
      return true;
    });
    return () => sub.remove();
  }, [onBackToStyler]);

  // the P1 entry beat — the shell-swing dressing fades out (reduce-motion: no decor, CARD-16)
  const swing = useRef(new Animated.Value(0.45)).current;
  const [decorDone, setDecorDone] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!mounted) return;
      if (reduce) {
        setDecorDone(true);
        return;
      }
      Animated.timing(swing, { toValue: 0, duration: 1600, delay: 500, useNativeDriver: true }).start(() => mounted && setDecorDone(true));
    });
    return () => {
      mounted = false;
    };
  }, [swing]);

  // PROOF: hold = momentary, tap = toggle (the CARD-16 pair)
  const proofDownAt = useRef(0);
  const proofPressIn = () => {
    proofDownAt.current = Date.now();
    setProofing(true);
    setNumPopOpen(false);
  };
  const proofPressOut = () => {
    if (Date.now() - proofDownAt.current > 450) setProofing(false); // a HOLD releases
    // a quick TAP leaves it stamped — the next tap lifts it
  };
  const proofTapWhileOn = () => setProofing(false);

  // ── ops wrappers — every mutation runs the one patch pipeline ─────────────────────────────────
  const opMove = (i: number, x: number, y: number) => patchDraft((d) => moveElement(d, i, x, y), { history: false });
  const opResize = (i: number, w: number, h: number) => patchDraft((d) => resizeElement(d, i, w, h), { history: false });
  const opRotate = (i: number, deg: number) => patchDraft((d) => rotateElement(d, i, deg), { history: false });
  const opPatch = (i: number, patch: Partial<CardElement>) => patchDraft((d) => patchElement(d, i, patch));
  const opReorder = (i: number, dir: -1 | 1) => {
    const j = Math.max(0, Math.min(elements.length - 1, i + dir));
    if (j === i) return;
    patchDraft((d) => reorderElement(d, i, dir));
    if (pulledIndex === i) {
      setPulledIndex(j);
      if (pullSnapshotRef.current?.index === i) pullSnapshotRef.current = { ...pullSnapshotRef.current, index: j };
    } else if (pulledIndex === j) {
      setPulledIndex(i);
      if (pullSnapshotRef.current?.index === j) pullSnapshotRef.current = { ...pullSnapshotRef.current, index: i };
    }
  };
  const opDuplicate = (i: number) => {
    const src = elements[i];
    if (!src || atCap) return;
    patchDraft((d) => duplicateElement(d, i) ?? d);
    // the copy lands just above its source, pulled (its nudged position is the pull snapshot)
    const copy: CardElement = { ...src, x: Math.min(1.25, src.x + 0.05), y: Math.min(1.25, src.y + 0.05) };
    setPulledIndex(i + 1);
    setNumPopOpen(false);
    pullSnapshotRef.current = { index: i + 1, el: copy };
  };
  const opDelete = (i: number) => {
    setEditOpen(false);
    setNumPopOpen(false);
    patchDraft((d) => removeElement(d, i));
    setPulledIndex(null);
    pullSnapshotRef.current = null;
  };
  const opAdd = (el: CardElement) => {
    const newIndex = elements.length;
    patchDraft((d) => addElement(d, el) ?? d);
    if (!atCap) {
      setAddOpen(false);
      pull(newIndex); // a picked glyph lands as a NEW PULLED SLIP (board P3)
      // the fresh element is the pull snapshot
      pullSnapshotRef.current = { index: newIndex, el };
    }
  };
  const opReset = () => {
    const snap = pullSnapshotRef.current;
    if (!snap || pulledIndex == null || snap.index !== pulledIndex) return;
    beginGesture();
    patchDraft((d) => replaceElement(d, pulledIndex, snap.el), { history: false });
  };

  const usedColors = useMemo(() => {
    const set = new Set<string>();
    elements.forEach((e) => {
      set.add(e.fill);
      if (e.type !== 'text' && e.fill2) set.add(e.fill2);
    });
    return [...set];
  }, [elements]);

  return (
    <View style={styles.screen}>
      {/* the workshop head — ◂ returns to the Styler posture, the session continues */}
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to the Styler" onPress={onBackToStyler} hitSlop={8}>
          <Text style={styles.backKey}>◂</Text>
        </Pressable>
        <Text style={styles.title}>CANVAS</Text>
        <View style={styles.spacer} />
      </View>
      <Text style={styles.subLine}>{subLine}</Text>

      {proofing ? (
        <ProofView composition={composition} title={title} />
      ) : (
        <CanvasStage
          composition={composition}
          pulledIndex={pulledIndex}
          onPull={pull}
          onBeginGesture={beginGesture}
          onMove={opMove}
          onResize={opResize}
          onRotate={opRotate}
          numPopOpen={numPopOpen}
          onNumPopClose={() => setNumPopOpen(false)}
        />
      )}

      {/* the P1 entry dressing — the shell mid-swing, fading as the bench settles */}
      {!decorDone ? (
        <Animated.View pointerEvents="none" style={[styles.swing, { opacity: swing }]}>
          <View style={styles.hinge} />
        </Animated.View>
      ) : null}

      <View style={proofing ? styles.dimmed : null}>
        <EditBar
          canUndo={canUndo && !proofing}
          canRedo={canRedo && !proofing}
          canReset={pulledIndex != null && !proofing}
          onUndo={onUndo}
          onRedo={onRedo}
          onReset={opReset}
        />
      </View>

      {!proofing ? (
        <LayerRack
          elements={elements}
          pulledIndex={pulledIndex}
          onPull={pull}
          onReorder={opReorder}
          onPatch={opPatch}
          onDuplicate={opDuplicate}
          onDelete={opDelete}
          onNumPop={() => setNumPopOpen(true)}
        />
      ) : null}

      <View style={styles.benchrow}>
        {!proofing ? (
          <>
            <ScreenButton label="+ Add a slip" variant="secondary" disabled={atCap} onPress={() => setAddOpen(true)} style={styles.benchBtn} />
            <ScreenButton
              label="Edit this slip"
              variant="secondary"
              disabled={pulledIndex == null || !!pulled?.locked}
              onPress={() => setEditOpen(true)}
              style={styles.benchBtn}
            />
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={proofing ? 'Lift the proof' : 'Proof the true print — hold or tap'}
          onPressIn={proofing ? undefined : proofPressIn}
          onPressOut={proofing ? undefined : proofPressOut}
          onPress={proofing ? proofTapWhileOn : undefined}
          style={[styles.proofKey, proofing && styles.proofKeyOn]}
        >
          <Text style={styles.proofKeyText}>{proofing ? '👁 PROOF — ON' : '👁 PROOF'}</Text>
        </Pressable>
        <View style={styles.spacer} />
        <ScreenButton label="Press ▸" variant="add" disabled={busyExit} onPress={() => setPressOpen(true)} style={styles.benchBtn} />
      </View>
      {!proofing ? (
        <Text style={styles.benchHint}>
          HOLD <Text style={styles.benchHintBold}>👁 PROOF</Text> FOR THE TRUE PRINT · TAP <Text style={styles.benchHintBold}>PRESS ▸</Text> TO
          FINISH UP
        </Text>
      ) : null}
      {inlineError ? <Text style={styles.inlineErr}>{inlineError}</Text> : null}

      <AssetShelf
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        count={elements.length}
        currentBase={composition.base}
        onAdd={opAdd}
        onBase={(base) => patchDraft((d) => ({ ...d, base }))}
      />
      <EditSlipSheet
        visible={editOpen && pulledIndex != null}
        onClose={() => setEditOpen(false)}
        element={pulled}
        index={pulledIndex ?? 0}
        usedColors={usedColors}
        atCap={atCap}
        onPatch={(patch) => pulledIndex != null && opPatch(pulledIndex, patch)}
        onDuplicate={() => pulledIndex != null && opDuplicate(pulledIndex)}
        onDelete={() => pulledIndex != null && opDelete(pulledIndex)}
      />
      <PressSheet
        visible={pressOpen}
        onClose={() => setPressOpen(false)}
        busy={busyExit}
        onSavePrivate={() => {
          setPressOpen(false);
          onSavePrivate();
        }}
        onToStyler={() => {
          setPressOpen(false);
          onBackToStyler();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.scr.bg, paddingHorizontal: theme.space.lg, gap: theme.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingTop: theme.space.lg },
  backKey: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.dim, paddingHorizontal: theme.space.sm },
  title: { fontFamily: theme.font.screenBold, fontSize: theme.type.display, color: theme.scr.ink, letterSpacing: 1.5 },
  subLine: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5 },
  spacer: { flex: 1 },
  swing: {
    position: 'absolute',
    left: -60,
    top: 80,
    width: 90,
    height: 420,
    backgroundColor: theme.shell.plastic,
    borderTopRightRadius: theme.corner.shell,
    borderBottomRightRadius: theme.corner.shell,
    transform: [{ rotate: '-10deg' }],
  },
  hinge: { position: 'absolute', right: 4, top: '16%', bottom: '16%', width: 5, backgroundColor: theme.shell.bezel, borderRadius: 3 },
  dimmed: { opacity: 0.4 },
  benchrow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, borderTopWidth: 1, borderTopColor: theme.scr.hairline, paddingTop: theme.space.md },
  benchBtn: { paddingVertical: theme.space.md, paddingHorizontal: theme.space.md },
  proofKey: {
    backgroundColor: theme.brand.cream,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.md,
  },
  proofKeyOn: { backgroundColor: '#d9d4c2' }, // pressed cream (scanline-energize base)
  proofKeyText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.brand.navy, letterSpacing: 1 },
  benchHint: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 0.5, textAlign: 'center', paddingBottom: theme.space.md },
  benchHintBold: { color: theme.scr.dim, fontFamily: theme.font.screenBold },
  inlineErr: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.brand.alert, textAlign: 'center' },
});
