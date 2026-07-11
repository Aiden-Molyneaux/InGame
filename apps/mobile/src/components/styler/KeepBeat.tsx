import { useEffect, useRef } from 'react';
import { View, Text, Animated, AccessibilityInfo, Pressable, StyleSheet } from 'react-native';
import { CardFace } from '../CardFace';
import { ScreenButton } from '../ScreenButton';
import { theme } from '../../theme';
import type { CardComposition } from '../../render/composition';

// KeepBeat (component-map §8a / board P7) — the LIGHT celebration tier (decision 0015): the finished
// card + ONE gold edge-pulse + the ✓ strip. Deliberately no ritual (that's canvas-tier, OQ-040).
// Honors reduce-motion (0044 baseline): the pulse is skipped, the strip stays. The clout line is
// AGGREGATE + honest (cardsDesigned real; adoptions 0 until M5 — CARD-05/decision 0036).

export function KeepBeat({
  title,
  composition,
  cardsDesigned,
  onDone,
  onEditArt,
}: {
  title: string;
  composition: CardComposition;
  cardsDesigned: number | null;
  onDone: () => void;
  /** The Canvas door (§3.4) — absent, the door renders as the disabled "arrives later" line. */
  onEditArt?: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!mounted || reduce) return; // reduce-motion: no pulse, the strip carries the beat
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]).start();
    });
    return () => {
      mounted = false;
    };
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.pulseFrame,
          {
            shadowColor: theme.brand.gold,
            shadowOpacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }),
            shadowRadius: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }),
            borderColor: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(255,210,63,0)', 'rgba(255,210,63,0.9)'],
            }),
          },
        ]}
      >
        <CardFace title={title} composition={composition} size="pick" animate />
      </Animated.View>

      <View style={styles.okStrip}>
        <Text style={styles.okIc}>✓</Text>
        <View style={styles.okTx}>
          <Text style={styles.okTitle}>EQUIPPED FOR {title.toUpperCase()}</Text>
          <Text style={styles.okSub}>Your shelf wears it now.</Text>
        </View>
      </View>

      {cardsDesigned !== null ? (
        <Text style={styles.clout}>
          {cardsDesigned} CARD{cardsDesigned === 1 ? '' : 'S'} DESIGNED · 0 ADOPTIONS
        </Text>
      ) : null}

      {onEditArt ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Edit art — open the Canvas" onPress={onEditArt} hitSlop={6}>
          <Text style={styles.canvasDoorLive}>⤢ EDIT ART — REOPEN IN THE CANVAS</Text>
        </Pressable>
      ) : (
        <Text style={styles.canvasDoor}>⤢ EDIT ART — the Canvas arrives with the deep editor</Text>
      )}
      <ScreenButton label="Done — back to the game" onPress={onDone} block />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: theme.space.lg, paddingVertical: theme.space.lg },
  pulseFrame: { borderWidth: 2, borderColor: 'transparent', padding: theme.space.sm },
  okStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    backgroundColor: 'rgba(255,210,63,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.55)',
    alignSelf: 'stretch',
  },
  okIc: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.brand.gold },
  okTx: { gap: 2, flexShrink: 1 },
  okTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.ink, letterSpacing: 0.8 },
  okSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5 },
  clout: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  canvasDoor: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 0.5 },
  canvasDoorLive: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.accent, letterSpacing: 0.5 },
});
