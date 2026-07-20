import { View, Text } from 'react-native';
import { themedStyles } from '../../theme';

// UltimateChip (M6 W-5 · decision 0080 ruling 3 · draft §4.1) — the top-of-the-ladder tier mark. F-02
// grammar: gold = value/economy, and tiers today surface only as the PriceChip integer (gold TEXT). The
// one escalation the grammar allows without a new colour is INVERSION: a gold-FILL chip with midnight
// ink (the inverse of every gold-on-dark economy mark), so it reads instantly as "ultimate" beside the
// standard PriceChip. Rendered wherever `tier === 'ultimate'` — the store item tile/sheet + the adopt
// component rows. `compact` trims it for tight cost-stack rows (reconcile/adopt) where the row is dense.
export function UltimateChip({ compact = false }: { compact?: boolean }) {
  const styles = useStyles();
  return (
    <View
      style={[styles.chip, compact && styles.chipCompact]}
      accessibilityRole="text"
      accessibilityLabel="Ultimate"
    >
      <Text style={[styles.text, compact && styles.textCompact]}>ULTIMATE</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  // the inverted economy mark — bright gold FILL + dark gold-ink, theme-invariant (currency reads the
  // same under every theme, the PriceChip precedent).
  chip: {
    backgroundColor: t.brand.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipCompact: { paddingHorizontal: 5, paddingVertical: 2 },
  text: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.brand.goldInk,
    letterSpacing: 1,
  },
  textCompact: { letterSpacing: 0.5 },
}));
