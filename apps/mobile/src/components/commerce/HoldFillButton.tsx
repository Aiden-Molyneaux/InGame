import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, Text } from 'react-native';
import { themedStyles, useTheme } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';

// HoldFillButton (M5 F-9 · the owner's buy-experience unification, ruling G2) — the ONE hold-to-activate
// primitive every PX/money confirm in the app now speaks through. A press-and-HOLD key that visibly
// FILLS gold left→right over the hold duration; completing the hold fires `onComplete`, releasing early
// cancels (nothing fired). This is the shared piece BuyBar (the PX buy bar) and the mock PAY confirm
// both compose — never a per-surface fork.
//
// Reduce-motion (0044 §104): a timed gesture must never gate a motor-impaired user, so under OS
// reduce-motion the key collapses to a PLAIN press → `onComplete` immediately (no hold, no fill). Sites
// that need a *second* explicit confirm under reduce-motion (BuyBar, which isn't already behind a
// confirm gate) own that two-step themselves and only mount this primitive on the motion path; the mock
// PAY key sits INSIDE a ConfirmSheet (already the confirm gate), so an immediate press is correct there.
export const HOLD_MS = 650;

export function HoldFillButton({
  label,
  onComplete,
  disabled = false,
  holdMs = HOLD_MS,
  tone = 'gold',
  block = false,
  accessibilityLabel,
}: {
  label: string;
  onComplete: () => void;
  disabled?: boolean;
  holdMs?: number;
  /** `gold` = the PX/economy voice (F-02); `cream` = the neutral $ voice (0069) — the fill is gold either way. */
  tone?: 'gold' | 'cream';
  block?: boolean;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const [holding, setHolding] = useState(false);
  const fill = useRef(new Animated.Value(0)).current; // 0→1 the left→right gold sweep
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    anim.current?.stop();
    anim.current = null;
  }, []);
  useEffect(() => clear, [clear]);

  const startHold = useCallback(() => {
    if (disabled) return;
    setHolding(true);
    clear();
    fill.setValue(0);
    // the visual fill (scaleX left→right) runs in parallel with a deterministic completion timer — the
    // timer (not the animation callback) fires `onComplete`, so fake-timer tests advance cleanly.
    anim.current = Animated.timing(fill, { toValue: 1, duration: holdMs, useNativeDriver: true });
    anim.current.start();
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onComplete();
    }, holdMs);
  }, [disabled, clear, fill, holdMs, onComplete]);

  const cancelHold = useCallback(() => {
    clear();
    setHolding(false);
    Animated.timing(fill, { toValue: 0, duration: 120, useNativeDriver: true }).start();
  }, [clear, fill]);

  const toneStyle = tone === 'gold' ? styles.gold : styles.cream;
  const inkStyle = tone === 'gold' ? styles.goldInk : styles.creamInk;
  const fillColor = tone === 'gold' ? '#ffe08a' : t.brand.gold;

  // Reduce-motion — a plain press fires immediately (no timed hold to defeat a motor impairment).
  if (reduceMotion) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          if (!disabled) onComplete();
        }}
        style={[styles.base, toneStyle, block && styles.block, disabled && styles.disabled]}
      >
        <Text style={[styles.label, inkStyle]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={startHold}
      onPressOut={cancelHold}
      style={[styles.base, toneStyle, block && styles.block, holding && styles.holding, disabled && styles.disabled]}
    >
      {/* the left→right gold fill (G2) — a scaleX sweep pinned to the left edge, purely decorative */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          { backgroundColor: fillColor, opacity: holding ? 1 : 0, transform: [{ scaleX: fill }] },
        ]}
      />
      <View style={styles.content}>
        <Text style={[styles.label, inkStyle]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const useStyles = themedStyles((t) => ({
  base: {
    overflow: 'hidden',
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gold: { backgroundColor: t.brand.gold },
  cream: {
    backgroundColor: t.scr.key,
    ...(t.scr.isLight ? { borderWidth: 1, borderColor: t.scr.dim } : null),
  },
  // F-03 held = a hairline-darkened seat under the sweep (no travel).
  holding: { backgroundColor: t.scr.isLight ? t.scr.key : '#e0b933' },
  block: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  // the sweep origin-left; transformOrigin needs RN ≥0.74 (already used by PrintRitual/KeepBeat).
  fill: { ...StyleSheet.absoluteFillObject, transformOrigin: 'left' },
  content: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  label: { fontFamily: t.font.screenBold, fontSize: t.type.body, letterSpacing: 1 },
  goldInk: { color: t.brand.goldInk },
  creamInk: { color: t.brand.navy },
}));
