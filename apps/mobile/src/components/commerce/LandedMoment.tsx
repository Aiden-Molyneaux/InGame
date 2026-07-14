import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, Text } from 'react-native';
import { themedStyles, useTheme, withAlpha } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import { ScreenButton } from '../ScreenButton';
import { TertiaryLink } from '../TertiaryLink';
import { PixelsMark } from './PixelsMark';

// LandedMoment (component-map §7 infra · board P7) — "THE COIN DROP", the pack-purchase success beat
// (M5 motion pass). Four beats, ≤1.2s + settle (OQ-040 — still ONE clean centered moment, but it now
// EARNS the currency it hands you): the gem THUNKS home · a gold pixel-burst fans out · the balance
// ROLLS from→to on an accelerating counter · the receipt fades in. Tap anywhere skips to the settled
// state (never trap the user). Honors reduce-motion (0044 §104): the final number + ONE glow pulse +
// the receipt, instant — no drop, no burst, no roll. RN-Animated + the shared useReducedMotion gate.

// ── shard choreography (beat 2) ──────────────────────────────────────────────────────────────────────
// 10 arcade-confetti shards fanning out along hand-authored angles (deterministic — no Math.random, so
// the layout is test-stable). `dist` ≤ ~86px (arcade burst, not fireworks); `shade` picks one of three
// gold tones; `gem` marks the 2 that are tiny PixelsMarks instead of pixel squares. `s0` = the per-shard
// stagger start (fraction of the burst) — ~0.03 apart ≈ 15ms at a 500ms burst.
type Shard = { angle: number; dist: number; shade: 0 | 1 | 2; gem?: boolean; rot: number; size: number };
const SHARDS: Shard[] = [
  { angle: -0.5 * Math.PI, dist: 84, shade: 0, rot: 12, size: 7 }, // straight up
  { angle: -0.30 * Math.PI, dist: 78, shade: 1, rot: -20, size: 6 },
  { angle: -0.10 * Math.PI, dist: 72, shade: 2, gem: true, rot: 0, size: 12 },
  { angle: 0.08 * Math.PI, dist: 80, shade: 0, rot: 28, size: 6 },
  { angle: 0.28 * Math.PI, dist: 74, shade: 1, rot: -14, size: 7 },
  { angle: 0.5 * Math.PI, dist: 68, shade: 2, rot: 8, size: 5 }, // straight down
  { angle: 0.72 * Math.PI, dist: 76, shade: 0, rot: -26, size: 6 },
  { angle: 0.92 * Math.PI, dist: 82, shade: 1, gem: true, rot: 0, size: 12 },
  { angle: 1.12 * Math.PI, dist: 70, shade: 2, rot: 18, size: 5 },
  { angle: 1.30 * Math.PI, dist: 80, shade: 0, rot: -10, size: 7 },
];
const GRAVITY = 16; // the outer-third downward drift (arcade fall)
const BURST_START = 0.18; // burst opens ~120ms in — overlaps the drop's tail
const COUNT_START_MS = 260; // the roll starts as the burst peaks
const COUNT_MS = 600; // the roll's total span
const MAX_TICKS = 20; // cap so +140 doesn't tick forever

/** The from→to display values, one per tick, ACCELERATING (slow start) and landing EXACTLY on `to`. */
function buildRoll(from: number, to: number): { values: number[]; delays: number[] } {
  const delta = to - from;
  const n = Math.max(1, Math.min(Math.abs(delta), MAX_TICKS));
  const values: number[] = [];
  for (let i = 1; i <= n; i++) values.push(from + Math.round((delta * i) / n));
  values[n - 1] = to; // force the exact landing (odd deltas, capped deltas)
  // accelerating cumulative offsets: early ticks weigh more (wait longer) → slow start, speed up.
  const totalW = (n * (n + 1)) / 2;
  const delays: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += (COUNT_MS * (n - i)) / totalW;
    delays.push(acc);
  }
  return { values, delays };
}

