import { View, Text } from 'react-native';
import { themedStyles } from '../theme';

// PctPill (component-map §5.4 — the contributor STATS percentile chip, CAT-10) — the board `.pct`:
// a small GOLD chip reading `TOP {n}%`. Gold is board-sanctioned here (F-02 prestige/standing
// carve-out, like RankChip/first). Threshold + privacy gated (PROF-07): the caller renders this ONLY
// when the payload carries a percentile — below the cohort floor (or a null `standing`) there is NO
// chip, and the StatTile it rides sits cleanly without one (the chip is enhancement, never structure).
export function PctPill({ percentile }: { percentile: number }) {
  const styles = useStyles();
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>TOP {percentile}%</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  pill: {
    backgroundColor: t.scr.value, // F-02 gold (themed — bright gold on dark, adapted on the light themes)
    paddingHorizontal: t.space.md,
    paddingVertical: 2,
    marginTop: 2,
  },
  label: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.valueInk, // dark ink on the gold face
    letterSpacing: 0.5,
  },
}));
