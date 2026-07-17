import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { themedStyles, useTheme, withAlpha } from '../../theme';

// RewardChip (component-map §13 · design-spec §1.5) — the ACH-04 payout readout: an icon + name +
// sub-line, with an EARN-ONLY tag on a cosmetic entitlement (the achievement-exclusive prestige that
// never hits the store). Two kinds:
//   • pixels  — a gold PX gem (fill), no tag ("+50 PIXELS").
//   • cosmetic — an accent-outlined frame glyph + the EARN-ONLY tag.
// The `sub` line adapts by context (earned = "UNLOCKED FOR YOUR CARDS" · in-progress prize = "UNLOCKS
// AT …" · celebration = "ADDED TO YOUR WALLET"). Presentation only — the grant is server-side.
export type RewardChipKind = 'pixels' | 'cosmetic';

export function RewardChip({
  kind,
  name,
  sub,
}: {
  kind: RewardChipKind;
  name: string;
  sub?: string;
}) {
  const t = useTheme();
  const styles = useStyles();
  const isPix = kind === 'pixels';
  const iconColor = isPix ? t.brand.gold : t.scr.accent;
  return (
    <View style={styles.chip}>
      <View style={[styles.icon, { borderColor: withAlpha(iconColor, 0.4) }]}>
        {isPix ? (
          <Svg width={15} height={15} viewBox="0 0 24 24" fill={iconColor}>
            <Path d="M12 3l8 9-8 9-8-9z" />
          </Svg>
        ) : (
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={4} y={4} width={16} height={16} />
            <Rect x={8.5} y={8.5} width={7} height={7} />
          </Svg>
        )}
      </View>
      <View style={styles.meta}>
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
  meta: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  sub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  tag: { borderWidth: 1, paddingVertical: 2, paddingHorizontal: t.space.md },
  tagText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },
}));
