import { View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { PixelsMark } from './PixelsMark';

// PriceChip (component-map §7) — a PX price on a gold chip (F-02 economy). `big` = the item-sheet title
// row size (F-06 title 15). Theme-invariant gold (currency reads the same under every theme). The value
// is a plain integer (PX tier prices, decision 0072).
export function PriceChip({ pixels, big = false }: { pixels: number; big?: boolean }) {
  const styles = useStyles();
  return (
    <View
      style={[styles.chip, big && styles.chipBig]}
      accessibilityLabel={`${pixels} pixels`}
      accessibilityRole="text"
    >
      <Text style={[styles.value, big && styles.valueBig]}>{pixels}</Text>
      <PixelsMark size={big ? 12 : 9} />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: t.brand.gold,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  chipBig: { paddingHorizontal: 7, paddingVertical: 4, gap: 4 },
  value: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.brand.goldInk,
    letterSpacing: 0.5,
  },
  valueBig: { fontSize: t.type.title }, // 15 (F-06)
}));
