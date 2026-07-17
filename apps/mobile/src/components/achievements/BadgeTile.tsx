import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { AchievementTier } from '@ingame/shared';
import { themedStyles, useTheme, withAlpha } from '../../theme';
import { tierColor } from './tier';
import { glyphForKey, MYSTERY_GLYPH, type GlyphPaths } from './achievementGlyphs';
import { ProgressMeter } from './ProgressMeter';

// BadgeTile (component-map §13 · design-spec §1.5) — the UNIFORM achievement tile: glyph + label ONLY
// (the criterion / reward / earned-date live in the AchievementSheet on tap). The tier colour (ACH-09)
// carries prestige/standard/secret. Three states off `state`:
//   • earned  — glyph LIT in its tier colour (tinted well + coloured stroke).
//   • prog    — dim glyph + a tier-coloured ProgressMeter + the live count.
//   • mystery — the locked ??? secret (dim magenta lock, spaced ? ? ?); see MysterySlot.
// Tiles are square (F-07 — radius on the shell only). Pressable → the node-detail sheet.
export type BadgeTileState = 'earned' | 'prog' | 'mystery';

export function BadgeTile({
  glyphKey,
  label,
  tier,
  state,
  progress,
  onPress,
  accessibilityLabel,
}: {
  /** the achievement key (→ glyph via the client map); ignored for `mystery` (always the lock). */
  glyphKey?: string;
  label: string;
  tier: AchievementTier;
  state: BadgeTileState;
  /** `prog` only — the live count for the meter + the "N / M unit" readout. */
  progress?: { current: number; target: number; unit: string };
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const styles = useStyles();
  const color = tierColor(tier, t);
  const paths: GlyphPaths = state === 'mystery' ? MYSTERY_GLYPH : glyphForKey(glyphKey);

  // earned = full tier stroke; prog = a muted blend; mystery = a dim magenta (hint, not reveal).
  const stroke =
    state === 'earned'
      ? color
      : state === 'mystery'
        ? withAlpha(color, 0.5)
        : withAlpha(color, 0.62);
  const glyphWell =
    state === 'earned'
      ? { backgroundColor: withAlpha(color, 0.13), borderColor: withAlpha(color, 0.45) }
      : { borderColor: withAlpha(color, 0.3) };

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label} achievement`}
      onPress={onPress}
    >
      <View style={[styles.glyphWell, glyphWell]}>
        <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          {paths.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </Svg>
      </View>
      <Text style={[styles.label, state === 'mystery' && { color: withAlpha(color, 0.55), letterSpacing: 3 }]} numberOfLines={2}>
        {label}
      </Text>
      {state === 'prog' && progress ? (
        <>
          <ProgressMeter current={progress.current} target={progress.target} color={color} />
          <Text style={styles.count}>
            {progress.current} / {progress.target} {progress.unit.toUpperCase()}
          </Text>
        </>
      ) : null}
    </Pressable>
  );
}

const useStyles = themedStyles((t) => ({
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: t.space.md,
    backgroundColor: t.scr.panel,
    paddingVertical: t.space.lg,
    paddingHorizontal: t.space.sm,
  },
  tilePressed: { backgroundColor: t.scr.panelHi },
  glyphWell: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.ink,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 12,
  },
  count: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
}));
