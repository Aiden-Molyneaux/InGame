import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

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

const styles = StyleSheet.create({
  tag: {
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panel,
    paddingHorizontal: theme.space.md,
    paddingVertical: 3,
  },
  dashed: { borderStyle: 'dashed' },
  selected: { borderColor: theme.scr.accent },
  pressed: { opacity: 0.75 },
  label: {
    fontFamily: theme.font.screenSemi,
    fontSize: theme.type.micro, // 9
    color: theme.scr.dim,
    letterSpacing: 1,
  },
  labelSelected: { color: theme.scr.accent },
});
