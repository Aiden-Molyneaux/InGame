import { View, Text } from 'react-native';
import { themedStyles } from '../theme';

// StatTile (component-map §5.4) — a boxless stat (value + caps label). PctPill is threshold/privacy
// gated (PROF-07); every tile renders cleanly WITHOUT its chip (design rule — the chip is enhancement).
export function StatTile({ value, label }: { value: string | number; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  tile: { alignItems: 'center', gap: 1 }, // centred within its container (mockup `.stat`)
  value: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.title, // 15 (F-06)
    color: t.scr.ink,
  },
  label: {
    fontFamily: t.font.screen,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 1,
  },
}));
