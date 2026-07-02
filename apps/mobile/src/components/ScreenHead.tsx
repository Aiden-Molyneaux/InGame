import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

// CountTag (component-map §5.4 — was CountKeycap) — a flat, DISPLAY-ONLY gold count (never pressable).
export function CountTag({ label }: { label: string }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countText}>{label}</Text>
    </View>
  );
}

// ScreenHead (component-map §5.4) — the display title + optional flat gold CountTag.
export function ScreenHead({ title, count }: { title: string; count?: string }) {
  return (
    <View style={styles.head}>
      <Text style={styles.title} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {count ? <CountTag label={count} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  title: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.display, // 21 (F-06)
    color: theme.scr.ink,
    letterSpacing: 1,
  },
  count: {
    backgroundColor: theme.brand.gold,
    borderRadius: theme.corner.screen, // F-07 square
    paddingHorizontal: theme.space.md,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro, // 9
    color: theme.brand.goldInk,
    letterSpacing: 1,
  },
});
