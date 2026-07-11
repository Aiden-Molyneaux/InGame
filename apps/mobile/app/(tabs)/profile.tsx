import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { IdentityBlock } from '../../src/components/IdentityBlock';
import { ScreenHead } from '../../src/components/ScreenHead';
import { CardFace, parseComposition } from '../../src/components/CardFace';
import { StatTile } from '../../src/components/StatTile';
import { ScreenButton } from '../../src/components/ScreenButton';
import { MiniDevice } from '../../src/components/MiniDevice';
import { RankChip } from '../../src/components/RankChip';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { theme } from '../../src/theme';
import { useGetMeQuery, useGetCollectionQuery } from '../../src/store/api';
import { useAppDispatch } from '../../src/store/hooks';
import { setCollectionView } from '../../src/store/prefsSlice';
import { logoutTeardown } from '../../src/store';

// The self-Profile (PROF-05) — fully REAL as of M3: identity + the PROF-04 stats + the PINNED
// FAVOURITE (P2, unblocked by the /me expansion) + Now-Playing all come from GET /me; the Top-3 is
// the hours-derived placeholder over the real shelf (D3 — the curated Top-10 store rides M4).
// Section ORDER per the mockup (profile-states.html:505–547):
//   identity → STATS → PINNED FAVOURITE → TOP 3 → NOW PLAYING → MY DEVICE.
export default function Profile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: me, isLoading, isError, refetch } = useGetMeQuery();
  const { data: collection } = useGetCollectionQuery();

  async function signOut() {
    await logoutTeardown(); // F20/F14 — purge persisted prefs + reset cache + clear secure-store tokens
    router.replace('/sign-in');
  }

  function openTopView() {
    // The VIEW TOP 10 door (PROF-05/decision 0050) → the Collection TOP view-mode (COL-13).
    dispatch(setCollectionView('top'));
    router.push('/(tabs)/collection');
  }

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.brand.accent} />
      </View>
    );
  }
  if (isError || !me) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errTitle}>SIGNAL LOST</Text>
        <Text style={styles.errSub}>
          Couldn’t load your profile. If this is an old session, sign out and sign back in.
        </Text>
        <ScreenButton label="Retry" variant="action-alt" onPress={() => refetch()} />
        <ScreenButton label="Sign out" variant="secondary" onPress={signOut} />
      </View>
    );
  }

  // D3 — the Top-3 teaser is hours-derived over the real shelf until the curated store lands (M4).
  const top3 = [...(collection?.items ?? [])].sort((a, b) => b.hours - a.hours).slice(0, 3);

  return (
    <View style={styles.screen}>
      {/* S5-a — the fixed "PROFILE" title band (board `.screen-head` :487), above the scroll. The
          EDIT/SHARE/Settings tools that share that region stay ⛔ M7. */}
      <View style={styles.pad}>
        <ScreenHead title="Profile" />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {/* identity — the real /me self-shape */}
        <IdentityBlock
          username={me.username}
          avatarUrl={me.avatarUrl}
          role={me.role}
          adminTier={me.adminTier}
          memberSince={me.memberSince}
          bio={me.bio}
          gamertags={me.gamertags}
        />

        <Section title="Stats">
          <View style={styles.stats}>
            <Stat value={me.stats.games} label="Games" />
            <Stat value={`${me.stats.hours}h`} label="Hours" />
            <Stat value={`${me.stats.completionPct}%`} label="Complete" />
            <Stat value={me.stats.cardsDesigned} label="Cards" />
            <Stat value={me.stats.adoptionsReceived} label="Adoptions" />
            <Stat value={me.stats.friends} label="Friends" />
          </View>
        </Section>

        {/* PINNED FAVOURITE (PROF-01/05 — P2, real as of M3; VIEW GAME rides the Game page, M-later) */}
        <Section title="Pinned favourite">
          {me.favouriteGame ? (
            <View style={styles.heroRow}>
              {/* CARD-23 NAVIGATE — the pinned-favourite is a game handle → the Game page (mode 1). */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${me.favouriteGame.title}`}
                onPress={() => router.push(`/game/${me.favouriteGame!.gameId}`)}
              >
                <CardFace
                  title={me.favouriteGame.title}
                  composition={parseComposition(me.favouriteGame.card.composition)}
                  size="grid"
                  width={120}
                  height={168}
                  animate // the pinned-favourite hero (0068 opt-in)
                />
              </Pressable>
              <View style={styles.heroMeta}>
                <Text style={styles.heroTitle}>{me.favouriteGame.title.toUpperCase()}</Text>
                <Text style={styles.heroSub}>{me.favouriteGame.hours}H LOGGED</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyLine}>No favourite pinned yet.</Text>
          )}
        </Section>

        <Section title="Top 3" action={<TertiaryLink label="View top 10" onPress={openTopView} />}>
          {top3.length > 0 ? (
            <View style={styles.top3}>
              {top3.map((g, i) => (
                <Pressable
                  key={g.entryId}
                  style={styles.topSeat}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${g.title}`}
                  onPress={() => router.push(`/game/${g.gameId}`)}
                >
                  <CardFace title={g.title} composition={parseComposition(g.card.composition)} size="cell" />
                  <RankChip rank={i + 1} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyLine}>Your most-played games land here.</Text>
          )}
        </Section>

        <Section title="Now Playing">
          {me.nowPlaying ? (
            <View style={styles.nowRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${me.nowPlaying.title}`}
                onPress={() => router.push(`/game/${me.nowPlaying!.gameId}`)}
              >
                <CardFace
                  title={me.nowPlaying.title}
                  composition={parseComposition(me.nowPlaying.card.composition)}
                  size="cell"
                  nowPlaying
                  animate // the one now-playing card (0068 opt-in)
                />
              </Pressable>
              <View style={styles.nowMeta}>
                <Text style={styles.nowTitle}>{me.nowPlaying.title}</Text>
                <Text style={styles.nowSub}>{me.nowPlaying.hours}H LOGGED</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyLine}>Nothing pinned — set it from your Collection.</Text>
          )}
        </Section>

        {/* MY DEVICE — a small labelled thumbnail; NOT the app-wrapping DeviceShell */}
        <Section title="My Device">
          <View style={styles.devRow}>
            <MiniDevice />
            <View style={styles.devMeta}>
              <Text style={styles.devTitle}>POCKET · TEAL</Text>
              <Text style={styles.devSub}>MIDNIGHT SCREEN</Text>
            </View>
          </View>
        </Section>

        <ScreenButton label="Sign out" variant="secondary" onPress={signOut} block />
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
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

// A stats cell — a 3-per-row PANEL container (mockup `.stat`: panel bg, centred value/label — owner
// ruling 2026-07-01) with the boxless StatTile centred inside it. P9.
function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statCell}>
      <StatTile value={value} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.scr.bg },
  // S5-a — the fixed title-band wrapper (mirrors collection.tsx `pad`; horizontal pad aligns with body).
  pad: { paddingHorizontal: theme.space.lg, paddingTop: theme.space.lg, paddingBottom: theme.space.md },
  scroll: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: theme.space.lg },
  body: { padding: theme.space.lg, gap: theme.space.xl },
  errTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.accent, letterSpacing: 1 },
  errSub: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim, textAlign: 'center', lineHeight: 16, paddingHorizontal: theme.space.xl },
  section: { gap: theme.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.dim, letterSpacing: 1.5 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  statCell: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: theme.scr.panel,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  favCard: { width: 120, height: 168 },
  heroMeta: { flex: 1, gap: 3 },
  heroTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 0.5 },
  heroSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.brand.gold, letterSpacing: 1 },
  top3: { flexDirection: 'row', gap: theme.space.lg, justifyContent: 'space-between' },
  topSeat: { gap: theme.space.sm, alignItems: 'center' },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  nowMeta: { gap: 2 },
  nowTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink },
  nowSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.accent, letterSpacing: 1 },
  emptyLine: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.faint },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    backgroundColor: theme.scr.panel,
    padding: theme.space.lg,
  },
  devMeta: { gap: 2 },
  devTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 0.5 },
  devSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
});
