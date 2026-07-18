import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import type { EarnedAchievement } from '@ingame/shared';
import { themedStyles, useTheme, withAlpha } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import { ScreenButton } from '../ScreenButton';
import { RewardChip, type RewardChipKind } from './RewardChip';
import { tierColor } from './tier';
import { glyphForKey, type GlyphPaths } from './achievementGlyphs';

// CelebrationMoment (component-map §13 · design-spec §1.5 · ACH-06 in-app half · board P5) — the arcade
// TAKEOVER when an achievement fires: a tier-coloured burst (radial + scanline backdrop · burst-rays
// centred on the badge · the notched badge in a spotlight · the RewardChip payout · an orange CONTINUE).
// TIER-COLOURED (ACH-09): a gold PRESTIGE / theme-accent STANDARD / magenta SECRET unlock reads in its
// own colour. Reduce-motion-safe (0044 §104 — the M5 LandedMoment precedent): with motion the badge
// pops in and the rays shimmer once; under reduce-motion it lands fully static (no pop, no shimmer),
// nothing lost. Rendered as an absolute-fill overlay OVER the screen (the CelebrationHost mounts it at
// the root). Tap CONTINUE (or the backdrop) to dismiss — never traps the user.
//
// TRIGGER (ARCH-A4 / ASSUMPTION-1): there is NO push at M6. The CelebrationHost detects a new unlock as
// a /me/achievements refetch-delta and hands the newest earned row here. The M7 push half replaces the
// detection; this component is unchanged by that.

const RAY_COUNT = 12;
const RAY_INNER = 66;
const RAY_OUTER = 104;

export function CelebrationMoment({
  achievement,
  onContinue,
}: {
  achievement: EarnedAchievement;
  onContinue: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const color = tierColor(achievement.tier, t);
  const paths: GlyphPaths = glyphForKey(achievement.key);

  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    const anim = Animated.timing(pop, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, pop, achievement.id]);

  // 12 rays every 30° from "up", inner r=66 → outer r=104 (the board geometry).
  const rays = useMemo(
    () =>
      Array.from({ length: RAY_COUNT }, (_, i) => {
        const a = (i * (360 / RAY_COUNT) * Math.PI) / 180;
        const s = Math.sin(a);
        const c = Math.cos(a);
        return { x1: s * RAY_INNER, y1: -c * RAY_INNER, x2: s * RAY_OUTER, y2: -c * RAY_OUTER };
      }),
    [],
  );

  const badgeScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const rayScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const rayOpacity = pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.6, 0.5] });

  const chips = rewardChips(achievement);

  return (
    <View testID="celebration-stage" style={[styles.stage, { backgroundColor: t.scr.bg }]}>
      {/* backdrop (owner ruling, walk2 A4b): the field is the SCREEN-THEME bg (scr.bg — re-themes per
          DEV-04, never a hardcoded navy) with the board's radial as a THEME-derived centre glow (the
          mockup's `radial-gradient(#322c63 → scr.bg)` ≈ panelHi lightening toward 50%/36%) + the
          scanline texture. The TIER colour never tints the field — it rides only the glyphs on top
          (eyebrow · rays · badge frame), so a STANDARD unlock is orange-on-theme, not an orange room. */}
      <View pointerEvents="none" style={[styles.glowOuter, { backgroundColor: withAlpha(t.scr.panelHi, 0.4) }]} />
      <View pointerEvents="none" style={[styles.glowInner, { backgroundColor: withAlpha(t.scr.panelHi, 0.5) }]} />
      <Scanlines />

      {/* the tap-anywhere-to-dismiss catcher BEHIND the content (never nest buttons) */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel={`Achievement unlocked: ${achievement.name}. Tap to continue.`}
      />

      <Text pointerEvents="none" style={[styles.eyebrow, { color }]}>
        ACHIEVEMENT UNLOCKED
      </Text>

      <View pointerEvents="none" style={styles.badgeWrap}>
        <Animated.View style={[styles.rays, { opacity: rayOpacity, transform: [{ scale: rayScale }] }]}>
          <Svg width={260} height={260} viewBox="-130 -130 260 260">
            {rays.map((r, i) => (
              <Line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            ))}
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.badge, { borderColor: color, backgroundColor: withAlpha(color, 0.14), transform: [{ scale: badgeScale }] }]}>
          <Svg width={46} height={46} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            {paths.map((d, i) => (
              <Path key={i} d={d} />
            ))}
          </Svg>
        </Animated.View>
      </View>

      <Text pointerEvents="none" style={styles.title}>
        {achievement.name.toUpperCase()}
      </Text>
      <Text pointerEvents="none" style={styles.sub}>
        {achievement.description}
      </Text>

      {chips.length > 0 ? (
        <View pointerEvents="none" style={styles.rewards}>
          {chips.map((c, i) => (
            <RewardChip key={i} kind={c.kind} name={c.name} sub={c.sub} />
          ))}
        </View>
      ) : null}

      <View style={styles.cont}>
        <ScreenButton label="Continue" variant="action-alt" onPress={onContinue} />
      </View>
    </View>
  );
}

// The scanline overlay — a stack of thin lines (the board's repeating-linear-gradient, RN-expressed).
function Scanlines() {
  const styles = useStyles();
  const lines = useMemo(() => Array.from({ length: 90 }, (_, i) => i), []);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scanWrap]}>
      {lines.map((i) => (
        <View key={i} style={styles.scanline} />
      ))}
    </View>
  );
}

function rewardChips(a: EarnedAchievement): { kind: RewardChipKind; name: string; sub?: string }[] {
  const out: { kind: RewardChipKind; name: string; sub?: string }[] = [];
  if (a.reward.cosmetic) {
    out.push({ kind: 'cosmetic', name: a.reward.cosmetic.assetId.replace(/[-_]/g, ' '), sub: 'Unlocked for your cards' });
  }
  if (a.reward.pixels) {
    out.push({ kind: 'pixels', name: `+${a.reward.pixels} Pixels`, sub: 'Added to your wallet' });
  }
  return out;
}

const useStyles = themedStyles((t) => ({
  stage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: t.space.lg, padding: t.space.xxl },
  // the theme-derived centre glow (the board's radial, RN-approximated as two soft stacked circles
  // centred at ~50%/36%) — panelHi is the theme's one-step-lighter tone, so it re-themes with scr.*.
  glowOuter: { position: 'absolute', top: '36%', alignSelf: 'center', width: 340, height: 340, borderRadius: 170, marginTop: -170 },
  glowInner: { position: 'absolute', top: '36%', alignSelf: 'center', width: 220, height: 220, borderRadius: 110, marginTop: -110 },
  scanWrap: { justifyContent: 'space-between', opacity: 0.35 },
  scanline: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.5)' },
  eyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.body, letterSpacing: 5 },
  badgeWrap: { alignItems: 'center', justifyContent: 'center' },
  rays: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  badge: { width: 96, height: 96, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5, textAlign: 'center' },
  sub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, maxWidth: 260 },
  rewards: { alignSelf: 'stretch', maxWidth: 260, width: '100%', gap: t.space.sm, marginTop: t.space.xs },
  cont: { marginTop: t.space.md },
}));
