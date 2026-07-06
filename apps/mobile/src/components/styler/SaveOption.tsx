import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

// A save/outcome sheet row: the action + its consequence in one tile (the two-door model's
// legibility — gate-5 D.23/24). Shared by the Styler SAVE ▸ sheet and the Canvas PressSheet so the
// outcome grammar can't drift between postures. `disabled` = the present-but-disabled posture for
// deferred doors (◆ PUBLISH until M5).

export function SaveOption({
  label,
  sub,
  gold = false,
  disabled = false,
  onPress,
}: {
  label: string;
  sub: string;
  gold?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, gold && styles.rowGold, disabled && styles.rowDisabled]}
    >
      <Text style={[styles.label, gold && styles.labelGold]}>{label.toUpperCase()}</Text>
      <Text style={[styles.sub, gold && styles.subGold]}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 2,
    padding: theme.space.lg,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panelHi,
  },
  rowGold: { backgroundColor: theme.brand.gold, borderColor: theme.brand.gold },
  rowDisabled: { opacity: 0.4 },
  label: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.ink, letterSpacing: 1 },
  labelGold: { color: theme.brand.goldInk },
  sub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, lineHeight: 15 },
  subGold: { color: theme.brand.goldInk, opacity: 0.85 },
});
