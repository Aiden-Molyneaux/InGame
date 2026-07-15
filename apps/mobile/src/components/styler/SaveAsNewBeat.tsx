import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import { themedStyles } from '../../theme';

// SaveAsNewBeat (M5 D5) — the IN-PLACE acknowledgment for SAVE AS NEW. Mirrors the KeepBeat grammar (a
// light gold ✓ strip — decision 0015's light-tier beat), NOT a toast and NOT a full-screen takeover:
// SAVE AS NEW forks a copy and the SESSION CONTINUES in the editor on that fork, so the confirmation
// rides in-place beside the work and auto-dismisses after a short dwell. Honors reduce-motion (0044
// §104 — no fade, the strip carries the beat) and self-announces the outcome (CARD-16 live-region).
const DWELL_MS = 2200;

export function SaveAsNewBeat({ title, onDone }: { title: string; onDone: () => void }) {
  const styles = useStyles();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.announceForAccessibility?.(`Saved as a new card — ${title} II. The card you opened is untouched.`);
    // read reduce-motion at fire time (a mount-and-animate beat — the shared async hook would flash then
    // freeze the fade mid-flight; the KeepBeat pattern).
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!mounted) return;
      if (reduce) fade.setValue(1);
      else Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
    const t = setTimeout(onDone, DWELL_MS);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [fade, onDone, title]);

  return (
    <Animated.View style={[styles.strip, { opacity: fade }]} accessibilityRole="alert">
      <Text style={styles.ic}>✓</Text>
      <View style={styles.tx}>
        <Text style={styles.title}>SAVED AS A NEW CARD</Text>
        <Text style={styles.sub}>«{title} II» — the card you opened is untouched. Keep editing this copy.</Text>
      </View>
    </Animated.View>
  );
}

const useStyles = themedStyles((t) => ({
  // the KeepBeat okStrip aesthetic — gold-tinted plane, gold hairline, ✓ + the outcome line.
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: 'rgba(255,210,63,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.55)',
  },
  ic: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.gold },
  tx: { gap: 2, flexShrink: 1 },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.8 },
  sub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, lineHeight: 15 },
}));
