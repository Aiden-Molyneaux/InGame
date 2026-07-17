import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type {
  AchievementReward,
  EarnedAchievement,
  InProgressAchievement,
  ShowcaseAchievement,
} from '@ingame/shared';
import { themedStyles, useTheme, withAlpha } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { tierColor } from './tier';
import { glyphForKey, MYSTERY_GLYPH, type GlyphPaths } from './achievementGlyphs';
import { ProgressMeter } from './ProgressMeter';
import { RewardChip, type RewardChipKind } from './RewardChip';

// AchievementSheet (component-map §13 · design-spec §1.5) — the node-detail bottom sheet (D1/D2/D3),
// built on the PulledSheet drawer grammar. Tapping any tile opens it over the dimmed grid. Four detail
// shapes:
//   • earned    (D1) — tier · title · what-for · when-earned · REWARD RewardChips.
//   • progress  (D2) — tier·IN PROGRESS · title · criterion · ProgressMeter + "N TO GO" · the PRIZE.
//   • locked    (D3) — the SEALED secret: ??? title + a generic "keep playing" line. NO name /
//                      criterion / reward EVER leaks (the mystery isn't spoiled — OQ-005 pole A).
//   • showcase       — a friend's earned row (PROF-05): tier · name · when-earned ONLY (the showcase
//                      payload carries no description/reward — earned-only, no criterion/reward leak).
export type AchievementDetail =
  | { kind: 'earned'; achievement: EarnedAchievement }
  | { kind: 'progress'; achievement: InProgressAchievement }
  | { kind: 'locked' }
  | { kind: 'showcase'; achievement: ShowcaseAchievement };

