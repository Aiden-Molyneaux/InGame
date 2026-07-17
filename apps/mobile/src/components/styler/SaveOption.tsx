import { Pressable, Text } from 'react-native';
import { themedStyles } from '../../theme';

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
  const styles = useStyles();
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

const useStyles = themedStyles((t) => ({
  row: {
    gap: 2,
    padding: t.space.lg,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panelHi,
  },
  rowGold: { backgroundColor: t.brand.gold, borderColor: t.brand.gold },
  rowDisabled: { opacity: 0.4 },
  label: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1 },
  labelGold: { color: t.brand.goldInk },
  sub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, lineHeight: 15 },
  subGold: { color: t.brand.goldInk, opacity: 0.85 },
}));
