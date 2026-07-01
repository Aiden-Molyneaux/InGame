import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { IdentityBlock } from '../../src/components/IdentityBlock';
import { GameCard } from '../../src/components/GameCard';
import { StatTile } from '../../src/components/StatTile';
import { ScreenButton } from '../../src/components/ScreenButton';
import { MiniDevice } from '../../src/components/MiniDevice';
import { theme } from '../../src/theme';
import { useGetMeQuery } from '../../src/store/api';
import { logoutTeardown } from '../../src/store';
import { SEED_TOP3, SEED_NOW_PLAYING, SEED_STATS } from '../../src/data/seed';

// The self-Profile (PROF-05). The IDENTITY (username, avatar, role, bio, gamertags, memberSince) is the
// REAL GET /me self-shape; the Top-3 / Now-Playing / stats / device render from scratch-seeded data
// (their endpoints are M3+). Section ORDER follows the mockup (profile-states.html:505–547):
//   identity → STATS → [PINNED FAVOURITE — M3/catalog, deferred] → TOP 3 → NOW PLAYING → MY DEVICE.
export default function Profile() {
  const router = useRouter();
  const { data: me, isLoading, isError, refetch } = useGetMeQuery();

  async function signOut() {
    await logoutTeardown(); // F20/F14 — purge persisted prefs + reset cache + clear secure-store tokens
    router.replace('/sign-in');
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
        <ScreenButton label="Retry" variant="action-alt" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* identity — the real /me self-shape (bio + gamertags rendered here, fix #3 / P1+P4) */}
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
            <Stat value={SEED_STATS.games} label="Games" />
            <Stat value={`${SEED_STATS.hours}h`} label="Hours" />
            <Stat value={`${SEED_STATS.completionPct}%`} label="Complete" />
            <Stat value={SEED_STATS.cardsDesigned} label="Cards" />
            <Stat value={SEED_STATS.adoptions} label="Adoptions" />
            <Stat value={SEED_STATS.friends} label="Friends" />
          </View>
        </Section>

        <Section title="Top 3">
          <View style={styles.top3}>
            {SEED_TOP3.map((g) => (
              <GameCard key={g.entryId} title={g.title} size="cell" foil={g.foil} />
            ))}
          </View>
        </Section>

        <Section title="Now Playing">
          <View style={styles.nowRow}>
            <GameCard title={SEED_NOW_PLAYING.title} size="cell" nowPlaying />
            <View style={styles.nowMeta}>
              <Text style={styles.nowTitle}>{SEED_NOW_PLAYING.title}</Text>
              <Text style={styles.nowSub}>{SEED_NOW_PLAYING.hours}H LOGGED</Text>
            </View>
          </View>
        </Section>

        {/* MY DEVICE — a small labelled thumbnail (fix #4 / P5); NOT the app-wrapping DeviceShell */}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

// A stats cell — a centered 1/3-width tile so the grid spans the width (mockup `.stats`, P9).
function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statCell}>
      <StatTile value={value} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.scr.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: theme.space.lg },
  body: { padding: theme.space.lg, gap: theme.space.xl },
  errTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.accent, letterSpacing: 1 },
  section: { gap: theme.space.md },
  sectionHead: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.dim, letterSpacing: 1.5 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.space.lg },
  statCell: { width: '33.33%', alignItems: 'center' },
  top3: { flexDirection: 'row', gap: theme.space.lg, justifyContent: 'space-between' },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  nowMeta: { gap: 2 },
  nowTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink },
  nowSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.accent, letterSpacing: 1 },
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
