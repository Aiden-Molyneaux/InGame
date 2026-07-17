import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import type { FeedItem } from '@ingame/shared';
import { ScreenHead } from '../../src/components/ScreenHead';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { ScreenButton } from '../../src/components/ScreenButton';
import { Avatar } from '../../src/components/Avatar';
import { Skeleton, LoadError } from '../../src/components/lifecycle';
import { FeedRow } from '../../src/components/social/FeedRow';
import { HeaderKey } from '../../src/components/social/HeaderKey';
import { themedStyles, useTheme } from '../../src/theme';
import { useGetFriendsQuery, useGetFriendRequestsQuery } from '../../src/store/friendApi';
import { useLazyGetFeedQuery } from '../../src/store/feedApi';

// The FRIENDS tab (P8 · first article · friends-states "Feed-first" §3.3). The SOC-06 aggregated feed IS
// the landing; everything else is a peek or a jump-off: the requests banner (pending fast-path → the hub),
// the friends rail (roster peek → ALL FRIENDS), and the persistent ADD FRIENDS header key (→ the hub).
// Cold-start (0 friends) → the InviteHook doorway; quiet window (friends, thin feed) → a short digest +
// a gentle nudge. Renders inside the persistent DeviceShell; the FRIENDS keycap is active (ShellNav).
export default function Friends() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();

  const { data: friends, isLoading: friendsLoading, isError: friendsError, refetch: refetchFriends } = useGetFriendsQuery();
  const { data: requests } = useGetFriendRequestsQuery();
  const [fetchFeed, feedState] = useLazyGetFeedQuery();

  // Feed pages accumulate in component state (the wallet-ledger precedent — simpler + correct vs an RTK
  // merge). First page on mount; "load more" appends the next cursor's page.
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [feedError, setFeedError] = useState(false);

  useEffect(() => {
    let live = true;
    setFeedItems([]);
    setCursor(null);
    setFeedError(false);
    void (async () => {
      try {
        const page = await fetchFeed(undefined).unwrap();
        if (!live) return;
        setFeedItems(page.items);
        setCursor(page.nextCursor);
      } catch {
        if (live) setFeedError(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [fetchFeed]);

  async function loadMore() {
    if (!cursor) return;
    try {
      const page = await fetchFeed(cursor).unwrap();
      setFeedItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setFeedError(true);
    }
  }

  const incoming = requests?.incoming ?? [];
  const roster = friends?.friends ?? [];
  const goHub = () => router.push('/add-friends');

  const head = (
    <View style={styles.pad}>
      <ScreenHead title="Friends" trailing={<HeaderKey count={incoming.length} onPress={goHub} />} />
    </View>
  );

  // Initial load — Skeleton (solid fills, never an invite; §1.6).
  if (friendsLoading) {
    return (
      <View style={styles.screen}>
        {head}
        <View style={styles.body}>
          <Skeleton variant="tile-row" count={4} />
          <View style={{ height: 16 }} />
          <Skeleton variant="text-lines" lines={3} />
        </View>
      </View>
    );
  }
  if (friendsError) {
    return (
      <View style={styles.screen}>
        {head}
        <LoadError message="Your feed and friends list didn't load. Check your connection and try again." onRetry={() => void refetchFriends()} />
      </View>
    );
  }

  const noFriends = roster.length === 0;
  const feedLoading = feedState.isLoading || feedState.isFetching;
  const quiet = !noFriends && !feedLoading && feedItems.length <= 1 && !cursor;

  return (
    <View style={styles.screen}>
      {head}
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {noFriends ? (
          <ColdStart onFind={goHub} />
        ) : (
          <>
            {incoming.length > 0 ? <RequestsBanner count={incoming.length} names={incoming.map((r) => r.person.username)} onPress={goHub} /> : null}

            {/* the friends rail (roster peek → ALL FRIENDS) */}
            <View style={styles.sec}>
              <Text style={styles.secTitle}>YOUR FRIENDS</Text>
              <TertiaryLink label={`All ${roster.length}`} onPress={() => router.push('/friends-roster')} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {roster.slice(0, 8).map((p) => (
                <Pressable key={p.userId} style={styles.tile} onPress={() => router.push(`/user/${p.userId}`)} accessibilityRole="button" accessibilityLabel={p.username}>
                  <Avatar username={p.username} avatarUrl={p.avatarUrl} size={38} />
                  <Text style={styles.tileName} numberOfLines={1}>
                    {p.username}
                  </Text>
                </Pressable>
              ))}
              <Pressable style={styles.tile} onPress={() => router.push('/friends-roster')} accessibilityRole="button" accessibilityLabel="All friends">
                <View style={styles.allBox}>
                  <Text style={styles.allChev}>›</Text>
                </View>
                <Text style={styles.tileName}>ALL {roster.length}</Text>
              </Pressable>
            </ScrollView>

            {/* RECENT ACTIVITY — the SOC-06 river */}
            <View style={styles.sec}>
              <Text style={styles.secTitle}>RECENT ACTIVITY</Text>
              {!quiet && feedItems.length > 0 ? <Text style={styles.secTag}>LOW-NOISE</Text> : null}
            </View>

            {feedLoading && feedItems.length === 0 ? (
              <Skeleton variant="text-lines" lines={3} />
            ) : feedError && feedItems.length === 0 ? (
              <LoadError message="Couldn't load the activity feed." onRetry={() => void fetchFeed(undefined)} />
            ) : (
              <>
                {feedItems.map((item) => (
                  <FeedRow
                    key={item.feedItemId}
                    item={item}
                    onActorPress={(id) => router.push(`/user/${id}`)}
                    onObjectPress={(gameId) => router.push(`/game/${gameId}`)}
                  />
                ))}

                {quiet ? <QuietNudge onFind={goHub} /> : null}

                {cursor ? (
                  <View style={styles.loadMore}>
                    <ScreenButton label={feedLoading ? 'Loading…' : 'Load more'} variant="secondary" onPress={() => void loadMore()} disabled={feedLoading} />
                  </View>
                ) : !quiet && feedItems.length > 0 ? (
                  <Text style={styles.end}>The river continues — aggregated, capped, trivia excluded.</Text>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// The pending-requests banner — the SOC-08 fast-path into the hub.
function RequestsBanner({ count, names, onPress }: { count: number; names: string[]; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${count} friend requests`} onPress={onPress} style={styles.banner}>
      <View style={styles.bannerStack}>
        {names.slice(0, 2).map((n, i) => (
          <View key={n + i} style={[styles.stackAv, i > 0 && styles.stackOverlap]}>
            <Avatar username={n} size={30} />
          </View>
        ))}
      </View>
      <View style={styles.bannerTx}>
        <Text style={styles.bannerT}>
          {count} FRIEND {count === 1 ? 'REQUEST' : 'REQUESTS'}
        </Text>
        <Text style={styles.bannerS} numberOfLines={1}>
          {names.slice(0, 2).join(' · ').toUpperCase()} {count === 1 ? 'WANTS' : 'WANT'} TO CONNECT
        </Text>
      </View>
      <Text style={styles.bannerGo}>›</Text>
    </Pressable>
  );
}

// Cold-start (0 friends) — the InviteHook doorway (SOC-07/10). An invitation, never a scold.
function ColdStart({ onFind }: { onFind: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.cold}>
      <View style={styles.coldCard}>
        <Svg width={38} height={38} viewBox="0 0 24 24">
          <Circle cx={9} cy={8} r={3.6} fill="none" stroke={t.scr.accent} strokeWidth={1.8} />
          <Path d="M3.5 19.5a6 6 0 0 1 11 0M18.5 7.5v6M15.5 10.5h6" fill="none" stroke={t.scr.accent} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      </View>
      <Text style={styles.coldEyebrow}>YOUR CIRCLE IS EMPTY</Text>
      <Text style={styles.coldTitle}>FIND YOUR PEOPLE</Text>
      <Text style={styles.coldSub}>InGame is better together — compare hours, swap recommendations, cheer each other on.</Text>
      <View style={styles.coldCta}>
        <ScreenButton label="Find friends" variant="primary" onPress={onFind} block />
      </View>
      <Text style={styles.coldFoot}>Got an invite? Open the link to add them.</Text>
    </View>
  );
}

// The quiet-window nudge (SOC-06) — a thin feed collapses to a short digest + a gentle nudge, never a
// dead scroll.
function QuietNudge({ onFind }: { onFind: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.quiet}>
      <Text style={styles.quietEyebrow}>IT'S QUIET IN HERE</Text>
      <Text style={styles.quietSub}>Your circle hasn't been busy lately. Add a few more people and the feed wakes up.</Text>
      <ScreenButton label="Find friends" variant="secondary" onPress={onFind} block />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  flex: { flex: 1 },
  pad: { paddingHorizontal: t.space.xl, paddingTop: t.space.lg },
  body: { paddingHorizontal: t.space.xl, paddingBottom: t.space.xxl },

  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: t.space.xl, marginBottom: t.space.md },
  secTitle: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  secTag: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },

  rail: { gap: t.space.lg, paddingVertical: t.space.xs },
  tile: { width: 52, alignItems: 'center', gap: t.space.sm },
  tileName: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, maxWidth: 52, letterSpacing: 0.3 },
  allBox: { width: 38, height: 38, borderWidth: 1, borderStyle: 'dashed', borderColor: t.scr.faint, alignItems: 'center', justifyContent: 'center' },
  allChev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim },

  // requests banner
  banner: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg, padding: t.space.lg, marginTop: t.space.lg, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.accent },
  bannerStack: { flexDirection: 'row' },
  stackAv: {},
  stackOverlap: { marginLeft: -10 },
  bannerTx: { flex: 1, minWidth: 0, gap: 2 },
  bannerT: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.3 },
  bannerS: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  bannerGo: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.accent },

  loadMore: { alignItems: 'center', marginTop: t.space.lg },
  end: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.4, marginTop: t.space.lg, lineHeight: 14 },

  // cold-start
  cold: { alignItems: 'center', textAlign: 'center', gap: t.space.md, paddingHorizontal: t.space.lg, paddingTop: t.space.xxl },
  coldCard: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', backgroundColor: t.scr.panel, borderWidth: 2, borderStyle: 'dashed', borderColor: t.scr.faint, marginBottom: t.space.sm },
  coldEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  coldTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1 },
  coldSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, maxWidth: 260 },
  coldCta: { width: '100%', marginTop: t.space.md },
  coldFoot: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5, marginTop: t.space.md },

  // quiet nudge
  quiet: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.xl, paddingHorizontal: t.space.lg },
  quietEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  quietSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, maxWidth: 260 },
}));
