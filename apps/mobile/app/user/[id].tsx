import { useRef, useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { FriendProfile } from '@ingame/shared';
import type { CreateReportRequest } from '../../src/store/reportApi';
import { IdentityBlock } from '../../src/components/IdentityBlock';
import { EntryCard } from '../../src/components/EntryCard';
import { RankChip } from '../../src/components/RankChip';
import { ScreenButton } from '../../src/components/ScreenButton';
import { StatTile } from '../../src/components/StatTile';
import { MiniDevice } from '../../src/components/MiniDevice';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { SHELL_NAMES, SCREEN_THEME_NAMES, resolveShellId, resolveScreenThemeId } from '../../src/theme/palettes';
import { deviceStripCopy } from '../../src/components/device/deviceCopy';
import { RelationshipAction } from '../../src/components/social/RelationshipAction';
import { ReportSheet, type ReportActionOutcome, type ReportTarget } from '../../src/components/report/ReportSheet';
import { Skeleton } from '../../src/components/lifecycle/Skeleton';
import { LoadError } from '../../src/components/lifecycle/LoadError';
import { Unavailable } from '../../src/components/lifecycle/Unavailable';
import { themedStyles, useTheme } from '../../src/theme';
import { useGetUserQuery, isFriendProfile } from '../../src/store/friendApi';
import { useGetUserAchievementsQuery } from '../../src/store/achievementsApi';
import { useSubmitReportMutation } from '../../src/store/reportApi';
import { useBlockUserMutation } from '../../src/store/communityApi';

// P9 — the friend / other-user Profile (PROF-05 friend-view · profile-states.html friend artboards). The
// social read of a person: identity + relationship action (LIVE ADD FRIEND) + the doors into their world
// (VIEW COLLECTION · COMPARE) + safety in the ⋯ overflow (Report/Block — the P12-EXPECTED user-report
// entry point, now wired). Two shapes off `/users/:id` (ARCH A1): friend/full vs non-friend/limited; a
// blocked/suspended/deleted/unknown target → the ONE generic Unavailable (MOD-09). FULL board coverage as
// of the P9 fix-round: STATS six-pack + THEIR-DEVICE readout + NOW-PLAYING (the C4 trio, null-guarded) +
// TOP-3 door (P5 top10) + ACHIEVEMENTS teaser (P11). Still absent, honestly: PROF-07 percentile chips
// (M7) + the decision-0012 chrome TOGGLE (a takeover, not a row control — manifest). Nav pip: FRIENDS.
export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useStyles();

  // Hooks ALL unconditional (F-16) — early returns sit below.
  const { data, isLoading, isError, error, refetch } = useGetUserQuery(id ?? '', { skip: !id });
  // ACH-05 — the friend achievements teaser (earned-only / honest-count-locked, PROF-03). Reads
  // /users/:id/achievements; the strip routes into the friend trophy case (P3/P4).
  const { data: ach } = useGetUserAchievementsQuery(id ?? '', { skip: !id });
  const [submitReport, reportState] = useSubmitReportMutation();
  const [blockUser, blockState] = useBlockUserMutation();
  const [reportOpen, setReportOpen] = useState(false);
  const blockedRef = useRef(false);

  const username = data?.username;

  async function onSubmitReport(req: CreateReportRequest): Promise<ReportActionOutcome> {
    try {
      await submitReport(req).unwrap();
      return 'ok';
    } catch (e) {
      const s = (e as { status?: unknown })?.status;
      if (s === 'FETCH_ERROR' || s === 'TIMEOUT_ERROR') return 'offline';
      return 'error';
    }
  }
  async function onBlock(): Promise<ReportActionOutcome> {
    if (!id) return 'error';
    try {
      await blockUser(id).unwrap();
      blockedRef.current = true; // on sheet close → leave the now-invisible profile
      return 'ok';
    } catch (e) {
      const s = (e as { status?: unknown })?.status;
      if (s === 'FETCH_ERROR' || s === 'TIMEOUT_ERROR') return 'offline';
      return 'error';
    }
  }
  function onReportClose() {
    setReportOpen(false);
    if (blockedRef.current) router.back(); // block severed the bond — the profile is now unavailable
  }

  const title = username ? `Profile — ${username}` : 'Profile';

  if (isLoading || !id) {
    return (
      <Frame title="Profile" onBack={() => router.back()}>
        <ProfileSkeleton />
      </Frame>
    );
  }
  const status = (error as { status?: unknown } | undefined)?.status;
  if (isError && status === 404) {
    return (
      <Frame title="Profile" onBack={() => router.back()}>
        <Unavailable message="This profile can't be shown right now." onBack={() => router.back()} />
      </Frame>
    );
  }
  if (isError || !data) {
    return (
      <Frame title="Profile" onBack={() => router.back()}>
        <LoadError message="Couldn't load this profile. Check your connection and try again." onRetry={() => void refetch()} />
      </Frame>
    );
  }

  const isFriend = isFriendProfile(data);
  const reportTarget: ReportTarget = { type: 'user', id: data.id, name: data.username };

  return (
    <Frame
      title={title}
      onBack={() => router.back()}
      trailing={<OverflowButton onPress={() => setReportOpen(true)} />}
    >
      <IdentityBlock
        username={data.username}
        avatarUrl={data.avatarUrl}
        staff={data.staff}
        memberSince={data.memberSince}
        bio={isFriend ? data.bio : undefined}
        gamertags={isFriend ? data.gamertags : undefined}
      />

      {/* the identity trust line — friend count (friend shape only) + mutuals (both shapes) */}
      <Text style={styles.counts}>
        {isFriend ? `${fmt(data.friendsCount)} FRIENDS · ` : ''}
        {fmt(data.mutualFriendsCount)} MUTUAL
      </Text>

      <RelationshipAction userId={data.id} relationship={data.relationship} />

      {isFriend ? (
        <>
          {/* the doors into their world (SOC-02 / decision 0050) — the primary is VIEW COLLECTION */}
          <View style={styles.doors}>
            <ScreenButton
              label="View collection"
              variant="primary"
              onPress={() => router.push(`/user/${data.id}/collection`)}
              block
            />
            <ScreenButton
              label="Compare hours"
              variant="action-alt"
              onPress={() => router.push(`/compare/${data.id}`)}
              block
            />
          </View>

          {/* THEIR DEVICE (DEV-02/04 · decision 0012 · P9 fix-round) — the {shell · theme · stickers}
              readout off the C4 `device` payload (wire name `shellId`, not /me/device's `activeShellId`).
              Read-only: their device isn't editable, so no EDIT keycap (the self-profile's affordance).
              The "view in their device" chrome TOGGLE stays EXPECTED — decision 0012 makes it a chrome
              TAKEOVER (re-skins the whole DeviceShell + an exit-band + carries over into their Collection),
              which is more than a row+toggle; render the readout honestly, don't half-build the takeover. */}
          <FriendDeviceRow device={data.device} />

          {/* STATS (PROF-04 six-pack for the target · P9 fix-round) — the self-profile tile grammar over
              the C4 `stats` payload. PROF-07 percentile chips stay ABSENT (threshold-gated; the cohort/
              percentile engine rides M7 — omitted, not faked). */}
          <FriendStats stats={data.stats} />

          {/* COL-13 (decision 0050 §C) — the friend Top-3 set-pieces + VIEW TOP 10 door. The friend/full
              read now serves top10 (P5 live). A card tap → their Collection TOP view FOCUSED on that game;
              VIEW TOP 10 → their Collection TOP view. Empty top10 → the door is absent. */}
          {data.top10.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionHead}>TOP 3</Text>
                <TertiaryLink
                  label="View top 10"
                  onPress={() => router.push({ pathname: `/user/${data.id}/collection`, params: { view: 'top' } })}
                />
              </View>
              <View style={styles.top3}>
                {data.top10.slice(0, 3).map((g) => (
                  <Pressable
                    key={g.gameId}
                    style={styles.topSeat}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${g.title} in ${data.username}'s Top 10`}
                    onPress={() => router.push({ pathname: `/user/${data.id}/collection`, params: { view: 'top', focus: g.gameId } })}
                  >
                    <EntryCard title={g.title} card={{ imageUrl: g.card.imageUrl, thumbUrl: g.card.thumbUrl }} size="cell" />
                    <RankChip rank={g.rank} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* NOW PLAYING (WTP-03 · P9 fix-round) — the friend's pin off the C4 `nowPlaying` payload
              (flattened card, no entryId). Tap → the SOC-11 entry detail. Null (no pin) → absent. */}
          <FriendNowPlaying nowPlaying={data.nowPlaying} onOpen={(gameId) => router.push(`/user/${data.id}/entry/${gameId}`)} />

          {/* ACHIEVEMENTS teaser (ACH-05 · P11) — the earned count off /users/:id/achievements, a door
              into their trophy case (P3 earned-only / P4 privacy-limited). Replaces the old EXPECTED
              note for achievements (now live). */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionHead}>ACHIEVEMENTS</Text>
              <TertiaryLink label="View all" onPress={() => router.push(`/user/${data.id}/achievements`)} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${data.username}'s achievements`}
              onPress={() => router.push(`/user/${data.id}/achievements`)}
              style={({ pressed }) => [styles.achRow, pressed && { opacity: 0.82 }]}
            >
              <Text style={styles.achCount}>{ach ? `${fmt(ach.summary.earned)} EARNED` : '—'}</Text>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          </View>

          {/* AS-1 RETIRED (P9 fix-round) — stats/device/nowPlaying are served + rendered above. The one
              remaining absence: PROF-07 percentile chips on the stat tiles (the M7 ranking engine). */}
          <Text style={styles.residual}>Percentile standings arrive with a later update.</Text>
        </>
      ) : (
        // non-friend / limited (PROF-03): the FRIENDS-ONLY lock-well. ADD FRIEND is the RelationshipAction
        // above; the lock-well names what unlocks. Safety (Report/Block) stays in the ⋯ overflow.
        <LockWell username={data.username} />
      )}

      <ReportSheet
        visible={reportOpen}
        target={reportTarget}
        onClose={onReportClose}
        onSubmit={onSubmitReport}
        submitting={reportState.isLoading}
        onBlock={onBlock}
        blocking={blockState.isLoading}
        onManageBlocks={() => {
          setReportOpen(false);
          router.push('/settings/blocked');
        }}
      />
    </Frame>
  );
}

function OverflowButton({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Profile options" onPress={onPress} hitSlop={8}>
      <Text style={styles.ovf}>⋯</Text>
    </Pressable>
  );
}

// The FRIENDS-ONLY lock-well (PROF-03 limited surface) — names what unlocks; the ADD lives above.
function LockWell({ username }: { username: string }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.lockWell}>
      <Svg width={26} height={26} viewBox="0 0 24 24">
        <Rect x={5} y={11} width={14} height={9} rx={1.5} fill="none" stroke={t.scr.dim} strokeWidth={2} />
        <Path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke={t.scr.dim} strokeWidth={2} />
      </Svg>
      <Text style={styles.lockTitle}>FRIENDS ONLY</Text>
      <Text style={styles.lockSub}>
        {username} shares their collection, stats, Top 10 and Now Playing with friends. Send a request to
        see them.
      </Text>
    </View>
  );
}

