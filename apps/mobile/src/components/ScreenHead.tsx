import { View, Text } from 'react-native';
import { themedStyles } from '../theme';

// CountTag (component-map §5.4 — was CountKeycap) — a flat, DISPLAY-ONLY gold count (never pressable).
export function CountTag({ label }: { label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.count}>
      <Text style={styles.countText}>{label}</Text>
    </View>
  );
}

// ScreenHead (component-map §5.4) — the display title + optional flat gold CountTag.
export function ScreenHead({ title, count }: { title: string; count?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.head}>
      <Text style={styles.title} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {count ? <CountTag label={count} /> : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.md,
  },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.display, // 21 (F-06)
    color: t.scr.ink,
    letterSpacing: 1,
  },
  count: {
    backgroundColor: t.brand.gold,
    borderRadius: t.corner.screen, // F-07 square
    paddingHorizontal: t.space.md,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    color: t.brand.goldInk,
    letterSpacing: 1,
  },
}));
