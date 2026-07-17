import { Text, View } from 'react-native';
import { themedStyles, useTheme } from '../../theme';
import { tierColor } from './tier';

// TierLegend (component-map §13 · design-spec §1.5) — the three square on-screen swatches (F-07) that
// decode the tier colours: PRESTIGE gold · STANDARD theme-accent · SECRET magenta (ACH-09). Square
// swatches, not pips (F-05/F-09 — the on-screen marker is a flat square, never a round pink LED).
export function TierLegend() {
  const t = useTheme();
  const styles = useStyles();
  const rows: { label: string; color: string }[] = [
    { label: 'PRESTIGE', color: tierColor('prestige', t) },
    { label: 'STANDARD', color: tierColor('standard', t) },
    { label: 'SECRET', color: tierColor('secret', t) },
  ];
  return (
    <View style={styles.legend}>
      {rows.map((r) => (
        <View key={r.label} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: r.color }]} />
          <Text style={styles.label}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg, paddingTop: t.space.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  swatch: { width: 9, height: 9 },
  label: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
}));
