import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Sticker } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { CHIN_ENABLED } from './deviceStickers';
import type { StickerTransform } from './stickerGeometry';

// StickerSteppers (device-manifest D4 · CARD-16 pair) — the round-5 stepper-row grammar as the
// NON-GESTURE twin of the on-shell TransformBox: X · Y · SIZE · ROTATE, each a ◀ value ▶ row where a
// TAP is one fine step and a press-and-HOLD ramps slow→fast (the TransformDrawer grammar, mirrored so
// the timers are cleaned on press-out / unmount). Plus a DELETE (alert fill, 0069 ruling 4 — undo-free
// removal, no confirm: re-adding a decal is cheap, 0040 reserves confirms for non-undoable destroys).
// Every step routes through the same clamp+PATCH pipeline as the gesture (mutate → fitTransform).

const X_STEP = 0.02;
const Y_STEP = 0.02;
const SIZE_STEP = 0.05; // 5%
const ROT_STEP = 1; // 1°
const FAST = { pos: 2, size: 2, rot: 5 } as const;
const HOLD_START_MS = 350;
const HOLD_SLOW_MS = 90;
const HOLD_FAST_MS = 35;
const HOLD_RAMP_TICKS = 6;

type Tick = (fast: boolean) => void;

export function StickerSteppers({
  sticker,
  mutate,
  commit,
  onDelete,
  canReZone,
}: {
  sticker: Sticker;
  mutate: (id: string, patch: Partial<StickerTransform>) => void;
  commit: () => void;
  onDelete: () => void;
  /** the OTHER band has room — else the move 422s and wedges the pipeline (murr M1). */
  canReZone: boolean;
}) {
  const styles = useStyles();
  const otherZone = sticker.zone === 'forehead' ? 'chin' : 'forehead';

  // latest-ref so a hold chain reads the CURRENT sticker across re-renders (the frozen-closure fix).
  const curRef = useRef(sticker);
  curRef.current = sticker;

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(0);
  const firedTokRef = useRef(0);
  const stopHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };
  useEffect(() => stopHold, []);

  const armHold = (tick: Tick): number => {
    const tok = ++tokenRef.current;
    stopHold();
    let ticks = 0;
    const beat = () => {
      if (tokenRef.current !== tok) return;
      ticks += 1;
      firedTokRef.current = tok;
      const fast = ticks >= HOLD_RAMP_TICKS;
      tick(fast);
      holdTimer.current = setTimeout(beat, fast ? HOLD_FAST_MS : HOLD_SLOW_MS);
    };
    holdTimer.current = setTimeout(beat, HOLD_START_MS);
    return tok;
  };
  const releaseHold = (tok: number) => {
    if (tokenRef.current === tok) stopHold();
    commit(); // a completed hold/tap → flush the PATCH promptly
  };
  const tapStep = (tick: Tick, tok: number) => {
    if (tok !== 0 && firedTokRef.current === tok) return; // this press already stepped via its hold
    tick(false);
  };

  // POSITION is a 4-arrow d-pad (owner gate-5 2026-07-12 — mirrors the Canvas TransformDrawer, not two
  // ◀ value ▶ rows): each arrow nudges x AND/OR y in one combined step, hold-ramps like the others.
  const stepPos = (dx: -1 | 0 | 1, dy: -1 | 0 | 1): Tick => (fast) => {
    const c = curRef.current;
    const m = fast ? FAST.pos : 1;
    mutate(c.id, { x: c.x + dx * X_STEP * m, y: c.y + dy * Y_STEP * m });
  };
  const stepSize = (dir: -1 | 1): Tick => (fast) => {
    const c = curRef.current;
    mutate(c.id, { scale: c.scale + dir * SIZE_STEP * (fast ? FAST.size : 1) });
  };
  const stepRot = (dir: -1 | 1): Tick => (fast) => {
    const c = curRef.current;
    mutate(c.id, { rotation: c.rotation + dir * ROT_STEP * (fast ? FAST.rot : 1) });
  };

  const arm = { armHold, releaseHold, tapStep };

  return (
    <View style={styles.wrap}>
      {/* POSITION — the 4 directional arrows inline + the X·Y read-out (mirrors the Canvas TransformDrawer) */}
      <View style={styles.row}>
        <Text style={styles.label}>POSITION</Text>
        <View style={styles.body}>
          <Arrow glyph="◀" label="Nudge left" tick={stepPos(-1, 0)} {...arm} />
          <Arrow glyph="▶" label="Nudge right" tick={stepPos(1, 0)} {...arm} />
          <Arrow glyph="▲" label="Nudge up" tick={stepPos(0, -1)} {...arm} />
          <Arrow glyph="▼" label="Nudge down" tick={stepPos(0, 1)} {...arm} />
          <Text style={styles.posValue} accessibilityLiveRegion="polite">
            {Math.round(sticker.x * 100)} · {Math.round(sticker.y * 100)}%
          </Text>
        </View>
      </View>
      <Row label="SIZE" a11y="Size" value={`${Math.round(sticker.scale * 100)}%`} tickFor={stepSize} {...arm} />
      <Row label="ROTATE" a11y="Rotation" value={`${Math.round(sticker.rotation)}°`} tickFor={stepRot} {...arm} />
      {/* NON-GESTURE RE-ZONE — only meaningful while CHIN is enabled (the other band is a valid target);
          chin is toggled off for now (owner 2026-07-12), so this stays out until it flips back on. */}
      {CHIN_ENABLED ? (
        <ScreenButton
          label={canReZone ? `Move to ${otherZone}` : `${otherZone} is full`}
          variant="secondary"
          size="mini"
          disabled={!canReZone}
          onPress={() => {
            if (!canReZone) return;
            mutate(sticker.id, { zone: otherZone, x: 0.5, y: 0.5 });
            commit();
          }}
          accessibilityLabel={canReZone ? `Move sticker to ${otherZone}` : `Cannot move — the ${otherZone} band is full`}
        />
      ) : null}
      <ScreenButton label="Delete" variant="destructive" size="mini" onPress={onDelete} accessibilityLabel="Delete sticker" />
    </View>
  );
}

