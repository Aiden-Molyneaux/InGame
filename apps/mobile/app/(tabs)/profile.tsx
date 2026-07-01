import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { IdentityBlock } from '../../src/components/IdentityBlock';
import { GameCard } from '../../src/components/GameCard';
import { StatTile } from '../../src/components/StatTile';
import { ScreenButton } from '../../src/components/ScreenButton';
import { PipLight } from '../../src/components/PipLight';
import { theme } from '../../src/theme';
import { useGetMeQuery } from '../../src/store/api';
import { logoutTeardown } from '../../src/store';
import { SEED_TOP3, SEED_NOW_PLAYING, SEED_STATS } from '../../src/data/seed';

// The self-Profile (PROF-05). The IDENTITY (username, avatar, role, bio, memberSince) is the REAL
// GET /me self-shape; the Device hero / Now-Playing / Top-3 / stats render from scratch-seeded data
// (their endpoints are M3+). This is the "your profile" half of the tangible win.
export default function Profile() {
  const router = useRouter();
  const { data: me, isLoading, isError, refetch } = useGetMeQuery();

  async function signOut() {
    await logoutTeardown(); // F20/F14 — purge persisted prefs + reset cache + clear secure-store tokens
    router.replace('/sign-in');
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.brand.accent} />
      </SafeAreaView>
    );
  }
  if (isError || !me) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={styles.errTitle}>SIGNAL LOST</Text>
        <ScreenButton label="Retry" variant="action-alt" onPress={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <IdentityBlock
          username={me.username}
          avatarUrl={me.avatarUrl}
          role={me.role}
          adminTier={me.adminTier}
          memberSince={me.memberSince}
        />
        {me.bio ? <Text style={styles.bio}>{me.bio}</Text> : null}

        {/* Device hero (PROF-05) — the user's device set-piece (styled placeholder; DEV-* is M4). */}
        <View style={styles.device}>
          <View style={styles.deviceRail}>
            <View style={styles.screw} />
            <PipLight size={6} />
            <View style={styles.screw} />
          </View>
          <View style={styles.deviceScreen}>
            <Text style={styles.deviceWord}>INGAME</Text>
          </View>
        </View>

        <Section title="Now Playing">
          <View style={styles.nowRow}>
            <GameCard title={SEED_NOW_PLAYING.title} size="cell" nowPlaying />
            <View style={styles.nowMeta}>
              <Text style={styles.nowTitle}>{SEED_NOW_PLAYING.title}</Text>
              <Text style={styles.nowSub}>{SEED_NOW_PLAYING.hours}H LOGGED</Text>
            </View>
          </View>
        </Section>

        <Section title="Top 3">
          <View style={styles.top3}>
            {SEED_TOP3.map((g) => (
              <GameCard key={g.entryId} title={g.title} size="cell" foil={g.foil} />
            ))}
          </View>
        </Section>

        <Section title="Stats">
          <View style={styles.stats}>
            <StatTile value={SEED_STATS.games} label="Games" />
            <StatTile value={`${SEED_STATS.hours}h`} label="Hours" />
            <StatTile value={`${SEED_STATS.completionPct}%`} label="Complete" />
            <StatTile value={SEED_STATS.cardsDesigned} label="Cards" />
            <StatTile value={SEED_STATS.adoptions} label="Adoptions" />
            <StatTile value={SEED_STATS.friends} label="Friends" />
          </View>
        </Section>

        <ScreenButton label="Sign out" variant="secondary" onPress={signOut} block />
      </ScrollView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.scr.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: theme.space.lg },
  body: { padding: theme.space.lg, gap: theme.space.xl },
  errTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.accent, letterSpacing: 1 },
  bio: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim, lineHeight: 16 },
  device: {
    backgroundColor: theme.shell.plastic,
    borderRadius: theme.corner.shell,
    padding: theme.space.md,
    borderBottomWidth: 4,
    borderBottomColor: theme.shell.lo,
  },
  deviceRail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.space.sm, paddingBottom: theme.space.sm },
  screw: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.shell.lo },
  deviceScreen: { backgroundColor: theme.scr.bg, height: 90, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.shell.ink },
  deviceWord: { fontFamily: theme.font.shell, fontSize: 24, color: theme.brand.accent, letterSpacing: 2 },
  section: { gap: theme.space.md },
  sectionHead: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.dim, letterSpacing: 1.5 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  nowMeta: { gap: 2 },
  nowTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink },
  nowSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.accent, letterSpacing: 1 },
  top3: { flexDirection: 'row', gap: theme.space.lg, justifyContent: 'space-between' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.lg, rowGap: theme.space.lg },
});
