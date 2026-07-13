import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { themedStyles } from '../theme';

// CountTag (component-map §5.4 — was CountKeycap) — a flat, DISPLAY-ONLY gold count (never pressable).
// F-1 fix 7b: sized to match the CurrencyCounter keycap (same padding) so the two read as header
// siblings when both appear (ECON-07 — the counter is the wallet's entry point elsewhere).
export function CountTag({ label }: { label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.count}>
      <Text style={styles.countText}>{label}</Text>
    </View>
  );
}

// ScreenHead (component-map §5.4) — the display title + optional flat gold CountTag. `trailing` docks a
// header-right control (F-1 fix 7 — the CurrencyCounter on Collection/Profile) beside the count.
export function ScreenHead({ title, count, trailing }: { title: string; count?: string; trailing?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.head}>
      <Text style={styles.title} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {count || trailing ? (
        <View style={styles.right}>
          {count ? <CountTag label={count} /> : null}
          {trailing ?? null}
        </View>
      ) : null}
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
  // the header-right cluster: the gold count chip + any trailing control (the CurrencyCounter).
  right: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.display, // 21 (F-06)
    color: t.scr.ink,
    letterSpacing: 1,
  },
  count: {
    backgroundColor: t.brand.gold,
    borderRadius: t.corner.screen, // F-07 square
    // F-1 fix 7b — match the CurrencyCounter keycap padding (8×5) so the sibling chips read the same height.
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  countText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    color: t.brand.goldInk,
    letterSpacing: 1,
  },
}));
