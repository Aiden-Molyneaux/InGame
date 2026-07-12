import { Pressable, Text } from 'react-native';
import { themedStyles } from '../theme';

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
  const styles = useStyles();
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

const useStyles = themedStyles((t) => ({
  pressed: { opacity: 0.7 },
  label: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9
    color: t.scr.accent,
    letterSpacing: 1,
  },
  dim: { color: t.scr.dim },
}));
