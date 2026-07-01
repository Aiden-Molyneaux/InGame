import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '../theme';

// ScreenButton (component-map §5.3 — was KeycapButton) — the on-screen action. F-03: FLAT (no raised
// 3D edge), pressed = a hairline-darkened "scanline energize" fill. F-02: `add` = GOLD (acquisitive —
// card-creating / currency / add-to-collection). F-07: square on-screen (radius only on the shell).
export type ScreenButtonVariant = 'primary' | 'action-alt' | 'secondary' | 'destructive' | 'add';

const FILL: Record<ScreenButtonVariant, string> = {
  primary: theme.scr.accent,
  'action-alt': theme.scr.accent,
  secondary: theme.scr.panelHi,
  destructive: theme.brand.alert,
  add: theme.brand.gold, // F-02 acquisitive
};
const INK: Record<ScreenButtonVariant, string> = {
  primary: theme.scr.accentInk,
  'action-alt': theme.scr.accentInk,
  secondary: theme.scr.ink,
  destructive: theme.brand.cream,
  add: theme.brand.goldInk, // F-02
};

export function ScreenButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  block,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ScreenButtonVariant;
  disabled?: boolean;
  block?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: FILL[variant] },
        block && styles.block,
        pressed && styles.pressed, // F-03 scanline-energize (darken, no travel)
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color: INK[variant] }]}>{label.toUpperCase()}</Text>
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
  block: { alignSelf: 'stretch' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.4 },
  label: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.body,
    letterSpacing: 1.5,
  },
});
