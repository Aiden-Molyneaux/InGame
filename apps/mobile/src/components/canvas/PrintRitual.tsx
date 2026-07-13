import { useEffect, useRef } from 'react';
import { View, Text, Animated, AccessibilityInfo, Pressable, StyleSheet } from 'react-native';
import { CardFace } from '../CardFace';
import { ScreenButton } from '../ScreenButton';
import { theme, themedStyles } from '../../theme';
import type { CardComposition } from '../../render/composition';

// PrintRitual (component-map §8b / canvas board P8 · OQ-040) — the FULL-tier celebration a Canvas
// PUBLISH earns (the deep editor's payoff, distinct from the Styler KEEP's light KeepBeat). "The press
// runs": the card gets STAMPED (a quick press-down + gold flash), then settles under a ✓ PUBLISHED strip
// with the adoptable line + honest clout. Reuses the KeepBeat/LandedMoment motion vocabulary and honors
// reduce-motion (0044 §104): the stamp never plays, the strip carries the beat. Themed-token native.

export function PrintRitual({
  title,
  composition,
  cardsDesigned,
  onDone,
  onShare,
}: {
  title: string;
  composition: CardComposition;
  cardsDesigned: number | null;
  onDone: () => void;
  /** CARD-21 share (P9) — absent, the door renders as the deferred "arrives with sharing" line. */
  onShare?: () => void;
}) {
  const styles = useStyles();
  const stamp = useRef(new Animated.Value(0)).current; // 0 = raised/incoming, 1 = pressed home
  const flash = useRef(new Animated.Value(0)).current;

  // ONE-SHOT mount-fire (CARD-16/0044 §104): read reduce-motion once, await it before starting — a
  // mid-flight enable would flash then freeze (the KeepBeat murr-M2 pattern). Reduced → land settled.
  useEffect(() => {
    let mounted = true;
    const anim = Animated.sequence([
      Animated.timing(stamp, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!mounted) return;
      if (reduce) {
        stamp.setValue(1);
        flash.setValue(0);
      } else {
        anim.start();
      }
    });
    return () => {
      mounted = false;
      anim.stop();
    };
  }, [stamp, flash]);

  const scale = stamp.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1] });

  return (
    <View style={styles.wrap} accessibilityLabel={`Published ${title}. Adoptable by everyone.`}>
      <Text style={styles.eyebrow}>THE PRESS RUNS · PUBLISHED</Text>
      <View style={styles.stampWrap}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <CardFace title={title} composition={composition} size="pick" animate />
        </Animated.View>
        {/* the gold flash of the press coming home (decorative; fades to nothing) */}
        <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) }]} />
      </View>

      <View style={styles.okStrip}>
        <Text style={styles.okIc}>◆</Text>
        <View style={styles.okTx}>
          <Text style={styles.okTitle}>PUBLISHED FOR {title.toUpperCase()}</Text>
          <Text style={styles.okSub}>Adoptable by everyone — it’s in the community gallery now.</Text>
        </View>
      </View>

      {cardsDesigned !== null ? (
        <Text style={styles.clout}>
          {cardsDesigned} CARD{cardsDesigned === 1 ? '' : 'S'} DESIGNED · 0 ADOPTIONS
        </Text>
      ) : null}

      {onShare ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Share this card" onPress={onShare} hitSlop={6}>
          <Text style={styles.shareDoorLive}>↗ SHARE THIS CARD</Text>
        </Pressable>
      ) : (
        <Text style={styles.shareDoor}>↗ SHARE — arrives with card sharing</Text>
      )}
      <ScreenButton label="Done — back to the game" onPress={onDone} block />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { alignItems: 'center', gap: t.space.lg, paddingVertical: t.space.lg },
  eyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 2 },
  stampWrap: { alignItems: 'center', justifyContent: 'center', padding: t.space.sm },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.brand.gold },
  okStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: 'rgba(255,210,63,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.55)',
    alignSelf: 'stretch',
  },
  okIc: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.gold },
  okTx: { gap: 2, flexShrink: 1 },
  okTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.8 },
  okSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  clout: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  shareDoor: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
  shareDoorLive: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },
}));
