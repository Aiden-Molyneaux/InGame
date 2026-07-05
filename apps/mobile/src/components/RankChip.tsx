import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

// RankChip (component-map §5.2) — the trophy rank chip on Top-3 set-pieces: `first` = GOLD (the
// F-02 trophy carve-out); others = accent outline. (The TOP-view LIST rank marker is a different
// element — StateMark orange, never gold — C6.)
export function RankChip({ rank }: { rank: number }) {
  const first = rank === 1;
  return (
    <View style={[styles.chip, first ? styles.first : styles.rest]}>
      <Text style={[styles.label, first ? styles.labelFirst : styles.labelRest]}>#{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: theme.space.md,
    paddingVertical: 1,
    borderWidth: 1,
    alignSelf: 'center',
  },
  first: { backgroundColor: theme.brand.gold, borderColor: theme.brand.gold },
  rest: { backgroundColor: 'transparent', borderColor: theme.scr.accent },
  label: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro, // 9
    letterSpacing: 0.5,
  },
  labelFirst: { color: theme.brand.goldInk },
  labelRest: { color: theme.scr.accent },
});
