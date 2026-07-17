import { useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { themedStyles, useTheme } from '../../src/theme';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { ScreenButton } from '../../src/components/ScreenButton';
import { Skeleton } from '../../src/components/lifecycle/Skeleton';
import { LoadError } from '../../src/components/lifecycle/LoadError';
import { Unavailable } from '../../src/components/lifecycle/Unavailable';
import { FaceOff } from '../../src/components/compare/FaceOff';
import { ComparePair } from '../../src/components/compare/ComparePair';
import { FriendsLeaderboard } from '../../src/components/compare/FriendsLeaderboard';
import { useGetMeQuery } from '../../src/store/api';
import { useGetCompareQuery } from '../../src/store/compareApi';

// P9 — Compare (SOC-03 · compare-states.html · the marquee return-driver). The duel: a totals FaceOff
// (who leads, by how much) → per-shared-game card-vs-card ComparePair matchups → the FriendsLeaderboard.
// NON-COMMERCE — no gold anywhere (comparing creates no card, ECON-01/F-02). Read-only over the friend's
// VISIBLE data (PROF-03) — the omission branches render honestly (ARCH A2). FRIEND-ONLY: a non-friend/
// self → 409 NOT_FRIENDS (a calm state); blocked/suspended/deleted/unknown → 404 (the generic Unavailable,
// MOD-09). Reached from the friend profile's COMPARE action. Nav pip: FRIENDS (board grammar, AS-4).
export default function Compare() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const router = useRouter();
  const styles = useStyles();

  // Hooks ALL unconditional (F-16) — early returns sit below.
  const { data: me } = useGetMeQuery();
  const { data, isLoading, isError, error, refetch } = useGetCompareQuery(friendId ?? '', {
    skip: !friendId,
  });
  const [metric, setMetric] = useState<'hours' | 'games'>('hours');

  if (isLoading || !friendId) {
    return (
      <Frame title="Compare" backLabel="Return" onBack={() => router.back()}>
        <CompareSkeleton />
      </Frame>
    );
  }

  const status = (error as { status?: unknown } | undefined)?.status;
  const code = (error as { data?: { error?: { code?: string } } } | undefined)?.data?.error?.code;

  // 409 NOT_FRIENDS — a KNOWN, visible non-friend (distinct from the 404 collapse): a calm invite-back.
  if (isError && status === 409 && code === 'NOT_FRIENDS') {
    return (
      <Frame title="Compare" backLabel="Go back" onBack={() => router.back()}>
        <NotFriends onBack={() => router.back()} />
      </Frame>
    );
  }
  // 404 — blocked/suspended/deleted/unknown collapse to the generic terminal (MOD-09), no retry.
  if (isError && status === 404) {
    return (
      <Frame title="Compare" backLabel="Go back" onBack={() => router.back()}>
        <Unavailable message="This comparison isn't available." onBack={() => router.back()} />
      </Frame>
    );
  }
  if (isError || !data) {
    return (
      <Frame title="Compare" backLabel="Go back" onBack={() => router.back()}>
        <LoadError
          message="The head-to-head didn't load. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </Frame>
    );
  }

  const friendName = data.friend.username;
  const games = data.games ?? [];
  const collectionHidden = data.games === undefined; // PROF-03 — the friend hides their collection
  const hoursHidden = data.totals.theirHours === undefined; // PROF-03 — the friend hides hours
  const leaderboard = data.leaderboard;

  return (
    <Frame title="Compare" backLabel={`Return to ${friendName}`} onBack={() => router.back()}>
      <FaceOff
        you={{ username: me?.username ?? 'you', avatarUrl: me?.avatarUrl ?? null }}
        friend={{ username: friendName, avatarUrl: data.friend.avatarUrl }}
        totals={data.totals}
      />

      {/* THE MATCHUPS — a lock-well when either axis is hidden (PROF-03 · board P5); else the card rows */}
      <Section
        title={collectionHidden || hoursHidden ? 'The matchups' : `The matchups · ${games.length} shared`}
        note={collectionHidden || hoursHidden ? undefined : 'THEIR CARD · YOURS'}
      >
        {collectionHidden ? (
          <LockWell
            title={`${friendName.toUpperCase()} KEEPS THEIR COLLECTION PRIVATE`}
            message={`${friendName} shares play-time but not their shelf — so there are no card-vs-card matchups.`}
          />
        ) : hoursHidden ? (
          <LockWell
            title={`${friendName.toUpperCase()} KEEPS HOURS PRIVATE`}
            message={`${friendName} shares their collection but not play-time — so there are no hour matchups. You can still face off on collection size above.`}
          />
        ) : games.length === 0 ? (
          <NoOverlap
            friendName={friendName}
            onBrowse={() => router.push(`/user/${friendId}/collection`)}
          />
        ) : (
          <View style={styles.matchups}>
            {games.map((g) => (
              <ComparePair
                key={g.gameId}
                game={g}
                onOpenYours={(gameId) => router.push(`/game/${gameId}`)}
                onOpenTheirs={(gameId) => router.push(`/user/${friendId}/entry/${gameId}`)}
              />
            ))}
          </View>
        )}
      </Section>

      {/* THE RANKINGS — omitted when hours are hidden (the friend is off the hours ladder, PROF-03) */}
      {leaderboard && leaderboard.length > 0 ? (
        <Section
          title="The rankings"
          note={metric === 'hours' ? 'HOURS · GAMES' : 'GAMES · HOURS'}
          onNote={() => setMetric((m) => (m === 'hours' ? 'games' : 'hours'))}
        >
          <FriendsLeaderboard
            rows={leaderboard}
            metric={metric}
            onOpenUser={(userId) => router.push(`/user/${userId}`)}
          />
        </Section>
      ) : null}
    </Frame>
  );
}

