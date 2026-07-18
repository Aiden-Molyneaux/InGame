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

// W-B1b (owner ruling — "the header spacing must be independent of the button"). The header row is
// pinned to ONE content height and the trailing control cluster is taken OUT OF FLOW (absolute), so the
// title's vertical position is identical on every screen regardless of which trailing control it carries
// (a HeaderKey · a CurrencyCounter · a CountTag · none). Before this, `alignItems:'center'` on an
// in-flow row let a trailing control TALLER than the title (the 34px Friends HeaderKey vs the ~24px
// counters) grow that row and drop the title ~5px below Collection/Profile — the discrepancy the owner
// kept hitting. All trailing controls conform to (are ≤) this band; HeaderKey was 34→26 to match.
export const HEADER_CONTENT_HEIGHT = 26;

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
    <View style={styles.head} testID="screen-head">
      <Text style={styles.title} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {count || trailing ? (
        <View style={styles.right} testID="screen-head-trailing">
          {count ? <CountTag label={count} /> : null}
          {trailing ?? null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  // W-B1b — the title is the SOLE in-flow child, pinned to HEADER_CONTENT_HEIGHT; the trailing cluster
  // is absolute (below), so no trailing control can grow the row and shift the title. `position:relative`
  // anchors the absolute cluster to the header's content edge (the wrapper owns the horizontal padding).
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    minHeight: HEADER_CONTENT_HEIGHT,
  },
  // the header-right cluster: the gold count chip + any trailing control (the CurrencyCounter). W-B1b —
  // ABSOLUTE + top/bottom:0 spans the fixed band and centres its children within it, so it is out of the
  // title's flow (the title can never be pushed). `stretch` keeps the count chip and the CurrencyCounter
  // the same height (F-1) — now the band height, HEADER_CONTENT_HEIGHT.
  right: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: t.space.md,
  },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.display, // 21 (F-06)
    lineHeight: HEADER_CONTENT_HEIGHT, // W-B1b — the title box == the band on every screen (deterministic,
    // independent of font ascent/descent), so the title sits identically everywhere
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
