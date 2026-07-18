import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { darken, themedStyles, useTheme, withAlpha } from '../../theme';
import { PixelsMark } from '../commerce/PixelsMark';

// RewardChip (component-map §13 · design-spec §1.5) — the ACH-04 payout readout: an icon + name +
// sub-line, with an EARN-ONLY tag on a cosmetic entitlement (the achievement-exclusive prestige that
// never hits the store). Two kinds:
//   • pixels  — the CANONICAL PixelsMark currency glyph (component-map §7, the M5 commerce kit — the
//     same mark PriceChip/CurrencyCounter wear; owner walk-1: never a bespoke redraw, no outline box —
//     the pixel-art gem is self-contained), no tag ("+50 PIXELS").
//   • cosmetic — an accent-outlined frame glyph + the EARN-ONLY tag.
// The `sub` line adapts by context (earned = "UNLOCKED FOR YOUR CARDS" · in-progress prize = "UNLOCKS
// AT …" · celebration = "ADDED TO YOUR WALLET"). Presentation only — the grant is server-side.
// `recessed` (walk2 A4c, the CelebrationMoment strip): on the open scr.bg field the default
// `scr.panel` fill (one step LIGHTER) reads as a floating box — the recessed variant derives DOWN
// from the live bg token instead (`darken(scr.bg, 0.25)` — a subtle dark inset well, re-themes per
// DEV-04) and centres the PixelsMark + text block as a group. Panel/sheet contexts keep the default.
export type RewardChipKind = 'pixels' | 'cosmetic';

export function RewardChip({
  kind,
  name,
  sub,
  recessed = false,
}: {
  kind: RewardChipKind;
  name: string;
  sub?: string;
  /** the celebration-strip variant: dark inset well (darken(scr.bg, .25)) + centered content group. */
  recessed?: boolean;
}) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View
      testID="reward-chip"
      style={[styles.chip, recessed && { backgroundColor: darken(t.scr.bg, 0.25), justifyContent: 'center' }]}
    >
      {kind === 'pixels' ? (
        // the canonical currency glyph (walk-1) — no bordered well; the pixel-art gem carries itself.
        <View style={styles.pixIcon}>
          <PixelsMark size={22} />
        </View>
      ) : (
        <View style={[styles.icon, { borderColor: withAlpha(t.scr.accent, 0.4) }]}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={t.scr.accent} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={4} y={4} width={16} height={16} />
            <Rect x={8.5} y={8.5} width={7} height={7} />
          </Svg>
        </View>
      )}
      {/* recessed: the meta block hugs its content (no flex:1 stretch) so icon + text centre as a group */}
      <View style={[styles.meta, recessed && { flex: 0 }]}>
        <Text style={styles.name} numberOfLines={1}>
          {name.toUpperCase()}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub.toUpperCase()}
          </Text>
        ) : null}
      </View>
      {kind === 'cosmetic' ? (
        <View style={[styles.tag, { borderColor: withAlpha(t.scr.accent, 0.4) }]}>
          <Text style={styles.tagText}>EARN-ONLY</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    backgroundColor: t.scr.panel,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.lg,
  },
  icon: { width: 28, height: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // the PixelsMark seat — same 28px footprint as the cosmetic well (rows align) but NO border box
  // (walk-1: the canonical gem is self-contained pixel-art, never framed).
  pixIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  sub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  tag: { borderWidth: 1, paddingVertical: 2, paddingHorizontal: t.space.md },
  tagText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },
}));
