import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, Text, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { themedStyles, theme, useTheme } from '../../theme';
import { steppedRectPath } from '../../theme/steppedPath';
import { useReducedMotion } from '../../a11y/useReducedMotion';

// HoldFillButton (M5 F-9 · the owner's buy-experience unification, ruling G2) — the ONE hold-to-activate
// primitive every PX/money confirm in the app now speaks through. A press-and-HOLD key that visibly
// FILLS gold left→right over the hold duration; completing the hold fires `onComplete`, releasing early
// cancels (nothing fired). This is the shared piece BuyBar (the PX buy bar) and the mock PAY confirm
// both compose — never a per-surface fork.
//
// F-21 ruling 1 (owner buy-drawer walk 2026-07-16) — the key wears the HOUSE STEPPED-EDGE silhouette:
// the TL+BR pixel-step notch (decision 0041, the GameCard/ScreenButton `add` corner grammar), drawn as a
// filled `<Path>` face (RN has no clip-path for the View itself). The gold fill-on-hold sweep is CLIPPED
// to that stepped shape via an SVG `<ClipPath>` (an AnimatedRect widening 0→w inside the notched polygon)
// so the sweep can never poke square corners past the silhouette. Both tones step; the fill stays gold.
//
// Reduce-motion (0044 §104): a timed gesture must never gate a motor-impaired user, so under OS
// reduce-motion the key collapses to a PLAIN press → `onComplete` immediately (no hold, no fill). Sites
// that need a *second* explicit confirm under reduce-motion (BuyBar, which isn't already behind a
// confirm gate) own that two-step themselves and only mount this primitive on the motion path; the mock
// PAY key sits INSIDE a ConfirmSheet (already the confirm gate), so an immediate press is correct there.
export const HOLD_MS = 650;

// F-03 pixel-step unit — the house stepped-edge, matching ScreenButton's `add` face (theme.step / 2).
const STEP_UNIT = theme.step / 2;

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
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const fill = useRef(new Animated.Value(0)).current; // 0→1 the left→right gold sweep (SVG-clipped)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  // a per-instance clip id (colons out of useId() aren't valid inside an url(#…) reference).
  const clipId = 'hfclip' + useId().replace(/:/g, '');

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev?.w === width && prev?.h === height ? prev : { w: width, h: height }));
  }, []);

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
    // the visual fill (an SVG rect widening 0→w) runs in parallel with a deterministic completion timer —
    // the timer (not the animation callback) fires `onComplete`, so fake-timer tests advance cleanly. The
    // sweep drives an SVG prop, so it is JS-driven (SVG props can't use the native driver).
    anim.current = Animated.timing(fill, { toValue: 1, duration: holdMs, useNativeDriver: false });
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
    Animated.timing(fill, { toValue: 0, duration: 120, useNativeDriver: false }).start();
  }, [clear, fill]);

  const toneBg = tone === 'gold' ? t.brand.gold : t.scr.key;
  const inkStyle = tone === 'gold' ? styles.goldInk : styles.creamInk;
  const fillColor = tone === 'gold' ? '#ffe08a' : t.brand.gold;
  // F-03 held seat — the face darkens a hair under the sweep (no travel); mirrors the old `holding` fill.
  const heldFace = t.scr.isLight ? t.scr.key : '#e0b933';
  const faceColor = holding ? heldFace : toneBg;
  // a flat light cream key can't self-contrast on a light bg (0070/OQ-144) — stroke the stepped edge.
  const needsBorder = t.scr.isLight && tone === 'cream';

  const path = size ? steppedRectPath(size.w, size.h, STEP_UNIT) : '';
  const sweepWidth = size ? fill.interpolate({ inputRange: [0, 1], outputRange: [0, size.w] }) : 0;

  // The stepped gold/cream FACE — the SVG polygon (RN has no View clip-path), with the hold sweep clipped
  // to it. Until onLayout delivers a size there is no polygon yet → the base falls back to a square tone
  // fill for that first frame (and in jsdom tests) rather than a bare button.
  const face =
    size ? (
      <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={path} />
          </ClipPath>
        </Defs>
        <Path
          d={path}
          fill={faceColor}
          stroke={needsBorder ? t.scr.dim : 'none'}
          strokeWidth={needsBorder ? 1 : 0}
        />
        {holding ? (
          <AnimatedRect
            x={0}
            y={0}
            width={sweepWidth as unknown as number}
            height={size.h}
            fill={fillColor}
            clipPath={`url(#${clipId})`}
          />
        ) : null}
      </Svg>
    ) : null;

  const cornerFallback = size
    ? styles.steppedBase
    : [{ backgroundColor: toneBg }, needsBorder ? { borderWidth: 1, borderColor: t.scr.dim } : null];

  // Reduce-motion — a plain press fires immediately (no timed hold to defeat a motor impairment).
  if (reduceMotion) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onLayout={onLayout}
        onPress={() => {
          if (!disabled) onComplete();
        }}
        style={[styles.base, cornerFallback, block && styles.block, disabled && styles.disabled]}
      >
        {face}
        <View style={styles.content}>
          <Text style={[styles.label, inkStyle]}>{label}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onLayout={onLayout}
      onPressIn={startHold}
      onPressOut={cancelHold}
      style={[styles.base, cornerFallback, block && styles.block, disabled && styles.disabled]}
    >
      {face}
      <View style={styles.content}>
        <Text style={[styles.label, inkStyle]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const useStyles = themedStyles((t) => ({
  base: {
    // W-B3 (owner walk2) — proper BUTTON height: the key was a hair short (vertical pad md/8) next to
    // every ScreenButton keycap. It now wears the ScreenButton height grammar (lg/12 vertical ·
    // xl/16 horizontal, ScreenButton.tsx `base`) — fixed HERE ONCE, so every buy surface that composes
    // this primitive (BuyBar → ItemSheet/ReconcileSheet/KeepBar/AdoptCardSheet · the ConfirmSheet PAY)
    // ripples without per-surface forks.
    paddingHorizontal: t.space.xl,
    paddingVertical: t.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // the stepped gold/cream face is the SVG polygon; the View bg goes transparent so the notches show.
  steppedBase: { backgroundColor: 'transparent' },
  block: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  content: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  label: { fontFamily: t.font.screenBold, fontSize: t.type.body, letterSpacing: 1 },
  goldInk: { color: t.brand.goldInk },
  creamInk: { color: t.brand.navy },
}));
