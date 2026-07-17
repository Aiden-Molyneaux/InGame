import { View, Text } from 'react-native';
import { themedStyles } from '../theme';

// RankChip (component-map §5.2) — the trophy rank chip on Top-3 set-pieces: `first` = GOLD (the
// F-02 trophy carve-out); others = accent outline. (The TOP-view LIST rank marker is a different
// element — StateMark orange, never gold — C6.)
export function RankChip({ rank }: { rank: number }) {
  const first = rank === 1;
  const styles = useStyles();
  return (
    <View style={[styles.chip, first ? styles.first : styles.rest]}>
      <Text style={[styles.label, first ? styles.labelFirst : styles.labelRest]}>#{rank}</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  chip: {
    paddingHorizontal: t.space.md,
    paddingVertical: 1,
    borderWidth: 1,
    alignSelf: 'center',
  },
  first: { backgroundColor: t.brand.gold, borderColor: t.brand.gold },
  rest: { backgroundColor: 'transparent', borderColor: t.scr.accent },
  label: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    letterSpacing: 0.5,
  },
  labelFirst: { color: t.brand.goldInk },
  labelRest: { color: t.scr.accent },
}));
