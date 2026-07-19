import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import type { PatchMeRequest, CreateGamertagRequest } from '@ingame/shared';
import { IdentityBlock } from '../../src/components/IdentityBlock';
import { EditableIdentity, type SaveOutcome } from '../../src/components/profile/EditableIdentity';
import { ScreenHead, SCREEN_HEADER_PAD } from '../../src/components/ScreenHead';
import { EntryCard } from '../../src/components/EntryCard';
import { StatTile } from '../../src/components/StatTile';
import { ScreenButton } from '../../src/components/ScreenButton';
import { ToolButton } from '../../src/components/ToolButton';
import { MiniDevice } from '../../src/components/MiniDevice';
import { RankChip } from '../../src/components/RankChip';
import { CurrencyCounter } from '../../src/components/commerce';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { theme, themedStyles } from '../../src/theme';
import { SHELL_NAMES, SCREEN_THEME_NAMES, resolveShellId, resolveScreenThemeId } from '../../src/theme/palettes';
import { deviceStripCopy } from '../../src/components/device/deviceCopy';
import { STATUS_LABEL } from '../../src/constants/collection';
import { useGetMeQuery, useGetCollectionQuery, useGetDeviceQuery, useGetWalletQuery, useGetGenresQuery } from '../../src/store/api';
import { usePatchMeMutation, useAddGamertagMutation, useRemoveGamertagMutation } from '../../src/store/profileApi';
import { useGetMyAchievementsQuery } from '../../src/store/achievementsApi';
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
  // walk2 B14 — the PINNED FAVOURITE hero enriches its detail lines from the (already app-cached)
  // collection entry: /me's expansion carries only {title, hours, card}; status + developer/year/genre
  // live on the shelf entry (the decision-0061 stat-line + catalog-line grammar).
  const { data: collection } = useGetCollectionQuery();
  const { data: device } = useGetDeviceQuery();
  // F-1 fix 7 — the persistent PX counter rides the Profile header too (ECON-07 entry point).
  const { data: wallet } = useGetWalletQuery();
  // ACH-05 — the Profile achievements teaser. /me carries no teaser (GAP-1), so the earned count reads
  // off /me/achievements `summary` (a bounded query); the row routes into the trophy case.
  const { data: achievements } = useGetMyAchievementsQuery();
  // W-C4 — the Profile EDIT slice (in-place, per-field commit; OQ-034). The genre list feeds the chips.
  const [editing, setEditing] = useState(false);
  const { data: genres } = useGetGenresQuery();
  const [patchMe] = usePatchMeMutation();
  const [addGamertag] = useAddGamertagMutation();
  const [removeGamertag] = useRemoveGamertagMutation();
  const styles = useStyles();

  // Map an RTK mutation rejection to the editor's SaveOutcome: a VALIDATION_ERROR carries field-targeted
  // `details` (api-contract 0.46 — MOD-07 screening / PROF-06 cooldown / uniqueness) → per-field errors.
  function toOutcome(run: () => Promise<unknown>): Promise<SaveOutcome> {
    return run().then(
      () => ({ ok: true }),
      (e: unknown) => {
        const err = e as { data?: { error?: { code?: string; message?: string; details?: { path?: string; message: string }[] } } };
        const detail = err?.data?.error;
        const fieldErrors: Record<string, string> = {};
        for (const d of detail?.details ?? []) if (d.path) fieldErrors[d.path] = d.message;
        return { ok: false, fieldErrors, message: detail?.message };
      },
    );
  }
  const onPatchMe = (patch: PatchMeRequest) => toOutcome(() => patchMe(patch).unwrap());
  const onAddGamertag = (req: CreateGamertagRequest) => toOutcome(() => addGamertag(req).unwrap());
  const onRemoveGamertag = async (id: string) => {
    try {
      await removeGamertag(id).unwrap();
    } catch {
      /* a failed remove leaves the chip; the Me refetch reconciles */
    }
  };

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
              {/* W-C4 — the EDIT keycap (OQ-034 in-place edit doctrine: presses + lights, edits the
                  identity in place, tap again to exit; per-field commit, no giant save). Cream ToolButton
                  (0069 voice), `active` when editing. */}
              <ToolButton
                icon={<EditGlyph color={theme.brand.navy} />}
                label={editing ? 'Done editing' : 'Edit profile'}
                active={editing}
                onPress={() => setEditing((v) => !v)}
              />
              {/* P12 (0076 §0.10) — the Profile header's door into Settings (the board's reach pattern).
                  walk2 B11 — the gear rides the CREAM utility keycap (ToolButton — the 0069 voice). */}
              <ToolButton
                icon={<SettingsGear color={theme.brand.navy} />}
                label="Settings"
                onPress={() => router.push('/settings')}
              />
            </View>
          }
        />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* identity — the real /me self-shape; EDIT mode swaps in the in-place editor (W-C4) */}
        {editing ? (
          <EditableIdentity
            me={me}
            genres={genres}
            onPatchMe={onPatchMe}
            onAddGamertag={onAddGamertag}
            onRemoveGamertag={onRemoveGamertag}
          />
        ) : (
          <IdentityBlock
            username={me.username}
            avatarUrl={me.avatarUrl}
            role={me.role}
            adminTier={me.adminTier}
            memberSince={me.memberSince}
            bio={me.bio}
            gamertags={me.gamertags}
          />
        )}

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

        {/* ACHIEVEMENTS teaser (ACH-05) — the earned count, a door into the trophy case (P11). The
            section ROW is the tap target into /achievements; the owner retired the redundant VIEW-ALL
            button (W-1) — one door, not two. */}
        <Section title="Achievements">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View your achievements"
            onPress={() => router.push('/achievements')}
            style={({ pressed }) => [styles.achRow, pressed && styles.devRowPressed]}
          >
            <View style={styles.achMeta}>
              <Text style={styles.achCount}>{achievements ? achievements.summary.earned : 0} EARNED</Text>
              {achievements && achievements.summary.secretsFound > 0 ? (
                <Text style={styles.achSub}>{achievements.summary.secretsFound} SECRETS FOUND</Text>
              ) : (
                <Text style={styles.achSub}>YOUR TROPHY CASE</Text>
              )}
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        </Section>

        {/* MY CONTRIBUTIONS gateway (CAT-07 · profile-states :562) — walk2 C6: the self-door into the
            (already-built P13) contributor screen. Its only entry today was a DESIGNED-BY tap; this is
            the owner's front-door to their own designs + games added. Routes to /contributor/{me.id}. */}
        <Section title="My Contributions">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View your contributions"
            onPress={() => router.push(`/contributor/${me.id}`)}
            style={({ pressed }) => [styles.achRow, pressed && styles.devRowPressed]}
          >
            <View style={styles.achMeta}>
              <Text style={styles.achCount}>{me.stats.cardsDesigned} CARDS DESIGNED</Text>
              <Text style={styles.achSub}>YOUR DESIGNS &amp; GAMES ADDED</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        </Section>

        {/* PINNED FAVOURITE (PROF-01/05) — walk2 B14: full HERO-CARD treatment, composed per the
            Collection NowPlayingHero grammar (decision 0061): the hero-size card (138×193) + a meta
            column of stat-line ({hours} HRS · {STATUS}) · display-size title · catalog line
            (DEVELOPER · YEAR · GENRE). Detail lines resolve from the caller's collection entry (the
            /me expansion carries only title+hours); off-shelf pins degrade to the hours line alone.
            ASSUMPTION (flagged for the owner): detail-line content = the 0061 stat-line + catalog-line
            pair verbatim — the same two lines the Collection hero and shelf rows speak. */}
        <Section title="Pinned favourite">
          {me.favouriteGame ? (
            (() => {
              const fav = me.favouriteGame;
              const entry = collection?.items.find((i) => i.gameId === fav.gameId);
              const statLine = entry
                ? `${entry.hours} HRS · ${STATUS_LABEL[entry.status]}`
                : `${fav.hours} HRS`;
              const catalogLine = entry
                ? [entry.developer, entry.releaseYear, entry.genres[0]?.name].filter(Boolean).join(' · ').toUpperCase()
                : '';
              return (
                <View style={styles.heroRow}>
                  {/* CARD-23 NAVIGATE — the pinned-favourite is a game handle → the Game page (mode 1). */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${fav.title}`}
                    onPress={() => router.push(`/game/${fav.gameId}`)}
                  >
                    <EntryCard
                      title={fav.title}
                      card={fav.card} // both branches owned by EntryCard (adopted-card parity, round-2 bug 9)
                      size="grid"
                      width={138}
                      height={193}
                      animate // the pinned-favourite hero (0068 opt-in)
                    />
                  </Pressable>
                  <View style={styles.heroMeta}>
                    <Text style={styles.heroStat}>{statLine}</Text>
                    <Text style={styles.heroTitle}>{fav.title.toUpperCase()}</Text>
                    {catalogLine ? <Text style={styles.heroCatalog}>{catalogLine}</Text> : null}
                  </View>
                </View>
              );
            })()
          ) : (
            <Text style={styles.emptyLine}>No favourite pinned yet.</Text>
          )}
        </Section>

        <Section title="Top 3" action={<TertiaryLink label="View top 10" onPress={openTopView} />}>
          {/* walk2 A6 — the board's ALWAYS-3-SEAT frame (profile-states :797–801): filled seats wear the
              card, empty seats the dashed `.ghost-set` (rank + "+", → the TOP view to curate). Seats pack
              LEFT (flex-start + the gap) — the old space-between spread a 2-seat set to the screen edges. */}
          <View style={styles.top3}>
            {[1, 2, 3].map((rank) => {
              const g = top3.find((e) => e.rank === rank);
              return g ? (
                <Pressable
                  key={rank}
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
              ) : (
                <Pressable
                  key={rank}
                  style={styles.topSeat}
                  accessibilityRole="button"
                  accessibilityLabel={`Seat ${rank} empty — rank your top 10`}
                  onPress={openTopView}
                >
                  <View style={styles.ghostSeat}>
                    <Text style={styles.ghostPlus}>+</Text>
                  </View>
                  <RankChip rank={rank} />
                </Pressable>
              );
            })}
          </View>
          {top3.length === 0 ? (
            <Text style={styles.emptyLine}>Rank your Top 10 — the best 3 show here.</Text>
          ) : null}
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

// The EDIT pencil glyph — navy on the cream ToolButton cap (W-C4; the board's ✎ edit affordance).
function EditGlyph({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 12 12">
      <Path d="M1.5 10.5v-2L8 2l2 2-6.5 6.5h-2z" fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

// The header gear glyph — navy on the cream ToolButton cap (walk2 B11 · N4). A BOLD FILLED cog (not a
// thin outline — the owner flagged the old one as light-mode): a solid navy body + 8 protruding teeth
// (4 full-length rects rotated 45°) + a punched cream centre, matching the app's filled-glyph language
// (nav keycaps are solid navy fills). `color` inks the cog; the centre hole wears the cream keycap face.
function SettingsGear({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      {[0, 45, 90, 135].map((a) => (
        <Rect key={a} x={10.3} y={1.6} width={3.4} height={20.8} rx={0.8} fill={color} transform={`rotate(${a} 12 12)`} />
      ))}
      <Circle cx={12} cy={12} r={7.2} fill={color} />
      <Circle cx={12} cy={12} r={3} fill={theme.brand.cream} />
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
  pad: { ...SCREEN_HEADER_PAD }, // W-B1 — the reference geometry, now the shared constant
  scroll: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: t.space.lg },
  body: { padding: t.space.lg, gap: t.space.xl },
  errTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.accent, letterSpacing: 1 },
  errSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, paddingHorizontal: t.space.xl },
  headTools: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
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
  // walk2 B14 — the hero grammar (the Collection NowPlayingHero styles, decision 0061): stat-line +
  // display-size title + catalog line beside the 138×193 hero card.
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  heroMeta: { flex: 1, justifyContent: 'center', gap: 7 },
  heroStat: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  heroTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1 },
  heroCatalog: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  // walk2 A6 — flex-start + gap: partial sets pack LEFT (space-between spread 2 seats to the edges).
  top3: { flexDirection: 'row', gap: t.space.lg, justifyContent: 'flex-start' },
  topSeat: { gap: t.space.sm, alignItems: 'center' },
  // the board's `.ghost-set` empty seat (profile-states :385): dashed cell-size silhouette + "+".
  ghostSeat: { width: 96, height: 134, borderWidth: 1.5, borderColor: t.scr.faint, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  ghostPlus: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.faint },
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
  // ACH-05 teaser row (mirrors the device-row affordance).
  achRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.scr.panel, padding: t.space.lg },
  achMeta: { flex: 1, gap: 2 },
  // N-A5 — the EARNED / CARDS DESIGNED labels stepped DOWN one F-06 rung (title 15 → body 11); the
  // only legal on-screen sizes are 21/15/11/9 (F-06 law), so 11 is the next-smaller allowed size.
  achCount: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  achSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  chev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },
}));
