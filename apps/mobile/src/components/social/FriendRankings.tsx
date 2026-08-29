import { View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { CompareLeaderboardRow } from '@ingame/shared';
import { themedStyles, useTheme } from '../../theme';
import { SectionSwitch, type SectionOption } from '../SectionSwitch';
import { FriendsLeaderboard } from '../compare/FriendsLeaderboard';
import { useGetFriendsQuery } from '../../store/friendApi';
import { useGetCompareQuery } from '../../store/compareApi';

// ── THE RANKINGS (walk-5 owner CR — relocated off the Compare screen) ─────────────────────────────
// The whole-circle hours/games ladder: you + every accepted friend, ranked. It ranks the owner against
// ALL friends, so it is FRIENDS-screen information — the Compare screen keeps only the two-person duel.
// This module owns the three pieces the relocation needs, so the Friends tab and the dedicated page
// render the SAME thing:
//   • useFriendRankings() — the data seam
//   • RankingsDoorRow     — the compact door into the dedicated page (the default landing form)
//   • RankingsBoard       — the header (title + the metric SectionSwitch) + the ladder itself
// NON-COMMERCE (F-02): no gold anywhere — a ranking mints nothing.

export type RankingsMetric = 'hours' | 'games';

// The metric affordance (walk-5 CR 2): the app's established switch, NOT a bare tappable caption. Stock
// `SectionSwitch` (accent border + StateMark) is the ratified grammar — decision 0069 §2 records that a
// CREAM tone of SectionSwitch was built and then REVERTED on the owner's visual review, so the cream
// tabs convention lives on in bespoke Add-Slip chips, never in this component.
export const METRIC_OPTIONS: SectionOption<RankingsMetric>[] = [
  { value: 'games', label: 'Games' },
  { value: 'hours', label: 'Hours' },
];

/**
 * The ladder rows for the signed-in user's circle.
 *
 * DATA SEAM (walk-5, deliberate): there is no standalone rankings endpoint today — the cohort ladder is
 * assembled server-side inside `GET /me/compare/:friendId` (users-service.getCompare → friendCohortTotals
 * + the actor's own row, ranked). Rather than rework the data layer for a UI relocation, this reads the
 * ladder off the compare payload for an ANCHOR friend (the roster head). The rows are the whole cohort,
 * so the anchor's identity doesn't change what's shown.
 *
 * KNOWN LIMIT — when PROF-03 hours-privacy goes live (`resolveCompareVisibility` is hardcoded
 * `hoursVisible: true` today), a single anchor who hides hours would omit `leaderboard` and blank this
 * section for the whole circle. FOLLOW-UP: promote the cohort ladder to its own read (`GET
 * /me/friends/rankings`) before that switch is wired — tracked in the wave-B report.
 */
export function useFriendRankings(): {
  rows: CompareLeaderboardRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  hasFriends: boolean;
} {
  const focusOpts = { refetchOnFocus: true, refetchOnMountOrArgChange: true } as const;
  const { data: friends, isLoading: friendsLoading } = useGetFriendsQuery(undefined, focusOpts);
  const roster = friends?.friends ?? [];
  const anchorId = roster[0]?.userId;
  // Hooks stay unconditional (F-16) — `skip` carries the "no friends yet" case.
  const { data, isFetching, isError, refetch } = useGetCompareQuery(anchorId ?? '', {
    skip: !anchorId,
    ...focusOpts,
  });
  return {
    rows: data?.leaderboard ?? [],
    isLoading: friendsLoading || (anchorId != null && isFetching && data == null),
    isError: anchorId != null && isError,
    refetch,
    hasFriends: roster.length > 0,
  };
}

/** Your own standing, for the door-row's subtitle — absent until the ladder loads. */
export function myStanding(rows: CompareLeaderboardRow[]): CompareLeaderboardRow | null {
  return rows.find((r) => r.isMe) ?? null;
}

// The ranking glyph — the compare screen's bar-ladder mark (a shared visual vocabulary for "standing").
function LadderGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 12">
      <Path
        d="M2 10.5V5M6.5 10.5V1.5M11 10.5V7M15.5 10.5V4"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * THE DOOR-ROW (the wired-in default) — a compact row that opens the dedicated rankings page. Built to
 * the Friends tab's own row grammar (the RequestsBanner: panel fill · glyph · title + sub · accent
 * chevron), but with the QUIET hairline border — the accent border stays reserved for the pending-
 * requests call to action, so the two rows don't shout at each other.
 */
export function RankingsDoorRow({ rows, onPress }: { rows: CompareLeaderboardRow[]; onPress: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  const me = myStanding(rows);
  const sub =
    me != null
      ? `YOU'RE #${me.rank} OF ${rows.length} · ${me.hours.toLocaleString('en-US')} HRS`
      : 'SEE HOW YOUR CIRCLE STACKS UP';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="The rankings"
      onPress={onPress}
      testID="rankings-door-row"
      style={({ pressed }) => [styles.door, pressed && styles.doorPressed]}
    >
      <LadderGlyph color={t.scr.accent} />
      <View style={styles.doorTx}>
        <Text style={styles.doorT}>THE RANKINGS</Text>
        <Text style={styles.doorS} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Text style={styles.doorGo}>›</Text>
    </Pressable>
  );
}

/**
 * THE BOARD — the section header (title + the metric switch) over the ladder. Shared by the dedicated
 * page and the INLINE variant on the Friends tab, so whichever form the owner keeps looks identical.
 */
export function RankingsBoard({
  rows,
  metric,
  onMetric,
  onOpenUser,
  title = 'The rankings',
}: {
  rows: CompareLeaderboardRow[];
  metric: RankingsMetric;
  onMetric: (m: RankingsMetric) => void;
  onOpenUser: (userId: string) => void;
  title?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.board} testID="rankings-board">
      <View style={styles.head}>
        <Text style={styles.headT}>{title.toUpperCase()}</Text>
        <SectionSwitch options={METRIC_OPTIONS} value={metric} onChange={onMetric} />
      </View>
      <FriendsLeaderboard rows={rows} metric={metric} onOpenUser={onOpenUser} />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  // door-row — the RequestsBanner geometry with the quiet border (see the comment above).
  door: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    padding: t.space.lg,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  doorPressed: { opacity: 0.75 }, // F-03 — energize, no travel
  doorTx: { flex: 1, minWidth: 0, gap: 2 },
  doorT: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.3 },
  doorS: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  doorGo: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.accent },

  board: { gap: t.space.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headT: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
}));
