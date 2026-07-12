import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, themedStyles } from '../../theme';
import { KeyboardLift } from '../KeyboardLift';
import { CanvasStage } from './CanvasStage';
import { LayerRack } from './LayerRack';
import { EditBar } from './EditBar';
import { AssetShelf } from './AssetShelf';
import { EditSlipSheet } from './EditSlipSheet';
import { TransformDrawer } from './TransformDrawer';
import { PressSheet } from './PressSheet';
import { ProofView } from './ProofView';
import { ScreenButton } from '../ScreenButton';
import {
  addElement,
  duplicateElement,
  elementLabel,
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
  const styles = useStyles();
  const t = useTheme();
  const [pulledIndex, setPulledIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pressOpen, setPressOpen] = useState(false);
  const [proofing, setProofing] = useState(false);
  const [transformOpen, setTransformOpen] = useState(false); // CR-10 — the TransformDrawer (subsumes NumPop)
  const [isolationOn, setIsolationOn] = useState(true); // CR-05 — the session isolation toggle
  const [showHandles, setShowHandles] = useState(true); // gate-5 — the RESIZE BOX toggle (corner handles)
  // round 5 — the ops/rename rows render in the BENCH-BUTTON SLOT (constant height, no panel shift);
  // LayerRack only asks for them via onOps. Rename rides KeyboardLift so the keyboard never covers it.
  const [opsOpen, setOpsOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  const elements = composition.elements;
  const pulled = pulledIndex != null ? elements[pulledIndex] : undefined;
  const atCap = elements.length >= MAX_ELEMENTS;

  // the scoped RESET SLIP snapshot — the pulled element as it was when PULLED (CARD-09)
  const pullSnapshotRef = useRef<{ index: number; el: CardElement } | null>(null);
  const pull = (i: number | null) => {
    if (i != null && i === pulledIndex) return; // re-tapping the pulled slip must not rebase RESET (murr)
    setPulledIndex(i);
    setTransformOpen(false);
    setOpsOpen(false); // pulling elsewhere closes the ops slot (a long-press re-opens via onOps)
    setRenaming(false);
    Keyboard.dismiss(); // a focused rename input may be unmounting under this pull (murr N1; no-op when closed)
    if (i != null) setBaseEdit(false); // pulling an element leaves base-edit
    // an EDIT panel follows an editable pull live, but a null/locked/HIDDEN pull DROPS it — clear
    // the flag too, or the stranded `editOpen` pops the panel back open later (murr N1 + round-4 F4:
    // a hidden slip renders nowhere, so editing it blind contradicts the bed's own guards)
    if (i == null || elements[i]?.locked || elements[i]?.hidden) setEditOpen(false);
    pullSnapshotRef.current = i != null && elements[i] ? { index: i, el: elements[i]! } : null;
  };

  // The breakout owns the full screen (§2.5b / 0014 stage-3) — the DeviceShell drops its chrome, so
  // this surface consumes the safe-area insets itself (there's no shell top-band clearing the notch).
  const insets = useSafeAreaInsets();

  // leaving the Canvas posture mid-rename (◂ / hardware back) unmounts the focused input — drop the
  // keyboard with the surface, whatever the exit path (murr N1b; no-op when closed)
  useEffect(() => () => Keyboard.dismiss(), []);

  // Android hardware back = ◂ (return to the Styler posture). No Modal owns it now (the breakout is
  // the chrome-less screen, not an OS-window Modal), so the surface handles it.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackToStyler();
      return true;
    });
    return () => sub.remove();
  }, [onBackToStyler]);

  // Entry/exit is the DeviceShell ZOOM (decision 0067/CR-01) — the screen scales to full-bleed as the
  // chrome yields. This surface owns NO entry animation of its own (the retired swing decor is gone);
  // it just renders the workshop, and the shell zooms it into place.

  // PROOF: hold = momentary, tap = toggle (the CARD-16 pair). ONE constant handler set — swapping
  // handlers on state made a single click stamp-then-lift within its own gesture; and on web the
  // press-in responder path can go quiet entirely (BOOT-walk find), so a guarded onPress fallback
  // keeps the tap-toggle alive wherever only click events arrive. pressIn marks the gesture
  // handled; onPress toggles only when the pressIn path never ran.
  const proofDownAt = useRef(0);
  const proofWasOn = useRef(false);
  const proofHandled = useRef(false);
  const proofPressIn = () => {
    proofHandled.current = true;
    proofWasOn.current = proofing;
    proofDownAt.current = Date.now();
    setTransformOpen(false);
    if (!proofing) setProofing(true);
  };
  const proofPressOut = () => {
    const held = Date.now() - proofDownAt.current > 450;
    if (held || proofWasOn.current) setProofing(false); // a HOLD releases; a tap-while-on lifts
    // a quick tap from off leaves it stamped — the next tap lifts it.
    // clear the handled mark AFTER any same-gesture onPress has consumed it — a cancelled gesture
    // (pressIn, no onPress) must not eat the NEXT click's fallback (murr)
    setTimeout(() => {
      proofHandled.current = false;
    }, 0);
  };
  const proofPress = () => {
    if (proofHandled.current) {
      proofHandled.current = false; // the pressIn/Out pair already decided this gesture
      return;
    }
    setTransformOpen(false);
    setProofing((p) => !p);
  };

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
    // same live-document rule as opAdd (murr — stale atCap / double-fire)
    let copy: CardElement | null = null;
    patchDraft((d) => {
      const next = duplicateElement(d, i);
      if (!next) return d;
      copy = next.elements[i + 1] ?? null;
      return next;
    });
    if (copy) {
      // the copy lands just above its source, pulled (its nudged position is the pull snapshot)
      setPulledIndex(i + 1);
      setTransformOpen(false);
      pullSnapshotRef.current = { index: i + 1, el: copy };
    }
  };
  const opDelete = (i: number) => {
    setEditOpen(false);
    setTransformOpen(false);
    setOpsOpen(false);
    setRenaming(false);
    patchDraft((d) => removeElement(d, i));
    setPulledIndex(null);
    pullSnapshotRef.current = null;
  };
  const opAdd = (el: CardElement) => {
    // decide against the LIVE document inside the patch — the render-stale `elements`/`atCap`
    // let a double-fired pick add twice or poison the pull snapshot at the cap edge (murr)
    let added = -1;
    patchDraft((d) => {
      const next = addElement(d, el);
      if (!next) return d; // at cap — the red meter is the answer
      added = d.elements.length;
      return next;
    });
    if (added >= 0) {
      setAddOpen(false); // a picked glyph lands as a NEW PULLED SLIP (board P3)
      setPulledIndex(added);
      setTransformOpen(false);
      setBaseEdit(false);
      setEditOpen(true); // CR-09 — and immediately raises its EDIT sheet (colour-first)
      pullSnapshotRef.current = { index: added, el };
    }
  };
  const opReset = () => {
    const snap = pullSnapshotRef.current;
    if (!snap || pulledIndex == null || snap.index !== pulledIndex) return;
    if (elements[pulledIndex]?.locked) return; // the CARD-08 lock covers the reset too (murr)
    beginGesture();
    patchDraft((d) => replaceElement(d, pulledIndex, snap.el), { history: false });
  };

  // every distinct colour ON the card (base + element fills/gradients/strokes) — the ColorField's
  // "FROM CARD" grab (the eyedropper: pick a colour already on the active card, CR-11 gate-5).
  const cardColors = useMemo(() => {
    const set = new Set<string>();
    const b = composition.base;
    if ('gradient' in b) {
      set.add(b.gradient[0]);
      set.add(b.gradient[1]);
    } else {
      set.add(b.fill);
    }
    elements.forEach((e) => {
      set.add(e.fill);
      if (e.type !== 'text' && e.fill2) set.add(e.fill2);
      if (e.type !== 'text' && e.stroke) set.add(e.stroke.color);
    });
    return [...set];
  }, [elements, composition.base]);

  // the last-10 used colours, most-recent-first (the ColorField recents; a "pick" = a committed
  // choice — swatch/recent/from-card tap or picker close — not every HS-drag frame).
  const [recents, setRecents] = useState<string[]>([]);
  const noteColor = (hex: string) =>
    setRecents((r) => [hex, ...r.filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(0, 10));

  // CR-08 gate-5: editing the BASE opens the (colour-only) EDIT sheet, not an element.
  const [baseEdit, setBaseEdit] = useState(false);
  const openBaseEdit = () => {
    Keyboard.dismiss(); // reachable mid-rename via the BASE rail slip (murr N1)
    setPulledIndex(null);
    setTransformOpen(false);
    setAddOpen(false);
    setOpsOpen(false);
    setRenaming(false);
    setBaseEdit(true);
    setEditOpen(true);
  };

  // ── the bottom panel (gate-5 device-walk) ───────────────────────────────────────────────────────
  // ADD/EDIT/TRANSFORM render INLINE below the card (not overlay drawers) — the card stays fully
  // visible and undimmed above the panel. Each mode is mutually exclusive; opening one closes the
  // others. PRESS stays a PulledSheet drawer (unchanged).
  // a LOCKED or HIDDEN slip never edits: pulling one while a panel is up drops to the bench (the
  // bench's EDIT button is disabled for both — the live panels honour the same CARD-08 rule; a
  // hidden slip renders nowhere, so precision-editing it blind is a trap — murr round 4 F4)
  // `pulled != null` (not just the index): an undo can remove the pulled element from under an open
  // panel — a missing element must read NOT-editable so the panel drops instead of shelling (murr N4;
  // opAdd is safe — React batches the parent's setDraft with our setPulledIndex into one commit)
  const editable = pulled != null && !pulled.locked && !pulled.hidden;
  const editActive = editOpen && (baseEdit || editable);
  const transformActive = transformOpen && editable && !proofing;
  // when `editable` collapses WITHOUT a pull (undo re-locking/re-hiding the pulled slip — the
  // persistent editbar makes that reachable from inside the panels), the open-flags must clear too,
  // or the panel teleports back open on the next UNLOCK/SHOW (murr R5-2). baseEdit keeps its EDIT.
  useEffect(() => {
    if (!editable) {
      setTransformOpen(false);
      if (!baseEdit) setEditOpen(false);
    }
  }, [editable, baseEdit]);
  const panelMode: 'add' | 'edit' | 'transform' | 'bench' = addOpen
    ? 'add'
    : editActive
      ? 'edit'
      : transformActive
        ? 'transform'
        : 'bench';
  const openAdd = () => {
    Keyboard.dismiss(); // a focused rename input unmounts here — RN won't reliably drop the keyboard (murr R5-9)
    setEditOpen(false);
    setBaseEdit(false);
    setTransformOpen(false);
    setOpsOpen(false);
    setRenaming(false);
    setAddOpen(true);
  };
  const openEdit = () => {
    Keyboard.dismiss();
    setAddOpen(false);
    setBaseEdit(false);
    setTransformOpen(false);
    setOpsOpen(false);
    setRenaming(false);
    setEditOpen(true);
  };
  const openTransform = () => {
    Keyboard.dismiss();
    setAddOpen(false);
    setEditOpen(false);
    setOpsOpen(false);
    setRenaming(false);
    setTransformOpen(true);
  };
  const closePanel = () => {
    // ✕ from any inline mode returns to the bench
    setAddOpen(false);
    setEditOpen(false);
    setBaseEdit(false);
    setTransformOpen(false);
  };
  // round 3 — the owner's wording: "Editing the 'Arrow' Slip" (the surface's all-caps voice)
  const editTitle = baseEdit
    ? "EDITING THE 'BASE' SLIP"
    : pulled
      ? `EDITING THE '${elementLabel(pulled, pulledIndex ?? 0).toUpperCase()}' SLIP`
      : 'EDITING THE SLIP';

  // round 3 — ONE panel height: the bench's measured height is the panel's height in EVERY mode
  // (bench/ADD/EDIT/TRANSFORM), so opening a menu never grows the panel / shrinks the card above.
  // PROOF hides the panel and PRESS is a drawer — both exempt (the owner's stated exceptions).
  const [benchH, setBenchH] = useState(0);
  const panelWRef = useRef(0);

  return (
    // full-bleed breakout: the workshop owns the whole screen + the safe-area (no shell chrome here)
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* the workshop head — ◂ returns to the Styler posture, the session continues */}
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to the Styler" onPress={onBackToStyler} hitSlop={8}>
          <Text style={styles.backKey}>◂</Text>
        </Pressable>
        <Text style={styles.title}>CANVAS</Text>
        <View style={styles.spacer} />
      </View>
      {/* the sub-line flips to the PROOFING state while the print is stamped (board :743, parvati 🚩1) */}
      <Text style={styles.subLine}>{proofing ? `${title.toUpperCase()} · PROOFING` : subLine}</Text>

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
          isolationOn={isolationOn}
          onToggleIsolation={() => setIsolationOn((v) => !v)}
          showHandles={showHandles}
        />
      )}

      {/* the BOTTOM PANEL (gate-5) — bounded + bordered, in the normal column flow below the bed (the
          card stays fully visible + undimmed above it). It holds either the BENCH or one inline mode
          (ADD/EDIT/TRANSFORM). Hidden entirely during PROOF. PRESS stays a PulledSheet drawer. */}
      {!proofing ? (
        <View
          style={[
            styles.panel,
            // inline modes pin to the bench's measured height (round 3 — one height, no card reflow);
            // the 48% cap is only the pre-measure fallback (the bench always renders first)
            panelMode !== 'bench' && (benchH > 0 ? { height: benchH } : styles.panelBounded),
          ]}
          onLayout={(ev) => {
            // capture the bench's BASE height — the MIN seen at this width (the ops/rename rows can
            // only inflate the bench, and a max-capture pinned every later menu to that inflated
            // height — murr F4); a width change (rotation/resize) recaptures from scratch. The rail
            // height is constant (the base slip always renders), so the min is stable.
            if (panelMode === 'bench') {
              const { height: h, width: w } = ev.nativeEvent.layout;
              if (Math.abs(w - panelWRef.current) > 1) {
                panelWRef.current = w;
                setBenchH(h);
              } else {
                setBenchH((prev) => (prev === 0 || h < prev ? h : prev));
              }
            }
          }}
        >
          {/* round 5 — the editbar PERSISTS across bench/EDIT/TRANSFORM: undo/redo are reachable
              from the menus and the TRANSFORM key never moves (the EDIT-head door retired) */}
          <EditBar
            canUndo={canUndo}
            canRedo={canRedo}
            canReset={pulled != null && !pulled.locked}
            canTransform={editable && panelMode !== 'add'}
            transformActive={panelMode === 'transform'}
            onUndo={() => {
              // a history walk shifts indices/identities under the ops/rename context — close it
              // rather than let a stale SAVE retarget whatever now sits at pulledIndex (murr R5-3)
              setOpsOpen(false);
              setRenaming(false);
              Keyboard.dismiss();
              onUndo();
            }}
            onRedo={() => {
              setOpsOpen(false);
              setRenaming(false);
              Keyboard.dismiss();
              onRedo();
            }}
            onReset={opReset}
            onTransform={openTransform}
          />
          {panelMode === 'bench' ? (
            <>
              <LayerRack
                elements={elements}
                pulledIndex={pulledIndex}
                onPull={pull}
                onReorder={opReorder}
                onOps={() => {
                  setOpsOpen(true);
                  setRenaming(false);
                }}
                currentBase={composition.base}
                onEditBase={openBaseEdit}
                baseEditing={baseEdit}
              />
              {/* the BENCH-BUTTON SLOT (round 5) — ONE fixed-height row that holds the bench buttons,
                  OR the ops row (single-line, horizontally scrolling), OR the rename row (keyboard-
                  lifted). Swapping content in one slot means the panel NEVER changes height. */}
              <View style={styles.slotRow}>
                {opsOpen && pulledIndex != null && pulled ? (
                  renaming ? (
                    <KeyboardLift style={styles.slotFill}>
                      <View style={styles.renameRow}>
                        <TextInput
                          value={renameDraft}
                          onChangeText={setRenameDraft}
                          maxLength={24}
                          autoFocus
                          placeholder="Slip name"
                          placeholderTextColor={t.scr.faint}
                          style={styles.renameInput}
                          accessibilityLabel="Slip name"
                        />
                        <Op
                          label="✓ SAVE"
                          onPress={() => {
                            // re-check at commit — the slip must still be renamable (murr R5-3)
                            if (pulled && !pulled.locked) opPatch(pulledIndex, { name: renameDraft.trim() || undefined });
                            setRenaming(false);
                            Keyboard.dismiss();
                          }}
                        />
                        <Op
                          label="CANCEL"
                          onPress={() => {
                            setRenaming(false);
                            Keyboard.dismiss();
                          }}
                        />
                      </View>
                    </KeyboardLift>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opsRow} keyboardShouldPersistTaps="handled">
                      <Op
                        label="RENAME"
                        onPress={() => {
                          setRenameDraft(pulled.name ?? '');
                          setRenaming(true);
                        }}
                      />
                      <Op label={pulled.locked ? 'UNLOCK' : 'LOCK'} onPress={() => opPatch(pulledIndex, { locked: pulled.locked ? undefined : true })} />
                      <Op label={pulled.hidden ? 'SHOW' : 'HIDE'} onPress={() => opPatch(pulledIndex, { hidden: pulled.hidden ? undefined : true })} />
                      <Op label="DUPLICATE" disabled={atCap} onPress={() => opDuplicate(pulledIndex)} />
                      {/* multi-select + group ride the CARD-08 at-scale pass — present, honest, disabled */}
                      <Op label="GROUP" disabled onPress={() => {}} />
                      <Op label="◂" disabled={pulledIndex === 0} onPress={() => opReorder(pulledIndex, -1)} accessibilityLabel="Move slip back" />
                      <Op label="▸" disabled={pulledIndex === elements.length - 1} onPress={() => opReorder(pulledIndex, 1)} accessibilityLabel="Move slip forward" />
                      {/* hidden gates X·Y too — precision-editing an invisible slip is blind (murr round-4 F4) */}
                      <Op label="X·Y" disabled={!editable} onPress={openTransform} accessibilityLabel="Numeric position and size" />
                      <Op label="DELETE" danger onPress={() => opDelete(pulledIndex)} />
                      {/* CR-12 (gate-5): an explicit ops-row dismiss */}
                      <Op label="✕ CLOSE" onPress={() => setOpsOpen(false)} accessibilityLabel="Close options" />
                    </ScrollView>
                  )
                ) : (
                  <View style={styles.benchrow}>
                    <ScreenButton label="+ Add slip" variant="secondary" disabled={atCap} onPress={openAdd} style={styles.benchBtn} />
                    <ScreenButton label="Edit slip" variant="secondary" disabled={!editable} onPress={openEdit} style={styles.benchBtn} />
                    <View style={styles.spacer} />
                    {/* round 4 — PROOF docks immediately LEFT of PRESS (right-aligned pair); the same
                        pair renders in the same place while PROOFING, so the keys never move. Decision
                        0069 — PROOF is the cream ScreenButton/secondary (active = latched proofing);
                        CR-14 keeps the proof glyph (◉), not the 👁 emoji (no emoji in UI, OQ-110). */}
                    <ScreenButton
                      label="◉ PROOF"
                      variant="secondary"
                      active={proofing}
                      onPressIn={proofPressIn}
                      onPressOut={proofPressOut}
                      onPress={proofPress}
                      accessibilityLabel="Proof the true print — hold or tap"
                      style={styles.benchBtn}
                    />
                    <ScreenButton label="Press ▸" variant="add" disabled={busyExit} onPress={() => setPressOpen(true)} style={styles.benchBtn} />
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              {/* the panel header — the mode title (left) + a ✕ back to the bench. Round 5: the
                  EDIT-head TRANSFORM door is retired (the persistent editbar key serves it); the
                  TRANSFORM head keeps its EDIT door (cream voice). */}
              <View style={styles.panelHead}>
                <Text style={styles.panelTitle} numberOfLines={1}>
                  {panelMode === 'add' ? 'ADD SLIP' : panelMode === 'edit' ? editTitle : 'TRANSFORM'}
                </Text>
                <View style={styles.spacer} />
                {panelMode === 'transform' && editable ? (
                  // decision 0069 — the cream panel-door is a ScreenButton/secondary·mini
                  <ScreenButton label="EDIT" variant="secondary" size="mini" onPress={openEdit} accessibilityLabel="Edit this slip" />
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel="Close panel" onPress={closePanel} hitSlop={8} style={styles.panelClose}>
                  <Text style={styles.panelCloseText}>✕</Text>
                </Pressable>
              </View>
              {panelMode === 'add' ? (
                <AssetShelf
                  inline
                  visible={addOpen}
                  onClose={closePanel}
                  count={elements.length}
                  currentBase={composition.base}
                  onAdd={opAdd}
                  onBase={(base) => patchDraft((d) => ({ ...d, base }))}
                />
              ) : null}
              {panelMode === 'edit' ? (
                <EditSlipSheet
                  inline
                  visible={editActive}
                  onClose={closePanel}
                  element={pulled}
                  index={pulledIndex ?? 0}
                  recents={recents}
                  cardColors={cardColors}
                  onColorCommit={noteColor}
                  atCap={atCap}
                  onPatch={(patch, opts) => {
                    // opts.history:false rides continuous runs (OPACITY) — the sheet begins its own entry
                    if (pulledIndex != null) patchDraft((d) => patchElement(d, pulledIndex, patch), opts);
                  }}
                  onBeginGesture={beginGesture}
                  onDuplicate={() => pulledIndex != null && opDuplicate(pulledIndex)}
                  onDelete={() => pulledIndex != null && opDelete(pulledIndex)}
                  baseMode={baseEdit ? { base: composition.base, onBase: (base) => patchDraft((d) => ({ ...d, base })) } : null}
                  showHandles={showHandles}
                  onToggleHandles={() => setShowHandles((v) => !v)}
                />
              ) : null}
              {panelMode === 'transform' ? (
                <TransformDrawer
                  inline
                  visible={transformActive}
                  onClose={closePanel}
                  element={pulled}
                  onSetPos={(x, y) => {
                    if (pulledIndex != null && !pulled?.locked) opMove(pulledIndex, x, y);
                  }}
                  onSetSize={(w, h) => {
                    if (pulledIndex != null && !pulled?.locked) opResize(pulledIndex, w, h);
                  }}
                  onSetRot={(deg) => {
                    if (pulledIndex != null && !pulled?.locked) opRotate(pulledIndex, deg);
                  }}
                  onBeginGesture={beginGesture}
                  showHandles={showHandles}
                  onToggleHandles={() => setShowHandles((v) => !v)}
                />
              ) : null}
            </>
          )}
        </View>
      ) : null}

      {/* while PROOFING the panel is hidden but the PROOF+PRESS pair STAYS PUT (round 4) — same
          right-aligned row, PROOF in its pressed state, and PRESS works from the proof */}
      {proofing ? (
        <View style={styles.proofBar}>
          <View style={styles.spacer} />
          <ScreenButton
            label="◉ PROOF"
            variant="secondary"
            active
            onPressIn={proofPressIn}
            onPressOut={proofPressOut}
            onPress={proofPress}
            accessibilityLabel="Lift the proof"
            style={styles.benchBtn}
          />
          <ScreenButton label="Press ▸" variant="add" disabled={busyExit} onPress={() => setPressOpen(true)} style={styles.benchBtn} />
        </View>
      ) : null}
      {/* CR-16 — the bench coaching hint is removed */}
      {inlineError ? <Text style={styles.inlineErr}>{inlineError}</Text> : null}

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

/** the ops-row chip (round 5 — lives in the bench-button slot; was LayerRack's) */
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
  const opStyles = useOpStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[opStyles.op, danger && opStyles.dangerBox, disabled && opStyles.disabled]}
    >
      <Text style={[opStyles.text, danger && opStyles.danger]}>{label}</Text>
    </Pressable>
  );
}

