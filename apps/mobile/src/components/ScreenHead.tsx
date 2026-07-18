import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { theme, themedStyles } from '../theme';

// ── walk2 W-B1/W-B2 — the ONE screen-header + return-seam geometry (owner audit rulings) ──────────
// Reference = the Collection/Profile header band. Every routed screen's header WRAPPER spreads
// SCREEN_HEADER_PAD, and every ‹ RETURN seam row spreads RETURN_SEAM_PAD, so the two audited gaps —
// (header ↔ return link) = the header's paddingBottom, and (link ↔ content) = the seam's
// paddingBottom — are one number app-wide. `theme.space` is static (spacing is not themed), so these
// are safe as plain constants. A structural primitive was considered and declined: headers embed
// varied chrome (trailing counters, ⋯ overflow keys, under-title seams), so shared CONSTANTS are the
// honest single source of truth. src/screen-geometry.test.ts pins the values + consumption.
export const SCREEN_HEADER_PAD = {
  paddingHorizontal: theme.space.lg,
  paddingTop: theme.space.lg,
  paddingBottom: theme.space.md,
} as const;
export const RETURN_SEAM_PAD = {
  paddingHorizontal: theme.space.lg,
  paddingBottom: theme.space.md,
} as const;
/** The under-title seam (S2-b: the link INSIDE the header block — add-game/device/legal): the same
 *  gap-1 as separate blocks, expressed as the fused block's row gap. */
export const HEADER_SEAM_GAP = theme.space.md;

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
    // F-13 F1 (owner round-2) — the count chip and the CurrencyCounter must read as siblings: same
    // F-06 size (body/11, matching the counter's value) and same height (`right` stretch, above).
    fontSize: t.type.body, // 11 (F-06) — was micro/9; unified with CurrencyCounter
    color: t.brand.goldInk,
    letterSpacing: 1,
  },
}));
