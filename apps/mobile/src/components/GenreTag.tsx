import { Pressable, Text } from 'react-native';
import { themedStyles } from '../theme';

// GenreTag (component-map §5.4 — was GTag) — a small genre chip. Selection = accent border (F-09);
// `dashed` = the ADD/ghost variant. Flat + square (F-03/F-07).
export function GenreTag({
  label,
  selected,
  dashed,
  onPress,
}: {
  label: string;
  selected?: boolean;
  dashed?: boolean;
  onPress?: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tag,
        dashed && styles.dashed,
        selected && styles.selected,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((t) => ({
  tag: {
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panel,
    paddingHorizontal: t.space.md,
    paddingVertical: 3,
  },
  dashed: { borderStyle: 'dashed' },
  selected: { borderColor: t.scr.accent },
  pressed: { opacity: 0.75 },
  label: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 1,
  },
  labelSelected: { color: t.scr.accent },
}));
