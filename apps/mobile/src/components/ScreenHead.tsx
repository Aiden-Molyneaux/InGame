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
  // F-1 (M5) — `stretch` makes the count chip and the CurrencyCounter EXACTLY the same height: the
  // counter is the taller sibling (its PixelsMark glyph + 11px value set a taller intrinsic box than
  // the 9px count text), so the flat count chip was ~2px short. Stretching both to the row's cross-size
  // equalizes them without a magic number; the count chip centres its own text (below).
  right: { flexDirection: 'row', alignItems: 'stretch', gap: t.space.md },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.display, // 21 (F-06)
    color: t.scr.ink,
    letterSpacing: 1,
  },
  count: {
    backgroundColor: t.brand.gold,
    borderRadius: t.corner.screen, // F-07 square
    // F-1 fix 7b — match the CurrencyCounter keycap padding (8×5); F-1 (M5) — `justifyContent: center`
    // keeps the label vertically centred once the chip is stretched to the counter's height (see `right`).
    paddingHorizontal: 8,
    paddingVertical: 5,
    justifyContent: 'center',
  },
  countText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    color: t.brand.goldInk,
    letterSpacing: 1,
  },
}));
