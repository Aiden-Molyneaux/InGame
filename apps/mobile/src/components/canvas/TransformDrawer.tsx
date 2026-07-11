import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { ScrollLockContext, useScrollLockHost } from '../ScrollLock';
import { clamp, POS_MIN, POS_MAX, SIZE_MIN, SIZE_MAX, TEXT_SIZE_MIN, TEXT_SIZE_MAX } from '../../canvas/ops';
import type { CardElement } from '../../render/composition';

// TransformDrawer (component-map §8b · CR-10 / decision 0067 · gate-5 device-walks) — the one
// precision surface, SUBSUMING the former NumPop. Round 5: the sliders are RETIRED for one compact
// row grammar (label · arrows · read-out) — less real estate, one control feel:
//   POSITION — the four directional arrows INLINE in the row (◀ ▶ ▲ ▼) + a live X·Y read-out
//   W · H    — ◀ value ▶ stepper rows (text slips: one SIZE row)
//   ROTATE   — a ◀ value ▶ stepper row (1° taps, hold-ramping)
//   RESIZE BOX — the EDIT sheet's row grammar; OFF hides the WHOLE sel-ring on the bed (round 3)
// Every arrow shares the tap/hold behaviour: a TAP is exactly ONE fine step (~350ms before the
// repeat starts — round 4), a HOLD repeats slow beats then RAMPS to fast double-strides. Works in
// NORMALIZED units (0..1 position/size, degrees rotation). It is the CARD-16 non-gesture pair for
// move/scale/rotate (the sel-ring's rotation handle included). LOCK/HIDDEN gate it upstream.
// `inline`: rendered inside the CanvasSurface bottom panel (no PulledSheet chrome).

const POS_STEP = 0.005; // 0.5% per position tap
const SIZE_STEP = 0.005; // 0.5% per size tap
const ROT_STEP = 1; // 1° per rotate tap
const FAST_MUL = { pos: 2, size: 2, rot: 5 } as const; // the ramped beats stride harder (round 4/5)
const HOLD_START_MS = 350; // initial delay before the repeat begins (a tap never repeats)
const HOLD_SLOW_MS = 90; // repeat interval for the first beats of a hold
const HOLD_FAST_MS = 35; // repeat interval once the hold ramps
const HOLD_RAMP_TICKS = 6; // slow beats before the ramp (~0.5s of fine travel)

