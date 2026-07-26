import { useState, type ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ShowcaseEntry, UserAchievementsResponse } from '@ingame/shared';
import { IdentityBlock } from '../../../src/components/IdentityBlock';
import { StatTile } from '../../../src/components/StatTile';
import { TertiaryLink } from '../../../src/components/TertiaryLink';
import { Skeleton } from '../../../src/components/lifecycle/Skeleton';
import { LoadError } from '../../../src/components/lifecycle/LoadError';
import { Unavailable } from '../../../src/components/lifecycle/Unavailable';
import { BadgeTile } from '../../../src/components/achievements/BadgeTile';
import { MysterySlot } from '../../../src/components/achievements/MysterySlot';
import { AchievementSheet, type AchievementDetail } from '../../../src/components/achievements/AchievementSheet';
import { byTierPrestigeFirst } from '../../../src/components/achievements/tier';
import { themedStyles, useTheme } from '../../../src/theme';
import { useGetUserQuery } from '../../../src/store/friendApi';
import { useGetUserAchievementsQuery } from '../../../src/store/achievementsApi';
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../../../src/components/ScreenHead';

// P11 — the friend Achievements view (PROF-05 · board P3/P4). Reached from the friend-Profile teaser.
// Reads GET /users/:id/achievements: friend/self → EARNED-ONLY (no in-progress, no ??? leak); non-friend
// / hidden → the honest headline count behind a lock-well (P4, PROF-03); blocked/unknown → the ONE
// generic Unavailable (MOD-09 404). VIEW ALL is a local view over the bounded earned array (ARCH-A1).
// The showcase row carries {id,key,name,tier,unlockedAt} only — its detail sheet shows tier·name·when
// (no criterion/reward — earned-only, by design). NavBand: PROFILE active.
export default function FriendAchievements() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useStyles();

  // Hooks ALL unconditional (F-16).
  const { data: user } = useGetUserQuery(id ?? '', { skip: !id });
  const { data, isLoading, isError, error, refetch } = useGetUserAchievementsQuery(id ?? '', { skip: !id });
  const [view, setView] = useState<'root' | 'earned'>('root');
  const [detail, setDetail] = useState<AchievementDetail | null>(null);

  const username = user?.username ?? 'them';
  const backLabel = `Return to ${username}`;

  if (isLoading || !id) {
    return (
      <Frame backLabel="Back" onBack={() => router.back()}>
        <AchSkeletonFriend />
      </Frame>
    );
  }
  // MOD-09 non-disclosure: blocked/suspended/deleted/unknown → generic 404 → terminal Unavailable.
  const status = (error as { status?: unknown } | undefined)?.status;
  if (isError && status === 404) {
    return (
      <Frame backLabel="Back" onBack={() => router.back()}>
        <Unavailable message="These achievements can't be shown right now." onBack={() => router.back()} />
      </Frame>
    );
  }
  if (isError || !data) {
    return (
      <Frame backLabel="Back" onBack={() => router.back()}>
        <LoadError message="Couldn't load these achievements. Check your connection and try again." onRetry={() => void refetch()} />
      </Frame>
    );
  }

  // P4 — privacy-limited: honest headline count reads, the badges are sealed behind the lock-well.
  if (isLocked(data)) {
    return (
      <Frame backLabel={backLabel} onBack={() => router.back()}>
        <IdentityBlock
          username={username}
          avatarUrl={user?.avatarUrl}
          avatarConfig={user?.avatarConfig}
          memberSince={user?.memberSince}
          staff={user && 'staff' in user ? user.staff : undefined}
        />
        <Section title="Summary">
          <View style={styles.stats}>
            <StatCell value={data.summary.earned} label="Earned" />
            <StatCell value="—" label="In progress" />
            <StatCell value="—" label="Secrets" />
          </View>
        </Section>
        <PrivacyLockWell username={username} />
      </Frame>
    );
  }

  const earned = [...data.earned].sort(byTierPrestigeFirst);
  // OQ-148 / W-C3b — a masked secret opens the SEALED D3 variant (no name/criterion/tier reveal); a
  // named row opens its normal showcase detail.
  const open = (e: ShowcaseEntry) =>
    setDetail('locked' in e ? { kind: 'locked' } : { kind: 'showcase', achievement: e });
  const sheet = <AchievementSheet detail={detail} onClose={() => setDetail(null)} />;

  // VIEW ALL (local view over the bounded earned array).
  if (view === 'earned') {
    return (
      <Frame title="Earned" backLabel="Achievements" onBack={() => setView('root')} overlay={sheet}>
        <Text style={styles.listsum}>
          All <Text style={styles.listsumB}>{data.summary.earned}</Text> earned · prestige first
        </Text>
        <Grid items={earned} onOpen={open} />
      </Frame>
    );
  }

  // P3 — friend earned-only.
  return (
    <Frame backLabel={backLabel} onBack={() => router.back()} overlay={sheet}>
      <IdentityBlock
        username={username}
        avatarUrl={user?.avatarUrl}
        avatarConfig={user?.avatarConfig}
        memberSince={user?.memberSince}
        staff={user && 'staff' in user ? user.staff : undefined}
      />
      {earned.length > 0 ? (
        <Section title="Earned" action={<TertiaryLink label="View all" onPress={() => setView('earned')} />}>
          <Grid items={earned.slice(0, 6)} onOpen={open} />
        </Section>
      ) : (
        <View style={styles.quiet}>
          <Text style={styles.quietText}>{username} hasn't earned any achievements yet.</Text>
        </View>
      )}
    </Frame>
  );
}