const useOpStyles = themedStyles((t) => ({
  op: {
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panel,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm + 1,
  },
  // decision 0069 — destructive = alert FILL (not red text on grey); ink flips to cream for contrast.
  dangerBox: { backgroundColor: t.brand.alert, borderColor: t.brand.alert },
  disabled: { opacity: 0.4 },
  text: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5 },
  danger: { color: t.brand.cream },
}));

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg, paddingHorizontal: t.space.lg, gap: t.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingTop: t.space.lg },
  backKey: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim, paddingHorizontal: t.space.sm },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  subLine: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  spacer: { flex: 1 },
  // the bottom panel — its own bordered container below the bed (the card stays visible above it).
  // Inline modes (ADD/EDIT/TRANSFORM) are capped to 48% so the card keeps room + the inner ScrollView
  // scrolls; the bench sizes naturally (its content is compact + the rail scrolls horizontally).
  // round 4 — the divider above the editbar row is dropped (no borderTop on the panel)
  panel: {
    paddingTop: t.space.md,
    gap: t.space.md,
  },
  panelBounded: { maxHeight: '48%' },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  panelTitle: { flexShrink: 1, fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  panelClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panel,
  },
  panelCloseText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim },
  // the bench-button slot (round 5) — ONE fixed height whichever content is in it (buttons/ops/rename)
  slotRow: { height: 44, justifyContent: 'center' },
  slotFill: { flex: 1, justifyContent: 'center' },
  benchrow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  opsRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm + 1 },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  renameInput: {
    flex: 1,
    fontFamily: t.font.screen,
    fontSize: t.type.body,
    color: t.scr.ink,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
  },
  // matches the benchrow geometry so PROOF/PRESS hold their spot through proofing (round 4)
  proofBar: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingTop: t.space.md },
  benchBtn: { paddingVertical: t.space.md, paddingHorizontal: t.space.md },
  inlineErr: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.brand.alert, textAlign: 'center' },
}));