function Row({
  label,
  a11y,
  value,
  tickFor,
  armHold,
  releaseHold,
  tapStep,
}: {
  label: string;
  a11y: string;
  value: string;
  tickFor: (dir: -1 | 1) => Tick;
  armHold: (tick: Tick) => number;
  releaseHold: (tok: number) => void;
  tapStep: (tick: Tick, tok: number) => void;
}) {
  const styles = useStyles();
  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={a11y}
      accessibilityValue={{ text: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => tapStep(tickFor(e.nativeEvent.actionName === 'increment' ? 1 : -1), 0)}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.body}>
        <Arrow glyph="◀" label={`${a11y} down`} tick={tickFor(-1)} armHold={armHold} releaseHold={releaseHold} tapStep={tapStep} />
        {/* the parent row is `adjustable` with accessibilityValue — it announces the value on step; a
            live-region here too would double-announce (CARD-16 a11y audit). */}
        <Text style={styles.value}>{value}</Text>
        <Arrow glyph="▶" label={`${a11y} up`} tick={tickFor(1)} armHold={armHold} releaseHold={releaseHold} tapStep={tapStep} />
      </View>
    </View>
  );
}

function Arrow({
  glyph,
  label,
  tick,
  armHold,
  releaseHold,
  tapStep,
}: {
  glyph: string;
  label: string;
  tick: Tick;
  armHold: (tick: Tick) => number;
  releaseHold: (tok: number) => void;
  tapStep: (tick: Tick, tok: number) => void;
}) {
  const styles = useStyles();
  const tokRef = useRef(0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        tokRef.current = armHold(tick);
      }}
      onPressOut={() => releaseHold(tokRef.current)}
      onPress={() => tapStep(tick, tokRef.current)}
      hitSlop={4}
      style={styles.arrow}
    >
      <Text style={styles.arrowGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const ARROW = 28;
const useStyles = themedStyles((t) => ({
  wrap: { gap: t.space.md, paddingTop: t.space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  label: { width: 66, fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.space.sm + 1 },
  arrow: {
    width: ARROW,
    height: ARROW,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.scr.panelHi,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  arrowGlyph: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink },
  value: { minWidth: 52, textAlign: 'center', fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5 },
  posValue: { flex: 1, textAlign: 'right', fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
}));
