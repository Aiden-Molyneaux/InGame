import { useState, type ReactNode } from 'react';
import { Pressable, Text, View, StyleSheet, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../theme';
import { steppedRectPath } from '../theme/steppedPath';

// ScreenButton (component-map §5.3 — was KeycapButton) — the on-screen action. F-03: FLAT (no raised
// 3D edge), pressed = a hairline-darkened "scanline energize" fill. F-02: `add` = GOLD (acquisitive —
// card-creating / currency / add-to-collection) AND carries the TL+BR pixel-STEP intrinsically
// (decision 0041 §2: the step is intrinsic to `.btn.add`, not a per-callsite gate). F-07: square on
// screen (radius only on the shell) — the `add` step is the F-02 exception, not a radius.
export type ScreenButtonVariant = 'primary' | 'action-alt' | 'secondary' | 'destructive' | 'add';

const FILL: Record<ScreenButtonVariant, string> = {
  primary: theme.scr.accent,
  'action-alt': theme.scr.accent,
  secondary: theme.brand.cream, // decision 0069 — the one cream secondary/keycap voice (was scr.panelHi grey)
  destructive: theme.brand.alert,
  add: theme.brand.gold, // F-02 acquisitive
};
const INK: Record<ScreenButtonVariant, string> = {
  primary: theme.scr.accentInk,
  'action-alt': theme.scr.accentInk,
  secondary: theme.brand.navy, // decision 0069 — navy on cream
  destructive: theme.brand.cream,
  add: theme.brand.goldInk, // F-02
};

// F-02 `add` step: intent buttons borrow the GameCard step at half-scale (decision 0041); the gold
// face is the shared `steppedRectPath` SVG polygon (RN has no clip-path). TR + BL stay square.
const ADD_STEP_UNIT = theme.step / 2;

export function ScreenButton({
  label,
  onPress,
  onPressIn,
  onPressOut,
  variant = 'primary',
  size,
  active = false,
  disabled,
  block,
  icon,
  style,
  accessibilityLabel,
  stepped: steppedProp,
}: {
  label: string;
  onPress?: () => void;
  /** momentary-key passthrough (the Canvas PROOF hold-or-tap key, decision 0069). */
  onPressIn?: () => void;
  onPressOut?: () => void;
  variant?: ScreenButtonVariant;
  /** `mini` = the compact cream keycap (TRANSFORM / panel-door EDIT); default = full button. */
  size?: 'mini';
  /** persistent ON state for a cream mode-key (PROOF proofing · TRANSFORM open) — darkened-cream fill. */
  active?: boolean;
  disabled?: boolean;
  block?: boolean;
  /** Optional leading icon (e.g. the ADD "+"); rendered before the label. */
  icon?: ReactNode;
  style?: ViewStyle;
  /** Accessibility name override (defaults to the visible label). */
  accessibilityLabel?: string;
  /** Force the F-02 pixel-step face on a non-`add` variant (the Styler's orange ⤢ CANVAS, gate-5 D.20). */
  stepped?: boolean;
}) {
  const stepped = steppedProp ?? variant === 'add';
  const mini = size === 'mini';
  const [polySize, setPolySize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = stepped
    ? (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setPolySize((prev) => (prev?.w === width && prev?.h === height ? prev : { w: width, h: height }));
      }
    : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLayout={onLayout}
      style={({ pressed }) => [
        styles.base,
        mini && styles.mini,
        // The gold face is the SVG polygon for `add`; other variants keep a square fill. Until
        // onLayout delivers a size there is no polygon yet — fall back to a square gold fill for
        // that first frame rather than rendering goldInk text on the bare screen bg.
        stepped ? (polySize ? styles.steppedBase : { backgroundColor: FILL[variant] }) : { backgroundColor: FILL[variant] },
        active && styles.active, // decision 0069 — darkened-cream ON state (F-03, no travel)
        block && styles.block,
        pressed && styles.pressed, // F-03 scanline-energize (darken, no travel)
        disabled && styles.disabled,
        style,
      ]}
    >
      {stepped && polySize ? (
        <Svg width={polySize.w} height={polySize.h} style={StyleSheet.absoluteFill}>
          <Path d={steppedRectPath(polySize.w, polySize.h, ADD_STEP_UNIT)} fill={FILL[variant]} />
        </Svg>
      ) : null}
      <View style={styles.content}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={[styles.label, mini && styles.labelMini, { color: INK[variant] }]}>{label.toUpperCase()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: theme.space.lg,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.corner.screen, // F-07 square
    alignItems: 'center',
    justifyContent: 'center',
  },
  mini: { paddingVertical: theme.space.md, paddingHorizontal: theme.space.md }, // compact cream keycap (decision 0069)
  steppedBase: { backgroundColor: 'transparent' }, // the gold face is the SVG polygon (notched corners show through)
  active: { backgroundColor: theme.brand.creamPressed }, // darkened-cream ON state (decision 0069)
  content: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  icon: { alignItems: 'center', justifyContent: 'center' },
  block: { alignSelf: 'stretch' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.4 },
  label: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.body,
    letterSpacing: 1.5,
  },
  labelMini: { fontSize: theme.type.micro, letterSpacing: 1 }, // 9px keycap label (decision 0069)
});
