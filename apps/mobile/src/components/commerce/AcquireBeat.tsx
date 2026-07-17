import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useTheme, withAlpha } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import { PixelsMark } from './PixelsMark';

// AcquireBeat (M5 F-9 · ruling G6) — the cosmetic-acquire celebration: the SMALLER cousin of the coin
// drop (LandedMoment). A brief gold beat + 2-3 shards at the exact point of purchase (the buy bar / the
// adopt sheet), ≤600ms, tap-through, then it fades to nothing and the surface shows its settled/owned
// state. Reduce-motion (0044 §104) = a single quiet glow pulse, no travel. RN-Animated + the shared
// useReducedMotion gate. Rendered as an absolute overlay OVER the acting surface (pointerEvents pass
// through the decorative layers so a tap never traps).
//
// Deterministic shard layout (no Math.random — test-stable): three shards fanning up-and-out, one a tiny
// PixelsMark gem, sized ≤ ~46px reach (a bar-scale pop, not the full-screen coin-drop fan).
type Shard = { angle: number; dist: number; size: number; gem?: boolean; rot: number };
const SHARDS: Shard[] = [
  { angle: -0.5 * Math.PI, dist: 34, size: 6, rot: 12 }, // up
  { angle: -0.18 * Math.PI, dist: 40, size: 10, gem: true, rot: 0 }, // up-right gem
  { angle: -0.82 * Math.PI, dist: 38, size: 6, rot: -18 }, // up-left
];
const TOTAL_MS = 560; // ≤600ms (G6)

export function AcquireBeat({ onDone }: { onDone?: () => void }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const beat = useRef(new Animated.Value(0)).current; // the gold flash pulse (0→1→0 handled by interp)
  const burst = useRef(new Animated.Value(0)).current; // shard fan-out
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const finish = () => {
      timer.current = null;
      onDone?.();
    };
    if (reduceMotion) {
      // one quiet glow pulse, no travel.
      const pulse = Animated.sequence([
        Animated.timing(beat, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]);
      running.current = pulse;
      pulse.start();
      timer.current = setTimeout(finish, 500);
    } else {
      const seq = Animated.parallel([
        Animated.sequence([
          Animated.timing(beat, { toValue: 1, duration: 130, useNativeDriver: true }),
          Animated.timing(beat, { toValue: 0, duration: 340, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(burst, { toValue: 1, duration: TOTAL_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]);
      running.current = seq;
      seq.start();
      timer.current = setTimeout(finish, TOTAL_MS);
    }
    return () => {
      running.current?.stop();
      running.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const glowOpacity = beat.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <View pointerEvents="box-none" style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* tap-anywhere skips (never trap) — a full-bleed catcher behind the decorative layers */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          running.current?.stop();
          if (timer.current) clearTimeout(timer.current);
          onDone?.();
        }}
        accessibilityRole="none"
      />
      {/* the gold beat — a soft centered flash */}
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, { backgroundColor: withAlpha(t.brand.gold, 0.9), opacity: glowOpacity }]}
      />
      {/* the shards (skipped under reduce-motion — burst stays 0) */}
      <View pointerEvents="none" style={styles.burstLayer}>
        {SHARDS.map((s, i) => {
          const p = burst;
          const tx = Math.cos(s.angle) * s.dist;
          const ty = Math.sin(s.angle) * s.dist;
          const opacity = burst.interpolate({
            inputRange: [0, 0.15, 0.7, 1],
            outputRange: [0, 1, 1, 0],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                opacity,
                transform: [
                  { translateX: Animated.multiply(p, tx) },
                  { translateY: Animated.multiply(p, ty) },
                  { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.7] }) },
                  { rotate: `${s.rot}deg` },
                ],
              }}
            >
              {s.gem ? (
                <PixelsMark size={s.size} />
              ) : (
                <View style={{ width: s.size, height: s.size, backgroundColor: t.brand.gold }} />
              )}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 120, height: 60, borderRadius: 4 },
  burstLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