export function LandedMoment({
  granted,
  from,
  to,
  backLabel = 'Back to store',
  onBack,
  onViewWallet,
}: {
  granted: number;
  from: number;
  to: number;
  backLabel?: string;
  onBack: () => void;
  onViewWallet: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const reduceMotion = useReducedMotion();

  const drop = useRef(new Animated.Value(0)).current; // gem thunk + backdrop scrim (0→1 settled)
  const burst = useRef(new Animated.Value(0)).current; // shard fan-out
  const nudge = useRef(new Animated.Value(1)).current; // per-tick gem breath (1.0→1.02)
  const glow = useRef(new Animated.Value(0)).current; // final-digit gold flash
  const receipt = useRef(new Animated.Value(0)).current; // the ledger line + actions fade-in

  const [displayed, setDisplayed] = useState(from);
  const [settled, setSettled] = useState(false);

  const runningRef = useRef<Animated.CompositeAnimation[]>([]);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // stop every in-flight animation + timer and jump every value to its settled end (skip + unmount + the
  // motion path's own completion all funnel through here — one clean teardown, no leaks).
  const settleNow = useRef<() => void>(() => {});
  settleNow.current = () => {
    runningRef.current.forEach((a) => a.stop());
    runningRef.current = [];
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    drop.setValue(1);
    burst.setValue(1);
    nudge.setValue(1);
    glow.setValue(0);
    receipt.setValue(1);
    setDisplayed(to);
    setSettled(true);
  };

  useEffect(() => {
    if (reduceMotion) {
      // 0044 §104 — land settled: final number + receipt, plus ONE quiet glow pulse. No travel.
      drop.setValue(1);
      burst.setValue(1);
      nudge.setValue(1);
      receipt.setValue(1);
      setDisplayed(to);
      setSettled(true);
      const pulse = Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 340, useNativeDriver: true }),
      ]);
      runningRef.current.push(pulse);
      pulse.start();
      return () => {
        pulse.stop();
      };
    }

    // ── the full four-beat sequence ──
    drop.setValue(0);
    burst.setValue(0);
    glow.setValue(0);
    receipt.setValue(0);
    setDisplayed(from);
    setSettled(false);

    // beat 1 THE DROP — thunk home (one overshoot) + the backdrop scrim.
    const dropAnim = Animated.timing(drop, {
      toValue: 1,
      duration: 190,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    // beat 2 THE BURST — the shards fan out (staggered per-shard inside the interpolation).
    const burstAnim = Animated.timing(burst, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const beats = Animated.parallel([dropAnim, Animated.sequence([Animated.delay(90), burstAnim])]);
    runningRef.current.push(beats);
    beats.start();

    // beat 3 THE COUNT-UP — an accelerating roll from `from` to `to`, each tick breathing the gem; the
    // final landing flashes the glow, then beat 4 fades the receipt in.
    const { values, delays } = buildRoll(from, to);
    delays.forEach((at, i) => {
      const id = setTimeout(() => {
        setDisplayed(values[i]!);
        const breath = Animated.sequence([
          Animated.timing(nudge, { toValue: 1.02, duration: 40, useNativeDriver: true }),
          Animated.timing(nudge, { toValue: 1, duration: 70, useNativeDriver: true }),
        ]);
        runningRef.current.push(breath);
        breath.start();
        if (i === values.length - 1) {
          const finale = Animated.sequence([
            Animated.timing(glow, { toValue: 1, duration: 120, useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0, duration: 380, useNativeDriver: true }),
          ]);
          const fadeReceipt = Animated.timing(receipt, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          });
          runningRef.current.push(finale, fadeReceipt);
          finale.start();
          fadeReceipt.start(({ finished }) => {
            if (finished) setSettled(true);
          });
        }
      }, COUNT_START_MS + at);
      timersRef.current.push(id);
    });

    return () => {
      runningRef.current.forEach((a) => a.stop());
      runningRef.current = [];
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, from, to]);

  const scale = drop.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1.15, 0.97, 1] });
  const scrim = drop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const shadeColor = [t.brand.gold, withAlpha(t.brand.gold, 0.82), withAlpha(t.brand.gold, 0.6)] as const;

  return (
    <View style={styles.wrap}>
      {/* the tap-anywhere-to-skip catcher — a full-bleed Pressable BEHIND the content (not wrapping it,
          so the action buttons are never nested inside a button — an invalid-DOM/hydration error on web).
          The decorative layers below are pointerEvents="none" so a tap falls through to this; only the
          receipt actions capture their own taps. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => settleNow.current()}
        accessibilityRole="button"
        accessibilityLabel={`Pack landed. Plus ${granted} pixels. ${from} to ${to}. Tap to continue.`}
      />
      {/* the backdrop scrim (beat 1) — dims slightly behind the moment */}
      <Animated.View pointerEvents="none" style={[styles.scrim, { opacity: scrim }]} />

      <Text pointerEvents="none" style={styles.eyebrow}>PACK LANDED · RECEIPT VERIFIED</Text>

      <View pointerEvents="none" style={styles.big}>
        {/* the pixel-burst overlay (beat 2) — decorative, fans out then fades to nothing */}
        <View style={styles.burstLayer} pointerEvents="none">
          {SHARDS.map((s, i) => {
            const s0 = BURST_START + i * 0.03;
            const p = burst.interpolate({
              inputRange: [s0, Math.min(1, s0 + 0.6)],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            });
            const tx = Math.cos(s.angle) * s.dist;
            const ty = Math.sin(s.angle) * s.dist;
            const opacity = burst.interpolate({
              inputRange: [s0, s0 + 0.08, Math.min(1, s0 + 0.5), 1],
              outputRange: [0, 1, 1, 0],
              extrapolate: 'clamp',
            });
            const grav = p.interpolate({ inputRange: [0, 0.66, 1], outputRange: [0, 0, GRAVITY] });
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  opacity,
                  transform: [
                    { translateX: Animated.multiply(p, tx) },
                    { translateY: Animated.add(Animated.multiply(p, ty), grav) },
                    { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.7] }) },
                    { rotate: `${s.rot}deg` },
                  ],
                }}
              >
                {s.gem ? (
                  <PixelsMark size={s.size} />
                ) : (
                  <View style={{ width: s.size, height: s.size, backgroundColor: shadeColor[s.shade] }} />
                )}
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.bigNum}>+{granted}</Text>
        <Animated.View style={{ transform: [{ scale: nudge }] }}>
          <PixelsMark size={22} />
        </Animated.View>
      </View>

      {/* beat 3 — the live rolling counter (from ➔ <rolling>); the landing digit gets the gold glow */}
      <View pointerEvents="none" style={styles.fromToRow}>
        <Text style={styles.fromTo}>{from} ➔ </Text>
        <View>
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { opacity: glow, backgroundColor: withAlpha(t.brand.gold, 0.5) }]}
          />
          <Text style={[styles.fromTo, styles.fromToBold]}>{displayed}</Text>
        </View>
      </View>

      {/* beat 4 — the receipt: the ledger line + the actions, fading in as the roll lands. box-none so the
          decorative rule/hint pass taps through to the skip catcher; only the actions capture. */}
      <Animated.View pointerEvents="box-none" style={[styles.receipt, { opacity: receipt }]}>
        <View pointerEvents="none" style={styles.rule} />
        <Text pointerEvents="none" style={styles.hint}>Logged in your wallet ledger.</Text>
        <View pointerEvents="auto" style={styles.actions}>
          <ScreenButton label={backLabel} variant="secondary" size="mini" onPress={onBack} />
          <TertiaryLink label="View wallet" onPress={onViewWallet} />
        </View>
      </Animated.View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { alignItems: 'center', gap: t.space.md, paddingTop: t.space.xxl, paddingHorizontal: t.space.lg },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: t.scr.bg },
  eyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 2 },
  big: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  // the burst shards emanate from the centre of the +N row.
  burstLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  bigNum: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.brand.gold, letterSpacing: 1 },
  fromToRow: { flexDirection: 'row', alignItems: 'center' },
  fromTo: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 2 },
  fromToBold: { color: t.brand.gold },
  glow: { ...StyleSheet.absoluteFillObject, margin: -4, borderRadius: 2 },
  receipt: { alignItems: 'center', gap: t.space.md, alignSelf: 'stretch' },
  rule: {
    alignSelf: 'stretch',
    height: 2,
    marginHorizontal: t.space.xxl,
    marginTop: t.space.md,
    backgroundColor: t.brand.gold,
    opacity: 0.6,
  },
  hint: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, marginTop: t.space.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg, marginTop: t.space.md },
}));