export function TransformDrawer({
  visible,
  onClose,
  element,
  onSetPos,
  onSetSize,
  onSetRot,
  onBeginGesture,
  showHandles = true,
  onToggleHandles,
  inline = false,
}: {
  visible: boolean;
  onClose: () => void;
  element: CardElement | undefined;
  /** normalized 0..1 */
  onSetPos: (x: number, y: number) => void;
  /** normalized 0..1 (text: h drives `size`, w ignored) */
  onSetSize: (w: number, h: number) => void;
  onSetRot: (deg: number) => void;
  onBeginGesture: () => void;
  /** the RESIZE BOX toggle — when false the bed hides the WHOLE sel-ring (border + handles; round 3) */
  showHandles?: boolean;
  onToggleHandles?: () => void;
  /** render inline in the CanvasSurface bottom panel (no PulledSheet/scrim/handle/title) */
  inline?: boolean;
}) {
  // (kept as a host so any future held control in this panel locks its scroll; inert today)
  const { scrollEnabled, api: scrollLockApi } = useScrollLockHost();

  // --- latest-ref pattern -------------------------------------------------------------------------
  // The press-and-hold steppers repeat on a timer chain across re-renders, so every beat must read
  // the CURRENT element through this ref (the frozen-closure class — murr rounds 3/4). A setTimeout
  // CHAIN (not setInterval) so the interval can ramp slow→fast mid-hold.
  const stepRef = useRef({
    pos: (_dx: number, _dy: number) => {},
    size: (_dim: 'w' | 'h', _d: number) => {},
    rot: (_d: number) => {},
  });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const e = element;
  const isText = e?.type === 'text';
  if (e) {
    const sizeMin = isText ? TEXT_SIZE_MIN : SIZE_MIN;
    const sizeMax = isText ? TEXT_SIZE_MAX : SIZE_MAX;
    stepRef.current = {
      pos: (dx, dy) => onSetPos(clamp(e.x + dx, POS_MIN, POS_MAX), clamp(e.y + dy, POS_MIN, POS_MAX)),
      size: (dim, d) => {
        if (isText) {
          onSetSize(0, clamp(e.size + d, sizeMin, sizeMax));
        } else {
          const v = clamp((dim === 'w' ? e.w : e.h) + d, sizeMin, sizeMax);
          onSetSize(dim === 'w' ? v : e.w, dim === 'h' ? v : e.h);
        }
      },
      rot: (d) => {
        const cur = (((e.rotation ?? 0) % 360) + 360) % 360;
        onSetRot((((cur + d) % 360) + 360) % 360);
      },
    };
  }

  // clear the chain on unmount AND whenever the drawer closes (visible → false)
  useEffect(() => stopHold, []);
  useEffect(() => {
    if (!visible) stopHold();
  }, [visible]);

  // Press grammar (murr R5-6/R5-7): press-in only ARMS the chain — NO step and NO history entry
  // fire until either the chain's first beat (a real hold survives the 350ms gate) or onPress (a
  // completed tap). A scroll that steals the responder mid-press therefore mutates NOTHING. Each
  // press takes a TOKEN: beats of a superseded chain no-op, and a release only stops its OWN chain
  // (two-finger arrow presses can't kill each other's).
  const tokenRef = useRef(0);
  // the fired-mark is PER-TOKEN (murr N2): a hold's trailing onPress is suppressed by ITS OWN
  // token only — a second finger's press can't reset it (no spurious extra step), and the SR
  // increment path (token 0, which never equals a chain token) is never suppressed.
  const firedTokRef = useRef(0);
  const armHold = (tick: (fast: boolean) => void): number => {
    const tok = ++tokenRef.current;
    stopHold();
    let ticks = 0;
    const beat = () => {
      if (tokenRef.current !== tok) return; // a newer press owns the chain
      ticks += 1;
      if (firedTokRef.current !== tok) {
        firedTokRef.current = tok;
        onBeginGesture(); // ONE history entry per hold
      }
      const fast = ticks >= HOLD_RAMP_TICKS;
      tick(fast);
      holdTimer.current = setTimeout(beat, fast ? HOLD_FAST_MS : HOLD_SLOW_MS);
    };
    holdTimer.current = setTimeout(beat, HOLD_START_MS);
    return tok;
  };
  const releaseHold = (tok: number) => {
    if (tokenRef.current === tok) stopHold();
  };
  /** tok = the pressing arrow's own token (0 = the a11y path, never chain-suppressed) */
  const tapStep = (tick: (fast: boolean) => void, tok: number) => {
    if (tok !== 0 && firedTokRef.current === tok) return; // this press's hold chain already stepped
    onBeginGesture(); // ONE history entry per tap
    tick(false);
  };

  if (!e) return null;
  const w = isText ? 0 : e.w;
  const h = isText ? e.size : e.h;
  const rot = (((e.rotation ?? 0) % 360) + 360) % 360;

  const posTick = (dx: number, dy: number) => (fast: boolean) =>
    stepRef.current.pos(dx * (fast ? FAST_MUL.pos : 1), dy * (fast ? FAST_MUL.pos : 1));
  const posArrow = (glyph: string, label: string, dx: number, dy: number) => (
    <Arrow glyph={glyph} label={label} tick={posTick(dx, dy)} arm={armHold} release={releaseHold} tap={tapStep} />
  );

  const body = (
    <>
      {/* POSITION — the four directional arrows INLINE in the row (round 5) + the live X·Y read-out */}
      <ControlRow label="POSITION">
        {posArrow('◀', 'Nudge left', -POS_STEP, 0)}
        {posArrow('▶', 'Nudge right', POS_STEP, 0)}
        {posArrow('▲', 'Nudge up', 0, -POS_STEP)}
        {posArrow('▼', 'Nudge down', 0, POS_STEP)}
        <Text style={styles.readout} accessibilityLiveRegion="polite">
          X {(e.x * 100).toFixed(1)}% · Y {(e.y * 100).toFixed(1)}%
        </Text>
      </ControlRow>

      {/* SIZE — ◀ value ▶ stepper rows (text: one SIZE row); read-outs are % of the bed */}
      {isText ? (
        <Stepper label="SIZE" a11y="Text size" value={`${Math.round(h * 100)}%`} tickFor={(dir) => (fast) => stepRef.current.size('h', dir * SIZE_STEP * (fast ? FAST_MUL.size : 1))} arm={armHold} release={releaseHold} tap={tapStep} />
      ) : (
        <>
          <Stepper label="W" a11y="Width" value={`${Math.round(w * 100)}%`} tickFor={(dir) => (fast) => stepRef.current.size('w', dir * SIZE_STEP * (fast ? FAST_MUL.size : 1))} arm={armHold} release={releaseHold} tap={tapStep} />
          <Stepper label="H" a11y="Height" value={`${Math.round(h * 100)}%`} tickFor={(dir) => (fast) => stepRef.current.size('h', dir * SIZE_STEP * (fast ? FAST_MUL.size : 1))} arm={armHold} release={releaseHold} tap={tapStep} />
        </>
      )}

      {/* ROTATE — a ◀ value ▶ stepper row (1° taps, ramping to 5° beats); the CARD-16 pair for the
          sel-ring's rotation handle */}
      <Stepper label="ROTATE" a11y="Rotation" value={`${Math.round(rot)}°`} tickFor={(dir) => (fast) => stepRef.current.rot(dir * ROT_STEP * (fast ? FAST_MUL.rot : 1))} arm={armHold} release={releaseHold} tap={tapStep} />

      {/* RESIZE BOX — the EDIT sheet's row grammar; OFF hides the whole sel-ring (round 3) */}
      {onToggleHandles ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>RESIZE BOX</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Resize box"
            accessibilityState={{ checked: showHandles }}
            onPress={onToggleHandles}
            style={[styles.boxTog, showHandles && styles.boxTogOn]}
          >
            <Text style={styles.boxTogText}>{showHandles ? 'ON' : 'OFF'}</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  if (inline)
    return (
      <ScrollView style={styles.inlineScroll} contentContainerStyle={styles.inlineBody} keyboardShouldPersistTaps="handled" scrollEnabled={scrollEnabled}>
        <ScrollLockContext.Provider value={scrollLockApi}>{body}</ScrollLockContext.Provider>
      </ScrollView>
    );

  return (
    <PulledSheet visible={visible} onClose={onClose} dimScrim={false} maxFraction={0.5} title="Transform">
      {body}
    </PulledSheet>
  );
}

function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowBody}>{children}</View>
    </View>
  );
}