function isLocked(d: UserAchievementsResponse): d is { summary: { earned: number }; locked: true } {
  return 'locked' in d;
}

// OQ-148 / W-C3b — the friend showcase renders the earned union: a NAMED milestone → the normal
// BadgeTile (name + tier colour); a MASKED secret (`'locked' in entry`) → the SEALED ??? MysterySlot
// (the self-page grammar), never a name/tier-revealing tile. Both still COUNT in summary.earned.
function Grid({ items, onOpen }: { items: ShowcaseEntry[]; onOpen: (e: ShowcaseEntry) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {items.map((e) =>
        'locked' in e ? (
          <MysterySlot key={e.id} onPress={() => onOpen(e)} />
        ) : (
          <BadgeTile key={e.id} glyphKey={e.key} label={e.name.toUpperCase()} tier={e.tier} state="earned" onPress={() => onOpen(e)} />
        ),
      )}
    </View>
  );
}

// P4 — the ACHIEVEMENTS HIDDEN lock-well (PROF-03; the detail is friends-only, the count is public).
function PrivacyLockWell({ username }: { username: string }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.lockWell}>
      <Svg width={26} height={26} viewBox="0 0 24 24">
        <Rect x={5} y={11} width={14} height={9} rx={1.5} fill="none" stroke={t.scr.dim} strokeWidth={2} />
        <Path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke={t.scr.dim} strokeWidth={2} />
      </Svg>
      <Text style={styles.lockTitle}>ACHIEVEMENTS HIDDEN</Text>
      <Text style={styles.lockSub}>
        {username} keeps their trophy case private. The headline count is public — the badges themselves are only visible to friends.
      </Text>
    </View>
  );
}

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

function AchSkeletonFriend() {
  return (
    <View>
      <Skeleton variant="text-lines" lines={2} />
      <View style={{ height: 12 }} />
      <Skeleton variant="tile-row" count={3} />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: { flexDirection: 'row', alignItems: 'center', ...SCREEN_HEADER_PAD }, // W-B1 — was bottom sm
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  section: { gap: t.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },

  stats: { flexDirection: 'row', gap: t.space.sm },
  statCell: { flex: 1, alignItems: 'center', backgroundColor: t.scr.panel, paddingVertical: t.space.md, paddingHorizontal: t.space.xs },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },

  quiet: { paddingTop: t.space.md },
  quietText: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint },

  listsum: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, lineHeight: 15 },
  listsumB: { fontFamily: t.font.screenBold, color: t.scr.ink },

  lockWell: {
    borderWidth: 1,
    borderColor: t.scr.faint,
    borderStyle: 'dashed',
    padding: t.space.xl,
    alignItems: 'center',
    gap: t.space.md,
  },
  lockTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1.5 },
  lockSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, textAlign: 'center', lineHeight: 15, maxWidth: 270 },
}));
