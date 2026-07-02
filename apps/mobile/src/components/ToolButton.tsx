import { Pressable, Text, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { StateMark } from './StateMark';

// ToolButton (component-map §5.3 — was ToolKeycap) — the cream utility keycap in the ToolsBar:
// glyph (+ tiny label), `active` = the F-09 StateMark. Flat (F-03), square on-screen (F-07).
// OQ-034: a TAP acts (search toggles, sort flips, view cycles); a LONG-PRESS opens the drawer.
export function ToolButton({
  glyph,
  label,
  active,
  onPress,
  onLongPress,
}: {
  glyph: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={styles.key}>
        <Text style={styles.glyph}>{glyph}</Text>
        {active ? <StateMark size={6} style={styles.mark} /> : null}
      </View>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  pressed: { opacity: 0.75 }, // F-03 — energize, no travel
  key: {
    width: 32,
    height: 30,
    backgroundColor: theme.brand.cream,
    borderRadius: theme.corner.screen, // F-07 square
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.title, // 15
    color: theme.brand.navy,
  },
  mark: { position: 'absolute', top: 2, right: 2 },
  label: {
    fontFamily: theme.font.screenSemi,
    fontSize: theme.type.micro, // 9
    color: theme.scr.dim,
    letterSpacing: 0.5,
  },
});
