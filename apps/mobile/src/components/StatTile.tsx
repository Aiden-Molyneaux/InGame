import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

// StatTile (component-map §5.4) — a boxless stat (value + caps label). PctPill is threshold/privacy
// gated (PROF-07); every tile renders cleanly WITHOUT its chip (design rule — the chip is enhancement).
export function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'flex-start', gap: 1, minWidth: 72 },
  value: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.title, // 15 (F-06)
    color: theme.scr.ink,
  },
  label: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.micro, // 9
    color: theme.scr.dim,
    letterSpacing: 1,
  },
});
