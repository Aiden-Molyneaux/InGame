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
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../../src/components/ScreenHead';

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
      // The report/block drawer mounts as a SCREEN-ROOT sibling of the scroll (PulledSheet contract) —
      // an absolute-fill overlay rendered INSIDE the ScrollView anchors to the scroll CONTENT, so the
      // scrim covered the viewport but the sheet docked off-screen at the bottom of the content (the
      // owner-walk "shadows the screen but nothing appears" bug). Frame renders `overlay` outside the
      // scroll. (Matches the collection.tsx sort/filter + card-picker sheet mounting.)
      overlay={
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
      }
    >
      <IdentityBlock
        username={data.username}
        avatarUrl={data.avatarUrl}
        avatarConfig={data.avatarConfig}
        staff={data.staff}
        memberSince={data.memberSince}
        bio={isFriend ? data.bio : undefined}
        gamertags={isFriend ? data.gamertags : undefined}
      />

      {/* W-B10 rulings 2+3 (ASSUMPTION — owner may veto): ONE identity-foot row directly under the
          profile details. LEFT = the relationship seat (the FRIEND tag / ADD FRIEND / REQUESTED /
          incoming-hint — the board's chip grammar, "just under their profile details"); RIGHT = the
          trust counts, mutuals RESEATED beside friendsCount ("14 FRIENDS · 3 MUTUAL", the board's
          id-sub line). One row, no stacked crowding. */}
      <View style={styles.idFoot} testID="identity-foot">
        <RelationshipAction userId={data.id} relationship={data.relationship} />
        <Text style={styles.counts}>
          {isFriend ? `${fmt(data.friendsCount)} FRIENDS · ` : ''}
          {fmt(data.mutualFriendsCount)} MUTUAL
        </Text>
      </View>

      {isFriend ? (
        <>
          {/* W-B10 ruling 4 — SECTION ORDER mirrors the committed self profile.tsx at head
              (identity → STATS → ACHIEVEMENTS → PINNED FAVOURITE → TOP 3 → NOW PLAYING → device), with
              the paired action row at the FOOT (the board's bottom-tools seat). PINNED FAVOURITE is now
              served on the friend shape (owner walk-ruling 2026-07-20 — supersedes the P9 manifest
              ruling-4 deferral that cut it "n/a, not on the friend shape"). */}

          {/* STATS (PROF-04 six-pack for the target · P9 fix-round) — the self-profile tile grammar over
              the C4 `stats` payload. PROF-07 percentile chips stay ABSENT (threshold-gated; the cohort/
              percentile engine rides M7 — omitted, not faked). */}
          <FriendStats stats={data.stats} />

          {/* ACHIEVEMENTS teaser (ACH-05 · P11) — the earned count off /users/:id/achievements, a door
              into their trophy case. Seated after STATS per the self profile's head order (W-B10 r4). */}
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
              <View style={styles.achMeta}>
                <Text style={styles.achCount}>{ach ? `${fmt(ach.summary.earned)} EARNED` : '—'}</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          </View>

          {/* CONTRIBUTIONS teaser (CAT-07 · owner walk-ruling 2026-07-20; walk-4 P5-e dropped the
              "{NAME}'S" prefix — redundant, we're already on their profile) — the friend's
              PUBLISHED-card count, the cross-user door into their contributor screen (/contributor/:id,
              P13 — handles the non-self viewer). Mirrors the self profile's MY CONTRIBUTIONS teaser
              grammar (the PUBLISHED count off the friend shape's `cardsPublished`, NOT stats.cardsDesigned
              — never leaks draft existence). Shown-with-0 like the self (always present, no hide-on-empty).
              Seated after ACHIEVEMENTS per the self profile's head order. */}
          <View style={styles.section}>
            <Text style={styles.sectionHead}>CONTRIBUTIONS</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${data.username}'s contributions`}
              onPress={() => router.push(`/contributor/${data.id}`)}
              style={({ pressed }) => [styles.achRow, pressed && { opacity: 0.82 }]}
            >
              <View style={styles.achMeta}>
                <Text style={styles.achCount}>{fmt(data.cardsPublished)} CARDS DESIGNED</Text>
                <Text style={styles.achSub}>THEIR DESIGNS &amp; GAMES ADDED</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          </View>

          {/* PINNED FAVOURITE (PROF-01/05 · owner walk-ruling 2026-07-20) — the friend's pinned favourite
              off the friend shape's `favouriteGame` payload (flattened card, read-only — never the
              owner-private notes/rating). Mirrors the self profile's PINNED FAVOURITE hero seat (between
              ACHIEVEMENTS and TOP 3). Tap → the game page (FRIEND posture). Null (no pin) → absent. */}
          <FriendPinnedFavourite favourite={data.favouriteGame} onOpen={(gameId) => router.push(`/game/${gameId}?via=${data.id}`)} />

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
          <FriendNowPlaying nowPlaying={data.nowPlaying} onOpen={(gameId) => router.push(`/game/${gameId}?via=${data.id}`)} />

          {/* THEIR DEVICE (DEV-02/04 · decision 0012 · P9 fix-round) — the {shell · theme · stickers}
              readout off the C4 `device` payload (wire name `shellId`, not /me/device's `activeShellId`).
              Read-only: their device isn't editable, so no EDIT keycap. Seated last-content, mirroring
              the self profile's MY DEVICE foot (W-B10 r4). The "view in their device" chrome TOGGLE stays
              EXPECTED — decision 0012 makes it a chrome TAKEOVER (DeviceShell re-skin + exit-band +
              Collection carry-over), more than a row+toggle; don't half-build the takeover. */}
          <FriendDeviceRow device={data.device} />

          {/* AS-1 RETIRED (P9 fix-round) — stats/device/nowPlaying are served + rendered above. The one
              remaining absence: PROF-07 percentile chips on the stat tiles (the M7 ranking engine). */}

          {/* W-B10 ruling 1 — the doors into their world (SOC-02 / decision 0050) as ONE ROW: paired
              side-by-side keys (the board's paired-action grammar), seated at the FOOT — the on-screen
              stand-in for the board's bottom tools bar. VIEW COLLECTION keeps the primary voice. */}
          <View style={styles.doorRow} testID="door-row">
            <ScreenButton
              label="View collection"
              variant="primary"
              onPress={() => router.push(`/user/${data.id}/collection`)}
              style={styles.doorKey}
            />
            {/* Owner walk-ruling 2026-07-20 — COMPARE HOURS wears the WHITE/cream SECONDARY voice
                (0069/0070 — cream on dark, white on light), not the orange accent. VIEW COLLECTION keeps
                the primary voice as the lead door. */}
            <ScreenButton
              label="Compare hours"
              variant="secondary"
              onPress={() => router.push(`/compare/${data.id}`)}
              style={styles.doorKey}
            />
          </View>
        </>
      ) : (
        // non-friend / limited (PROF-03): the FRIENDS-ONLY lock-well. ADD FRIEND is the RelationshipAction
        // above; the lock-well names what unlocks. Safety (Report/Block) stays in the ⋯ overflow.
        <LockWell username={data.username} />
      )}
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

