import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Text } from 'react-native';
import { themedStyles, theme } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import { ScreenButton } from '../ScreenButton';
import { TertiaryLink } from '../TertiaryLink';
import { PixelsMark } from './PixelsMark';

// LandedMoment (component-map §7 infra · board P7) — the pack-purchase success beat: one clean centered
// moment (OQ-040 — the big rituals stay with cards; this is deliberately quiet). Centered +N at display
// scale · the from→to arithmetic · one gold rule · then BACK TO «intent» + VIEW WALLET. The header
// CurrencyCounter does the glow/tick (motion.counterTick) — this beat carries the arithmetic.
//
// F-1 fix 6 (FIRST PASS — flag for the owner's re-look): a brief beat then a small gold pixel-burst
// fires on mount (InGame's pixel-art voice), then settles to the layout below (~840ms total). Honors
// reduce-motion (0044 §104): no travel, the burst never plays, it lands settled instantly.

// 8 radial directions the pixel shards fan out along; unit vectors × BURST_DIST.
const SHARDS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
];
const BURST_DIST = 34;

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
  const reduceMotion = useReducedMotion();
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      burst.setValue(1); // 0044 §104 — settle instantly, no travel
      return;
    }
    burst.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(160), // the brief beat before the burst
      Animated.timing(burst, { toValue: 1, duration: 680, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, burst]);

  return (
    <View style={styles.wrap} accessibilityLabel={`Pack landed. Plus ${granted} pixels. ${from} to ${to}.`}>
      <Text style={styles.eyebrow}>PACK LANDED · RECEIPT VERIFIED</Text>
      <View style={styles.big}>
        {/* the pixel-burst overlay — decorative, fades to nothing as it settles (F-1 fix 6). */}
        <View style={styles.burstLayer} pointerEvents="none">
          {SHARDS.map((s, i) => (
            <Animated.View
              key={i}
              style={[
                styles.shard,
                {
                  opacity: burst.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    { translateX: Animated.multiply(burst, s.dx * BURST_DIST) },
                    { translateY: Animated.multiply(burst, s.dy * BURST_DIST) },
                    { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1.4, 0.4] }) },
                  ],
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.bigNum}>+{granted}</Text>
        <PixelsMark size={22} />
      </View>
      <Text style={styles.fromTo}>
        {from} ➔ <Text style={styles.fromToBold}>{to}</Text>
      </Text>
      <View style={styles.rule} />
      <Text style={styles.hint}>Logged in your wallet ledger.</Text>
      <View style={styles.actions}>
        <ScreenButton label={backLabel} variant="secondary" size="mini" onPress={onBack} />
        <TertiaryLink label="View wallet" onPress={onViewWallet} />
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { alignItems: 'center', gap: t.space.md, paddingTop: t.space.xxl, paddingHorizontal: t.space.lg },
  eyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 2 },
  big: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  // the burst shards emanate from the centre of the +N row (F-1 fix 6).
  burstLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  shard: { position: 'absolute', width: 6, height: 6, backgroundColor: theme.brand.gold },
  bigNum: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.brand.gold, letterSpacing: 1 },
  fromTo: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 2 },
  fromToBold: { color: t.brand.gold },
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
