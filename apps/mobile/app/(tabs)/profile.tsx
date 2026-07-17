import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { IdentityBlock } from '../../src/components/IdentityBlock';
import { ScreenHead } from '../../src/components/ScreenHead';
import { EntryCard } from '../../src/components/EntryCard';
import { StatTile } from '../../src/components/StatTile';
import { ScreenButton } from '../../src/components/ScreenButton';
import { MiniDevice } from '../../src/components/MiniDevice';
import { RankChip } from '../../src/components/RankChip';
import { CurrencyCounter } from '../../src/components/commerce';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { theme, themedStyles, useTheme } from '../../src/theme';
import { SHELL_NAMES, SCREEN_THEME_NAMES, resolveShellId, resolveScreenThemeId } from '../../src/theme/palettes';
import { deviceStripCopy } from '../../src/components/device/deviceCopy';
import { useGetMeQuery, useGetDeviceQuery, useGetWalletQuery } from '../../src/store/api';
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
  const t = useTheme();
  const { data: me, isLoading, isError, refetch } = useGetMeQuery();
  const { data: device } = useGetDeviceQuery();
  // F-1 fix 7 — the persistent PX counter rides the Profile header too (ECON-07 entry point).
  const { data: wallet } = useGetWalletQuery();
  const styles = useStyles();

  async function signOut() {
    await logoutTeardown(); // F20/F14 — purge persisted prefs + reset cache + clear secure-store tokens
    router.replace('/sign-in');
  }

  function openTopView() {
    // The VIEW TOP 10 door (PROF-05/decision 0050) → the Collection TOP view-mode (COL-13).
    dispatch(setCollectionView('top'));
    router.push('/(tabs)/collection');
  }
  function openTopFocused(gameId: string) {
    // The Top-3 card-tap door (decision 0050 §C) → the Collection TOP view, FOCUSED on that game (NOT the
    // Game page — self taps funnel into the curated view, one home).
    dispatch(setCollectionView('top'));
    router.push({ pathname: '/(tabs)/collection', params: { focus: gameId } });
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

  // COL-13 (decision 0050) — the Top-3 teaser is now the top three of the CURATED Top-10 (me.top10),
  // not the hours-derived placeholder. Empty until the owner curates → the "rank them" nudge.
  const top3 = me.top10.slice(0, 3);

  return (
    <View style={styles.screen}>
      {/* S5-a — the fixed "PROFILE" title band (board `.screen-head` :487), above the scroll. The
          EDIT/SHARE/Settings tools that share that region stay ⛔ M7. */}
      <View style={styles.pad}>
        <ScreenHead
          title="Profile"
          trailing={
            <View style={styles.headTools}>
              <CurrencyCounter
                balance={wallet?.balance ?? 0}
                onPress={() => router.push({ pathname: '/store', params: { view: 'wallet' } })}
              />
              {/* P12 (0076 §0.10) — the Profile header's door into Settings (the board's reach pattern;
                  the M7 EDIT/SHARE tools stay deferred — only the Settings gear opens now). */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={() => router.push('/settings')}
                hitSlop={8}
                style={({ pressed }) => [styles.gear, pressed && styles.gearPressed]}
              >
                <SettingsGear color={t.scr.ink} />
              </Pressable>
            </View>
          }
        />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
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
                <EntryCard
                  title={me.favouriteGame.title}
                  card={me.favouriteGame.card} // both branches owned by EntryCard (adopted-card parity, round-2 bug 9)
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
              {top3.map((g) => (
                <Pressable
                  key={g.gameId}
                  style={styles.topSeat}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${g.title} in your Top 10`}
                  onPress={() => openTopFocused(g.gameId)}
                >
                  {/* EntryCard owns the composition-vs-flattened branch (round-2 bug 9): an equipped
                      ADOPTED card has no composition, only a flattened image — the wrapper can't drop it,
                      so the Top-3 can't regress to the default placeholder for adopted cards. */}
                  <EntryCard title={g.title} card={g.card} size="cell" />
                  <RankChip rank={g.rank} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyLine}>Your curated Top 3 lands here — rank them in your Collection.</Text>
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
                <EntryCard
                  title={me.nowPlaying.title}
                  card={me.nowPlaying.card} // both branches owned by EntryCard (adopted-card parity, round-2 bug 9)
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

        {/* MY DEVICE — a small labelled thumbnail; NOT the app-wrapping DeviceShell. PRESSABLE →
            the §3.5 Device editor (C1); DYNAMIC from GET /me/device (shell·theme·sticker count).
            While the device query is loading, keep today's live shell + a resolved title. */}
        <Section title="My Device">
          {(() => {
            const dShell = resolveShellId(device?.activeShellId);
            const dTheme = resolveScreenThemeId(device?.screenThemeId);
            const stickers = device?.stickerComposition.stickers.length ?? 0;
            const copy = deviceStripCopy(SHELL_NAMES[dShell], SCREEN_THEME_NAMES[dTheme], stickers);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit your device"
                onPress={() => router.push('/device')}
                style={({ pressed }) => [styles.devRow, pressed && styles.devRowPressed]}
              >
                <MiniDevice shellId={dShell} themeId={dTheme} />
                <View style={styles.devMeta}>
                  <Text style={styles.devTitle}>{copy.title}</Text>
                  <Text style={styles.devSub}>{copy.sub}</Text>
                </View>
                {/* F-13 D7 (owner round-2) — the row read as static; give it the house pressable
                    affordance (F-03 keycap grammar), so it clearly opens the editor. */}
                <View style={styles.devEdit}>
                  <Text style={styles.devEditText}>EDIT</Text>
                </View>
              </Pressable>
            );
          })()}
        </Section>

        {/* P12 — SIGN OUT relocated to Settings (0076 §0.10 — one home). The header gear opens Settings,
            where sign-out (+ blocked list · legal) now lives. */}
      </ScrollView>
    </View>
  );
}

// The header gear — the door into Settings (0076 §0.10).
function SettingsGear({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={3.2} fill="none" stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.7 5.3l-1.7 1.7M7 17l-1.7 1.7M18.7 18.7L17 17M7 7L5.3 5.3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
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

// A stats cell — a 3-per-row PANEL container (mockup `.stat`: panel bg, centred value/label — owner
// ruling 2026-07-01) with the boxless StatTile centred inside it. P9.
function Stat({ value, label }: { value: string | number; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statCell}>
      <StatTile value={value} label={label} />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  // S5-a — the fixed title-band wrapper (mirrors collection.tsx `pad`; horizontal pad aligns with body).
  pad: { paddingHorizontal: t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.md },
  scroll: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: t.space.lg },
  body: { padding: t.space.lg, gap: t.space.xl },
  errTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.accent, letterSpacing: 1 },
  errSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, paddingHorizontal: t.space.xl },
  headTools: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  gear: { padding: t.space.xs },
  gearPressed: { opacity: 0.6 },
  section: { gap: t.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 1.5 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  statCell: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: t.scr.panel,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  favCard: { width: 120, height: 168 },
  heroMeta: { flex: 1, gap: 3 },
  heroTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  heroSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 1 },
  top3: { flexDirection: 'row', gap: t.space.lg, justifyContent: 'space-between' },
  topSeat: { gap: t.space.sm, alignItems: 'center' },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  nowMeta: { gap: 2 },
  nowTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink },
  nowSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },
  emptyLine: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    backgroundColor: t.scr.panel,
    padding: t.space.lg,
  },
  devRowPressed: { opacity: 0.82 },
  devMeta: { flex: 1, gap: 2 },
  // F-13 D7 — the trailing EDIT keycap (F-03 cream keycap grammar): a clear "this opens" affordance.
  devEdit: {
    backgroundColor: t.scr.key,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    ...(t.scr.isLight ? { borderWidth: 1, borderColor: t.scr.dim } : null),
  },
  devEditText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.navy, letterSpacing: 1 },
  devTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  devSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
}));
