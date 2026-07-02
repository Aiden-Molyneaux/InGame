import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

// TertiaryLink (component-map §5.3) — the quiet text-link action (VIEW TOP 10 ›, return-links).
export function TertiaryLink({
  label,
  onPress,
  dim,
}: {
  label: string;
  onPress: () => void;
  dim?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Text style={[styles.label, dim && styles.dim]}>{label.toUpperCase()} ›</Text>
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
