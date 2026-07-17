import { useMemo, useState, type ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import type { EarnedAchievement, InProgressAchievement, MeAchievementsResponse } from '@ingame/shared';
import { IdentityBlock } from '../src/components/IdentityBlock';
import { StatTile } from '../src/components/StatTile';
import { ScreenButton } from '../src/components/ScreenButton';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { Skeleton } from '../src/components/lifecycle/Skeleton';
import { LoadError } from '../src/components/lifecycle/LoadError';
import { EmptyState } from '../src/components/lifecycle/EmptyState';
import { BadgeTile } from '../src/components/achievements/BadgeTile';
import { MysterySlot } from '../src/components/achievements/MysterySlot';
import { TierLegend } from '../src/components/achievements/TierLegend';
import { RewardChip, type RewardChipKind } from '../src/components/achievements/RewardChip';
import { AchievementSheet, type AchievementDetail } from '../src/components/achievements/AchievementSheet';
import { byTierPrestigeFirst } from '../src/components/achievements/tier';
import { themedStyles } from '../src/theme';
import { useGetMeQuery } from '../src/store/api';
import { useGetMyAchievementsQuery } from '../src/store/achievementsApi';

// P11 — the self Achievements trophy case (ACH-01..05/09 · board achievements-states.html · design-spec
// §2.19). Reached from the self-Profile teaser (ACH-05). Reads GET /me/achievements (bounded — no
// cursor); VIEW ALL is a LOCAL view over the same payload (ARCH-A1, the contributor precedent). The
// node-detail sheet (D1/D2/D3) is the PulledSheet drawer, mounted at the screen root. NavBand: PROFILE
// active (a Profile sub-surface — the ShellNav onProfile predicate already includes /achievements, see
// the wiring). L1 Skeleton · L2 Signal-Lost. L3 Offline is EXPECTED (no SYS-10 substrate; sibling
// stance). The in-app celebration (P5) fires from the root CelebrationHost, not this screen.
const TOP_N = 6;

type ListView = 'root' | 'earned' | 'inProgress' | 'secrets';

export default function Achievements() {
  const router = useRouter();
  const styles = useStyles();

  // Hooks ALL unconditional (F-16) — early returns sit below.
  const { data: me } = useGetMeQuery();
  const { data, isLoading, isError, refetch } = useGetMyAchievementsQuery();
  const [view, setView] = useState<ListView>('root');
  const [detail, setDetail] = useState<AchievementDetail | null>(null);

  if (isLoading) {
    return (
      <Frame backLabel="Return to profile" onBack={() => router.back()}>
        <AchievementsSkeleton />
      </Frame>
    );
  }
  if (isError || !data) {
    return (
      <Frame backLabel="Return to profile" onBack={() => router.back()}>
        <LoadError message="Couldn't load your achievements. Check your connection and try again." onRetry={() => void refetch()} />
      </Frame>
    );
  }

  const username = me?.username ?? 'YOU';
  const { summary } = data;
  const isEmpty = summary.earned === 0 && summary.inProgress === 0 && summary.secretsFound === 0;

  const open = (d: AchievementDetail) => setDetail(d);

  // ── VIEW ALL — full-list views over the bounded arrays (V1/V2/V3) ──────────────────────────────────
  if (view === 'earned') {
    const all = [...data.earned].sort(byTierPrestigeFirst);
    return (
      <Frame title="Earned" backLabel="Achievements" onBack={() => setView('root')} overlay={<AchievementSheet detail={detail} onClose={() => setDetail(null)} />}>
        <Text style={styles.listsum}>
          All <Text style={styles.listsumB}>{summary.earned}</Text> earned · prestige first, then standard · tap any for detail
        </Text>
        <EarnedGrid items={all} onOpen={open} />
      </Frame>
    );
  }
  if (view === 'inProgress') {
    const all = [...data.inProgress].sort(byProgressClosest);
    return (
      <Frame title="In progress" backLabel="Achievements" onBack={() => setView('root')} overlay={<AchievementSheet detail={detail} onClose={() => setDetail(null)} />}>
        <Text style={styles.listsum}>
          All <Text style={styles.listsumB}>{summary.inProgress}</Text> in progress · closest to done up top
        </Text>
        <ProgressGrid items={all} onOpen={open} />
      </Frame>
    );
  }
  if (view === 'secrets') {
    return (
      <Frame title="Secrets" backLabel="Achievements" onBack={() => setView('root')} overlay={<AchievementSheet detail={detail} onClose={() => setDetail(null)} />}>
        <Text style={styles.listsum}>
          <Text style={styles.listsumB}>{summary.secretsFound}</Text> of <Text style={styles.listsumB}>{summary.secretsTotal}</Text> found · the rest are still hidden — keep playing
        </Text>
        <SecretsGrid found={data.secrets.found} lockedCount={data.secrets.lockedCount} onOpen={open} />
      </Frame>
    );
  }

  // ── the trophy case (root) ─────────────────────────────────────────────────────────────────────────
  return (
    <Frame backLabel="Return to profile" onBack={() => router.back()} overlay={<AchievementSheet detail={detail} onClose={() => setDetail(null)} />}>
      <IdentityBlock username={username} avatarUrl={me?.avatarUrl} />

      <Section title="Summary">
        <View style={styles.stats}>
          <StatCell value={summary.earned} label="Earned" />
          <StatCell value={summary.inProgress} label="In progress" />
          <StatCell value={`${summary.secretsFound} / ${summary.secretsTotal}`} label="Secrets" />
        </View>
        <TierLegend />
      </Section>

      {isEmpty ? (
        // P2 — new-user cold-start: NON-gold (achievements are earned elsewhere, F-02). Not a dead end.
        <View style={styles.hookWrap}>
          <EmptyState
            title="NO TROPHIES YET"
            message="Achievements unlock as you play, collect, and connect — build your collection, design a card, add a friend. They'll land here."
            actionLabel="View my collection"
            onAction={() => router.push('/(tabs)/collection')}
            tone="neutral"
          />
        </View>
      ) : (
        <>
          {data.earned.length > 0 ? (
            <Section title="Earned" action={<TertiaryLink label="View all" onPress={() => setView('earned')} />}>
              <EarnedGrid items={[...data.earned].sort(byTierPrestigeFirst).slice(0, TOP_N)} onOpen={open} />
            </Section>
          ) : null}

          {data.inProgress.length > 0 ? (
            <Section title="In progress" action={<TertiaryLink label="View all" onPress={() => setView('inProgress')} />}>
              <ProgressGrid items={[...data.inProgress].sort(byProgressClosest).slice(0, 3)} onOpen={open} />
            </Section>
          ) : null}

          {data.secrets.found.length > 0 || data.secrets.lockedCount > 0 ? (
            <Section title="Secrets" action={<TertiaryLink label="View all" onPress={() => setView('secrets')} />}>
              <SecretsGrid found={data.secrets.found} lockedCount={Math.min(data.secrets.lockedCount, 3)} onOpen={open} topN={3} />
            </Section>
          ) : null}

          <RewardsSection data={data} />
        </>
      )}
    </Frame>
  );
}

// ── the earned grid (uniform BadgeTiles; secret-tier earned rows lit magenta) ───────────────────────
function EarnedGrid({ items, onOpen }: { items: EarnedAchievement[]; onOpen: (d: AchievementDetail) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {items.map((a) => (
        <BadgeTile
          key={a.id}
          glyphKey={a.key}
          label={a.name.toUpperCase()}
          tier={a.tier}
          state="earned"
          onPress={() => onOpen({ kind: 'earned', achievement: a })}
        />
      ))}
    </View>
  );
}

function ProgressGrid({ items, onOpen }: { items: InProgressAchievement[]; onOpen: (d: AchievementDetail) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {items.map((a) => (
        <BadgeTile
          key={a.id}
          glyphKey={a.key}
          label={a.name.toUpperCase()}
          tier={a.tier}
          state="prog"
          progress={a.progress}
          onPress={() => onOpen({ kind: 'progress', achievement: a })}
        />
      ))}
    </View>
  );
}

function SecretsGrid({
  found,
  lockedCount,
  onOpen,
  topN,
}: {
  found: EarnedAchievement[];
  lockedCount: number;
  onOpen: (d: AchievementDetail) => void;
  topN?: number;
}) {
  const styles = useStyles();
  const shown = topN ? found.slice(0, topN) : found;
  const mysteries = Array.from({ length: Math.max(0, lockedCount) });
  return (
    <View style={styles.grid}>
      {shown.map((a) => (
        <BadgeTile
          key={a.id}
          glyphKey={a.key}
          label={a.name.toUpperCase()}
          tier="secret"
          state="earned"
          onPress={() => onOpen({ kind: 'earned', achievement: a })}
        />
      ))}
      {mysteries.map((_, i) => (
        <MysterySlot key={`m${i}`} onPress={() => onOpen({ kind: 'locked' })} />
      ))}
    </View>
  );
}

// ── REWARDS EARNED — the ACH-04 payouts from every earned achievement (+ found secrets) ─────────────
function RewardsSection({ data }: { data: MeAchievementsResponse }) {
  const styles = useStyles();
  const chips = useMemo(() => rewardChipsFrom([...data.earned, ...data.secrets.found]), [data]);
  if (chips.length === 0) return null;
  return (
    <Section title="Rewards earned">
      <View style={styles.rewards}>
        {chips.map((c, i) => (
          <RewardChip key={i} kind={c.kind} name={c.name} sub={c.sub} />
        ))}
      </View>
    </Section>
  );
}

function rewardChipsFrom(earned: EarnedAchievement[]): { kind: RewardChipKind; name: string; sub: string }[] {
  const out: { kind: RewardChipKind; name: string; sub: string }[] = [];
  for (const a of earned) {
    if (a.reward.cosmetic) out.push({ kind: 'cosmetic', name: a.reward.cosmetic.assetId.replace(/[-_]/g, ' '), sub: `From ${a.name}` });
    if (a.reward.pixels) out.push({ kind: 'pixels', name: `+${a.reward.pixels} Pixels`, sub: `From ${a.name}` });
  }
  return out;
}

// closest-to-done first (clamped ratio; the seeded current can exceed target — GAP-4).
function byProgressClosest(a: InProgressAchievement, b: InProgressAchievement): number {
  const r = (x: InProgressAchievement) => (x.progress.target > 0 ? Math.min(x.progress.current / x.progress.target, 1) : 0);
  return r(b) - r(a);
}

// ── section header + the screen frame (header · back-seam · scroll · sheet overlay) ─────────────────
function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionHead}>{title.toUpperCase()}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function StatCell({ value, label }: { value: string | number; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statCell}>
      <StatTile value={value} label={label} />
    </View>
  );
}

