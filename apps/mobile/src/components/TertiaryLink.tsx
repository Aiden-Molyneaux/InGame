import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

// TertiaryLink (component-map §5.3) — the quiet text-link action (VIEW TOP 10 ›, return-links).
// `chevron` picks the affix: 'trailing' (default — "LABEL ›", the VIEW-more grammar), 'leading-back'
// (‹ LABEL — the board `.return-link` back-seam, R1-3 S2-b/g), or 'none' (bare LABEL — inline swap
// links). Default keeps every existing call-site (collection/add-game/profile) unchanged.
export function TertiaryLink({
  label,
  onPress,
  dim,
  chevron = 'trailing',
}: {
  label: string;
  onPress: () => void;
  dim?: boolean;
  chevron?: 'trailing' | 'leading-back' | 'none';
}) {
  const text =
    chevron === 'leading-back'
      ? `‹ ${label.toUpperCase()}`
      : chevron === 'none'
        ? label.toUpperCase()
        : `${label.toUpperCase()} ›`;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Text style={[styles.label, dim && styles.dim]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  label: {
    fontFamily: theme.font.screenSemi,
    fontSize: theme.type.micro, // 9
    color: theme.scr.accent,
    letterSpacing: 1,
  },
  dim: { color: theme.scr.dim },
});