export function AchievementSheet({
  detail,
  onClose,
}: {
  detail: AchievementDetail | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();

  // Resolve the tier + glyph + copy per shape (a null detail keeps the sheet closed — hooks below the
  // PulledSheet boundary stay unconditional; PulledSheet renders null when !visible).
  const tier = detailTier(detail);
  const color = tierColor(tier, t);
  const locked = detail?.kind === 'locked';
  const paths: GlyphPaths = locked ? MYSTERY_GLYPH : glyphForKey(detailKey(detail));

  return (
    <PulledSheet visible={detail !== null} onClose={onClose} maxFraction={0.82}>
      {detail ? (
        <View style={styles.body}>
          <View
            style={[
              styles.glyph,
              locked
                ? { backgroundColor: withAlpha(color, 0.08), borderColor: withAlpha(color, 0.35) }
                : { backgroundColor: withAlpha(color, 0.13), borderColor: color },
            ]}
          >
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={locked ? withAlpha(color, 0.55) : color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              {paths.map((d, i) => (
                <Path key={i} d={d} />
              ))}
            </Svg>
          </View>

          <Text style={[styles.tier, { color }]}>{detailTierLine(detail)}</Text>
          <Text style={styles.title}>{detailTitle(detail)}</Text>
          <Text style={styles.desc}>{detailDesc(detail)}</Text>

          {detail.kind === 'earned' ? <Text style={styles.meta}>EARNED · {fmtDate(detail.achievement.unlockedAt)}</Text> : null}
          {detail.kind === 'showcase' ? <Text style={styles.meta}>EARNED · {fmtDate(detail.achievement.unlockedAt)}</Text> : null}

          {detail.kind === 'progress' ? (
            <View style={styles.prog}>
              <ProgressMeter current={detail.achievement.progress.current} target={detail.achievement.progress.target} color={color} height={8} />
              <View style={styles.progLine}>
                <Text style={styles.progNow}>
                  {detail.achievement.progress.current} / {detail.achievement.progress.target}{' '}
                  {detail.achievement.progress.unit.toUpperCase()}
                </Text>
                <Text style={styles.progTo}>{toGo(detail.achievement)} TO GO</Text>
              </View>
            </View>
          ) : null}

          {detail.kind === 'earned' ? <RewardBlock heading="REWARD" reward={detail.achievement.reward} earned /> : null}
          {detail.kind === 'progress' ? <RewardBlock heading="PRIZE" reward={detail.achievement.reward} earned={false} /> : null}
          {/* No DONE key (owner walk-1) — the sheet grammar's own dismissal (scrim tap / grab handle /
              hardware back via PulledSheet) is the exit. The CelebrationMoment's CONTINUE is a different
              surface and keeps its board-drawn key. */}
        </View>
      ) : null}
    </PulledSheet>
  );
}

// The REWARD / PRIZE section — a heading + the RewardChip(s) derived from the reward object.
function RewardBlock({ heading, reward, earned }: { heading: string; reward: AchievementReward; earned: boolean }) {
  const styles = useStyles();
  const chips = rewardChips(reward, earned);
  if (chips.length === 0) return null;
  return (
    <View style={styles.sec}>
      <Text style={styles.secHead}>{heading}</Text>
      <View style={styles.chips}>
        {chips.map((c, i) => (
          <RewardChip key={i} kind={c.kind} name={c.name} sub={c.sub} />
        ))}
      </View>
    </View>
  );
}

// ── reward → chip props (ACH-04). Badge is implicit (the tile itself); we chip the PX + the cosmetic. ─
function rewardChips(reward: AchievementReward, earned: boolean): { kind: RewardChipKind; name: string; sub?: string }[] {
  const out: { kind: RewardChipKind; name: string; sub?: string }[] = [];
  if (reward.cosmetic) {
    out.push({
      kind: 'cosmetic',
      name: humanizeAsset(reward.cosmetic.assetId),
      sub: earned ? 'Unlocked for your cards' : 'Unlocks on completion',
    });
  }
  if (reward.pixels) {
    out.push({
      kind: 'pixels',
      name: `+${reward.pixels} Pixels`,
      sub: earned ? 'Added to your wallet' : 'On completion',
    });
  }
  return out;
}

function humanizeAsset(assetId: string): string {
  return assetId.replace(/[-_]/g, ' ');
}

// ── shape helpers (keep the JSX flat) ───────────────────────────────────────────────────────────────
function detailTier(d: AchievementDetail | null): 'prestige' | 'standard' | 'secret' {
  if (!d) return 'standard';
  if (d.kind === 'locked') return 'secret';
  return d.achievement.tier;
}
function detailKey(d: AchievementDetail | null): string | undefined {
  if (!d || d.kind === 'locked') return undefined;
  return d.achievement.key;
}
function detailTierLine(d: AchievementDetail): string {
  if (d.kind === 'locked') return 'SECRET';
  if (d.kind === 'progress') return `${tierLabel(d.achievement.tier)} · IN PROGRESS`;
  return tierLabel(d.achievement.tier);
}
function tierLabel(tier: 'prestige' | 'standard' | 'secret'): string {
  return tier.toUpperCase();
}
function detailTitle(d: AchievementDetail): string {
  if (d.kind === 'locked') return '? ? ?';
  return d.achievement.name.toUpperCase();
}
function detailDesc(d: AchievementDetail): string {
  if (d.kind === 'locked') return "This one's a secret. Keep playing — you'll know it when you unlock it. (Its reward stays hidden too.)";
  if (d.kind === 'showcase') return 'Earned achievement.';
  return d.achievement.description;
}
function toGo(a: InProgressAchievement): number {
  return Math.max(a.progress.target - a.progress.current, 0);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
}

const useStyles = themedStyles((t) => ({
  body: { alignItems: 'center', gap: t.space.md },
  glyph: { width: 64, height: 64, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tier: { fontFamily: t.font.screenBold, fontSize: t.type.micro, letterSpacing: 2 },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1, textAlign: 'center' },
  desc: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, maxWidth: 280 },
  meta: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  prog: { width: '100%', maxWidth: 300, gap: t.space.sm, marginTop: t.space.xs },
  progLine: { flexDirection: 'row', justifyContent: 'space-between' },
  progNow: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink },
  progTo: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim },
  sec: { width: '100%', maxWidth: 300, gap: t.space.sm, marginTop: t.space.xs },
  secHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  chips: { gap: t.space.sm },
}));