// PINNED FAVOURITE — the friend's pinned favourite (flattened card; no entryId on the wire). The self-
// profile hero grammar, read-only: the 138×193 hero card + a meta column (hours stat-line + display
// title). No status/catalog line — the friend expansion carries only {gameId, title, hours, card}
// (the owner-private detail lines never cross). Tap → the game page (FRIEND posture). Null → absent.
function FriendPinnedFavourite({
  favourite,
  onOpen,
}: {
  favourite: FriendProfile['favouriteGame'];
  onOpen: (gameId: string) => void;
}) {
  const styles = useStyles();
  if (!favourite) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>PINNED FAVOURITE</Text>
      <View style={styles.heroRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${favourite.title}`}
          onPress={() => onOpen(favourite.gameId)}
        >
          <EntryCard
            title={favourite.title}
            card={{ imageUrl: favourite.card.imageUrl, thumbUrl: favourite.card.thumbUrl }}
            size="grid"
            width={138}
            height={193}
          />
        </Pressable>
        <View style={styles.heroMeta}>
          <Text style={styles.heroStat}>{fmt(favourite.hours)} HRS</Text>
          <Text style={styles.heroTitle}>{favourite.title.toUpperCase()}</Text>
        </View>
      </View>
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
  overlay,
}: {
  title: string;
  trailing?: ReactNode;
  onBack: () => void;
  children: ReactNode;
  /** Summoned drawers (the report/block PulledSheet) — rendered as a SCREEN-ROOT SIBLING of the scroll,
   *  never inside it. An absolute-fill overlay mounted inside the ScrollView anchors to the scroll
   *  CONTENT (scrim covers the viewport, sheet docks off-screen) — the owner-walk overflow bug. */
  overlay?: ReactNode;
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
        <ScrollView
          testID="profile-scroll"
          style={styles.flex}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {overlay}
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
    ...SCREEN_HEADER_PAD, // W-B1 — was bottom sm
  },
  headTitle: { flex: 1, fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  headTrailing: { paddingLeft: t.space.md },
  ovf: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.dim },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  counts: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  // W-B10 r2+r3 — the identity-foot row: relationship seat left · trust counts right (one line).
  idFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.md,
    marginTop: -t.space.sm, // tucks the foot up under the identity well (reads as its footer)
  },
  // W-B10 r1 — the paired action row (side-by-side keys, the board's paired-action grammar).
  doorRow: { flexDirection: 'row', gap: t.space.md },
  doorKey: { flex: 1 },
  section: { gap: t.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 1.5 },
  top3: { flexDirection: 'row', gap: t.space.lg, justifyContent: 'flex-start' },
  topSeat: { gap: t.space.sm, alignItems: 'center' },
  // PINNED FAVOURITE hero (mirrors the self profile's hero grammar, read-only): the 138×193 card + a
  // meta column (hours stat-line + display-size title). No catalog line on the friend expansion.
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  heroMeta: { flex: 1, justifyContent: 'center', gap: 7 },
  heroStat: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  heroTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1 },
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
  achRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.scr.panel, padding: t.space.lg },
  achMeta: { flex: 1, gap: 2 },
  // Owner walk-ruling 2026-07-20 — the teaser count wears the SAME F-06 rung as the personal Profile
  // (profile.tsx achCount): body (11), NOT title (15). The self stepped it DOWN a rung (N-A5); the
  // friend count was never conformed and rendered a size too large. Byte-identical to the self style.
  achCount: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  achSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
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
