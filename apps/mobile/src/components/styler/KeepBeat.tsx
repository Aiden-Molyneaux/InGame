import { useEffect, useRef } from 'react';
import { View, Text, Animated, AccessibilityInfo, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CardFace } from '../CardFace';
import { ScreenButton } from '../ScreenButton';
import { theme, themedStyles, useTheme } from '../../theme';
import type { CardComposition } from '../../render/composition';

// KeepBeat (component-map §8a / board P7) — the LIGHT celebration tier (decision 0015): the finished
// card + ONE gold edge-pulse + the ✓ strip. Deliberately no ritual (that's canvas-tier, OQ-040).
// Honors reduce-motion (0044 baseline): the pulse is skipped, the strip stays. The clout line is
// AGGREGATE + honest (cardsDesigned real; adoptions 0 until M5 — CARD-05/decision 0036).

// E7a (M5 F-9) — the KEEP flow gains the CARD-21 share affordance for the just-kept card (owner may
// share a PRIVATE card of their own). The mark mirrors the PrintRitual's ShareGlyph (a HOUSE inline SVG
// up-arrow-out-of-a-tray), never a Unicode/emoji arrow.
function ShareGlyph({ size = 11, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12 V20 H19 V12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 3.5 V14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 7 L12 3.5 L16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function KeepBeat({
  title,
  composition,
  cardsDesigned,
  pxSpent = 0,
  onDone,
  onEditArt,
  onShare,
}: {
  title: string;
  composition: CardComposition;
  cardsDesigned: number | null;
  /** CARD-13 — PX spent acquiring premium components as part of this KEEP (0 = none rode along). */
  pxSpent?: number;
  onDone: () => void;
  /** The Canvas door (§3.4) — absent, the door renders as the disabled "arrives later" line. */
  onEditArt?: () => void;
  /** E7a (M5 F-9) — CARD-21 share of the just-kept card; absent → the deferred "arrives" line. */
  onShare?: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const styles = useStyles();
  const t = useTheme();

  // A ONE-SHOT mount-fire celebration (CARD-16/0044 §104): the reduce-motion setting at KEEP time is
  // what matters (live-update is irrelevant for a fire-once beat), so read it directly and AWAIT it
  // before starting — the shared `useReducedMotion()` hook resolves async (false→true), which for a
  // mount-and-animate control would flash then freeze the pulse mid-flight (murr M2). If reduced, the
  // pulse never starts and the ✓ strip carries the beat.
  useEffect(() => {
    let mounted = true;
    const anim = Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
    ]);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (mounted && !reduce) anim.start();
    });
    return () => {
      mounted = false;
      anim.stop();
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
          {pxSpent > 0 ? (
            <Text style={styles.spent}>− {pxSpent} PX · premium components acquired — yours to keep.</Text>
          ) : null}
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
      ) : null}

      {/* E7a — the CARD-21 share row (glyph, not emoji), mirroring the PrintRitual share grammar. */}
      {onShare ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Share this card" onPress={onShare} hitSlop={6} style={styles.shareRow}>
          <ShareGlyph size={11} color={t.scr.accent} />
          <Text style={styles.shareDoorLive}>SHARE THIS CARD</Text>
        </Pressable>
      ) : null}

      <ScreenButton label="Done — back to the game" onPress={onDone} block />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { alignItems: 'center', gap: t.space.lg, paddingVertical: t.space.lg },
  pulseFrame: { borderWidth: 2, borderColor: 'transparent', padding: t.space.sm },
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
  spent: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 0.5, marginTop: 2 },
  clout: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  canvasDoorLive: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  shareDoorLive: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },
}));
