import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';

// PreviewStrip (component-map §7 · board P3) — the gold "◆ PREVIEWING — «name»" bar shown while a
// premium screen theme is being tried on (the whole page re-themes live, DEV-04); EXIT ✕ reverts to the
// saved theme. Gold = economy/value (F-02). (Distinct from the device editor's DevicePreviewStrip — this
// is the Store's commerce voice.)
export function PreviewStrip({ name, onExit }: { name: string; onExit: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.strip}>
      <Text style={styles.label}>◆ PREVIEWING — {name.toUpperCase()}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Exit preview" onPress={onExit} hitSlop={8}>
        <Text style={styles.exit}>EXIT ✕</Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.brand.gold,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
  },
  label: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.goldInk, letterSpacing: 1 },
  exit: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.goldInk, letterSpacing: 0.5 },
}));