type Tick = (fast: boolean) => void;
type Tap = (tick: Tick, tok: number) => void;

/** ◀ value ▶ — one stepper row in the shared grammar (round 5). The row keeps the ADJUSTABLE role
 *  the retired sliders had (murr R5-8): SR increment/decrement = one fine step. */
function Stepper({
  label,
  a11y,
  value,
  tickFor,
  arm,
  release,
  tap,
}: {
  label: string;
  a11y: string;
  value: string;
  tickFor: (dir: -1 | 1) => Tick;
  arm: (tick: Tick) => number;
  release: (tok: number) => void;
  tap: Tap;
}) {
  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={a11y}
      accessibilityValue={{ text: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => tap(tickFor(e.nativeEvent.actionName === 'increment' ? 1 : -1), 0)}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowBody}>
        <Arrow glyph="◀" label={`${a11y} down`} tick={tickFor(-1)} arm={arm} release={release} tap={tap} />
        <Text style={styles.stepValue} accessibilityLiveRegion="polite">
          {value}
        </Text>
        <Arrow glyph="▶" label={`${a11y} up`} tick={tickFor(1)} arm={arm} release={release} tap={tap} />
      </View>
    </View>
  );
}

/** press-in ARMS the hold chain; a completed tap steps once via onPress; press-out releases only
 *  its own chain (per-press token — murr R5-6/R5-7). */
function Arrow({
  glyph,
  label,
  tick,
  arm,
  release,
  tap,
}: {
  glyph: string;
  label: string;
  tick: Tick;
  arm: (tick: Tick) => number;
  release: (tok: number) => void;
  tap: Tap;
}) {
  const tokRef = useRef(0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        tokRef.current = arm(tick);
      }}
      onPressOut={() => release(tokRef.current)}
      onPress={() => tap(tick, tokRef.current)}
      style={styles.arrow}
      hitSlop={4}
    >
      <Text style={styles.arrowGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const ARROW = 28; // compact row-height arrows (the 40px d-pad cross retired — round 5)
const styles = StyleSheet.create({
  inlineScroll: { flexGrow: 0 },
  inlineBody: { gap: theme.space.md, paddingBottom: theme.space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  rowLabel: { width: 66, fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space.sm + 1 },
  arrow: {
    width: ARROW,
    height: ARROW,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.scr.panelHi,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
  },
  arrowGlyph: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.ink },
  readout: { flex: 1, textAlign: 'right', fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  stepValue: { minWidth: 52, textAlign: 'center', fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.ink, letterSpacing: 0.5 },
  boxTog: {
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panel,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm + 1,
  },
  boxTogOn: { borderWidth: 1.5, borderColor: theme.scr.accent, backgroundColor: 'rgba(255,159,67,0.08)' },
  boxTogText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.ink, letterSpacing: 0.5 },
});