// 409 NOT_FRIENDS — a calm, honest state (comparing is friends-only). Not the terminal Unavailable.
function NotFriends({ onBack }: { onBack: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.centerState}>
      <View style={styles.stateGlyph}>
        <Svg width={30} height={30} viewBox="0 0 24 24">
          <Path d="M2 10.5V5M6.5 10.5V1.5M11 10.5V7M15.5 10.5V4" fill="none" stroke={t.scr.faint} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      </View>
      <Text style={styles.stateTitle}>FRIENDS ONLY</Text>
      <Text style={styles.stateSub}>You can only compare hours with friends. Add them first to run the head-to-head.</Text>
      <ScreenButton label="Go back" variant="secondary" onPress={onBack} />
    </View>
  );
}

// P2 — no shared games: the totals still duel above; the section is a DOORWAY (browse their shelf /
// recommend), never a dead end. Both orange, no gold (non-commerce).
function NoOverlap({ friendName, onBrowse }: { friendName: string; onBrowse: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.emptyWell}>
      <View style={styles.emptyGlyph}>
        <Svg width={30} height={30} viewBox="0 0 24 24">
          <Rect x={3} y={6} width={8} height={11} rx={1} fill="none" stroke={t.scr.accent} strokeWidth={1.8} />
          <Rect x={13} y={6} width={8} height={11} rx={1} fill="none" stroke={t.scr.accent} strokeWidth={1.8} />
        </Svg>
      </View>
      <Text style={styles.emptyEyebrow}>NO MATCHUPS YET</Text>
      <Text style={styles.emptyTitle}>No shared games</Text>
      <Text style={styles.emptySub}>
        You and {friendName} don&apos;t own any of the same games — so there&apos;s no head-to-head to run.
        The totals above still settle it.
      </Text>
      <ScreenButton label={`Browse ${friendName}'s collection`} variant="primary" onPress={onBrowse} block />
    </View>
  );
}

// The privacy lock-well (collection hidden → no matchups). A calm invitation, never a scold.
function LockWell({ title, message }: { title: string; message: string }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.lockWell}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Rect x={4} y={11} width={16} height={11} rx={2} fill="none" stroke={t.scr.dim} strokeWidth={2} />
        <Path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke={t.scr.dim} strokeWidth={2} />
      </Svg>
      <Text style={styles.lockTitle}>{title}</Text>
      <Text style={styles.lockSub}>{message}</Text>
    </View>
  );
}

function CompareSkeleton() {
  return (
    <View>
      <Skeleton variant="tile-row" count={3} />
      <View style={{ height: 16 }} />
      <Skeleton variant="card-cell" count={3} />
    </View>
  );
}

// ── section header + the shared screen frame ───────────────────────────────────────────────────────
function Section({
  title,
  note,
  onNote,
  children,
}: {
  title: string;
  note?: string;
  onNote?: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionHead}>{title.toUpperCase()}</Text>
        {note ? (
          onNote ? (
            <TertiaryLink label={note} chevron="none" onPress={onNote} />
          ) : (
            <Text style={styles.sectionNote}>{note}</Text>
          )
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Frame({
  title,
  backLabel,
  onBack,
  children,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
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
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.sm },
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 3 },
  retlink: { paddingHorizontal: t.space.lg, paddingBottom: t.space.md },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  section: { gap: t.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  sectionNote: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },

  matchups: { backgroundColor: t.scr.panelHi, borderWidth: 1, borderColor: t.scr.hairline, paddingHorizontal: t.space.md },

  // no-overlap doorway
  emptyWell: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.lg, paddingHorizontal: t.space.md },
  emptyGlyph: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: t.scr.panel },
  emptyEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  emptyTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  emptySub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, maxWidth: 280 },

  // privacy lock well
  lockWell: {
    borderWidth: 1,
    borderColor: t.scr.faint,
    borderStyle: 'dashed',
    padding: t.space.xl,
    alignItems: 'center',
    gap: t.space.md,
  },
  lockTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1, textAlign: 'center' },
  lockSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, textAlign: 'center', lineHeight: 15, maxWidth: 270 },

  // NOT_FRIENDS calm state
  centerState: { alignItems: 'center', gap: t.space.md, paddingTop: t.space.xxl, paddingHorizontal: t.space.md },
  stateGlyph: {
    width: 58,
    height: 58,
    borderWidth: 2,
    borderColor: t.scr.faint,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1.5 },
  stateSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, maxWidth: 260 },
}));