// The frame — a fixed header + a back-seam over a scroll, with the node-detail sheet mounted at the
// SCREEN ROOT (a sibling of the scroll, per the PulledSheet contract). `view` resets on route unmount.
function Frame({
  title = 'Achievements',
  backLabel,
  onBack,
  overlay,
  children,
}: {
  title?: string;
  backLabel: string;
  onBack: () => void;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Text style={styles.headTitle} accessibilityRole="header">
            {title.toUpperCase()}
          </Text>
        </View>
        <View style={styles.retlink}>
          <TertiaryLink label={backLabel} chevron="leading-back" onPress={onBack} />
        </View>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {overlay}
      </View>
    </View>
  );
}

// L1 — the §1.6 Skeleton: identity → summary tiles → badge grid fills.
function AchievementsSkeleton() {
  return (
    <View>
      <Skeleton variant="text-lines" lines={2} />
      <View style={{ height: 12 }} />
      <Skeleton variant="tile-row" count={3} />
      <View style={{ height: 12 }} />
      <Skeleton variant="tile-row" count={3} />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.sm },
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  retlink: { paddingHorizontal: t.space.lg, paddingBottom: t.space.md },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  section: { gap: t.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },

  stats: { flexDirection: 'row', gap: t.space.sm },
  statCell: { flex: 1, alignItems: 'center', backgroundColor: t.scr.panel, paddingVertical: t.space.md, paddingHorizontal: t.space.xs },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  rewards: { gap: t.space.sm },

  hookWrap: { paddingTop: t.space.md },

  listsum: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, lineHeight: 15 },
  listsumB: { fontFamily: t.font.screenBold, color: t.scr.ink },
}));