// ── the C4 trio (P9 fix-round) — each NULL-GUARDED: a null payload renders nothing, quietly ─────────

// THEIR DEVICE — the MiniDevice thumb + the {shell · theme · stickers} readout (the self-profile strip
// grammar, read-only). The chrome toggle is EXPECTED (decision 0012 — a takeover, not a row control).
function FriendDeviceRow({ device }: { device: FriendProfile['device'] }) {
  const styles = useStyles();
  if (!device) return null;
  const shell = resolveShellId(device.shellId); // wire name `shellId` (C4), not /me/device's `activeShellId`
  const theme = resolveScreenThemeId(device.screenThemeId);
  const copy = deviceStripCopy(SHELL_NAMES[shell], SCREEN_THEME_NAMES[theme], device.stickerComposition.stickers.length);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>THEIR DEVICE</Text>
      <View style={styles.devRow}>
        <MiniDevice shellId={shell} themeId={theme} />
        <View style={styles.devMeta}>
          <Text style={styles.devTitle}>{copy.title}</Text>
          <Text style={styles.devSub}>{copy.sub}</Text>
        </View>
      </View>
    </View>
  );
}

// STATS — the PROF-04 six-pack in the self-profile tile grammar (panel cells, boxless StatTile).
// Percentile chips (PROF-07) are absent from the payload → absent here (M7, omitted not faked).
function FriendStats({ stats }: { stats: FriendProfile['stats'] }) {
  const styles = useStyles();
  if (!stats) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>STATS</Text>
      <View style={styles.stats}>
        <StatCell value={stats.games} label="Games" />
        <StatCell value={`${fmt(stats.hours)}h`} label="Hours" />
        <StatCell value={`${stats.completionPct}%`} label="Complete" />
        <StatCell value={stats.cardsDesigned} label="Cards" />
        <StatCell value={stats.adoptionsReceived} label="Adoptions" />
        <StatCell value={stats.friends} label="Friends" />
      </View>
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

// NOW PLAYING — their pin (flattened card; no entryId on the wire). Tap → the SOC-11 entry detail.
function FriendNowPlaying({
  nowPlaying,
  onOpen,
}: {
  nowPlaying: FriendProfile['nowPlaying'];
  onOpen: (gameId: string) => void;
}) {
  const styles = useStyles();
  if (!nowPlaying) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>NOW PLAYING</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${nowPlaying.title}`}
        onPress={() => onOpen(nowPlaying.gameId)}
        style={({ pressed }) => [styles.nowRow, pressed && { opacity: 0.82 }]}
      >
        <EntryCard title={nowPlaying.title} card={{ imageUrl: nowPlaying.card.imageUrl, thumbUrl: nowPlaying.card.thumbUrl }} size="cell" nowPlaying />
        <View style={styles.nowMeta}>
          <Text style={styles.nowTitle} numberOfLines={1}>{nowPlaying.title.toUpperCase()}</Text>
          <Text style={styles.nowSub}>{fmt(nowPlaying.hours)} HRS LOGGED</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View>
      <Skeleton variant="text-lines" lines={2} />
      <View style={{ height: 12 }} />
      <Skeleton variant="tile-row" count={3} />
    </View>
  );
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function Frame({
  title,
  trailing,
  onBack,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  onBack: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Text style={styles.headTitle} accessibilityRole="header" numberOfLines={1}>
            {title.toUpperCase()}
          </Text>
          {trailing ? <View style={styles.headTrailing}>{trailing}</View> : null}
        </View>
        <View style={styles.retlink}>
          <TertiaryLink label="Back" chevron="leading-back" onPress={onBack} />
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
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.lg,
    paddingBottom: t.space.sm,
  },
  headTitle: { flex: 1, fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  headTrailing: { paddingLeft: t.space.md },
  ovf: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.dim },
  retlink: { paddingHorizontal: t.space.lg, paddingBottom: t.space.md },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  counts: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  doors: { gap: t.space.md },
  section: { gap: t.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 1.5 },
  top3: { flexDirection: 'row', gap: t.space.lg, justifyContent: 'flex-start' },
  topSeat: { gap: t.space.sm, alignItems: 'center' },
  // P9 fix-round — the C4 trio (the self-profile grammars, read-only)
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  statCell: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: t.scr.panel,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.sm,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    backgroundColor: t.scr.panel,
    padding: t.space.lg,
  },
  devMeta: { flex: 1, gap: 2 },
  devTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  devSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg, backgroundColor: t.scr.panel, padding: t.space.lg },
  nowMeta: { flex: 1, gap: 2 },
  nowTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  nowSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },
  residual: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.3, textAlign: 'center' },
  achRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.scr.panel, padding: t.space.lg },
  achCount: { flex: 1, fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  chev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },

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
