import { type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type {
  ContributionsResponse,
  ContributorCard,
  ContributorGame,
  ContributorStanding,
} from '@ingame/shared';
import { IdentityBlock } from '../../src/components/IdentityBlock';
import { StatTile } from '../../src/components/StatTile';
import { PctPill } from '../../src/components/PctPill';
import { EntryCard } from '../../src/components/EntryCard';
import { RankChip } from '../../src/components/RankChip';
import { ScreenButton } from '../../src/components/ScreenButton';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { Skeleton } from '../../src/components/lifecycle/Skeleton';
import { LoadError } from '../../src/components/lifecycle/LoadError';
import { Unavailable } from '../../src/components/lifecycle/Unavailable';
import { EmptyState } from '../../src/components/lifecycle/EmptyState';
import { SectionEmpty } from '../../src/components/lifecycle/SectionEmpty';
import { themedStyles, useTheme } from '../../src/theme';
import { useGetMeQuery } from '../../src/store/api';
import { useGetContributionsQuery } from '../../src/store/contributorApi';
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../../src/components/ScreenHead';

// P13 — Contributor profile (E8a · CAT-07 · design board contributor-states.html). The designer-tap
// destination: a person's "My Contributions" pride surface in the Profile grammar — IdentityBlock →
// boxless STATS (+ gold PctPill standing, CAT-10, threshold-gated) → SIGNATURE CARD hero → CARDS
// DESIGNED /cell grid + GAMES ADDED rows, each with a VIEW ALL door. Reached FROM a profile —
// the NavBand renders PROFILE-active (ShellNav's onProfile predicate includes `/contributor`; parvati
// F2 fix — it originally fell through to `locked`). The base endpoint is live since M5 P3; VIEW ALL now
// pushes the dedicated cursor-paginated full-list routes (/contributor/[id]/cards · /games — W-1, over
// the LIVE M6 P13 sub-routes). All card faces are FLATTENED (EntryCard, never a hand-rolled imageUrl
// fallback — F-20).
export default function ContributorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useStyles();

  // Hooks are ALL unconditional (F-16 hook-lint guard) — every early return sits BELOW them.
  const { data: me } = useGetMeQuery();
  const { data, isLoading, isError, error, refetch } = useGetContributionsQuery(id ?? '', {
    skip: !id,
  });

  // ── lifecycle (L1 · L2 · MOD-09 terminal) ───────────────────────────────────────────────────────
  if (isLoading || !id) {
    return (
      <Frame title="Contributions" backLabel="Return to profile" onBack={() => router.back()}>
        <ContributorSkeleton />
      </Frame>
    );
  }
  // MOD-09 non-disclosure: blocked/suspended/deleted collapse to a generic 404 → the terminal
  // Unavailable (never leaks WHICH), distinct from a retryable network error.
  const status = (error as { status?: unknown } | undefined)?.status;
  if (isError && status === 404) {
    return (
      <Frame title="Contributions" backLabel="Return to profile" onBack={() => router.back()}>
        <Unavailable
          message="This contributor isn't available."
          onBack={() => router.back()}
        />
      </Frame>
    );
  }
  if (isError || !data) {
    return (
      <Frame title="Contributions" backLabel="Return to profile" onBack={() => router.back()}>
        <LoadError
          message="Couldn't load these contributions. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </Frame>
    );
  }

  const isSelf = me?.id === id;
  const username = data.user.username;
  const backLabel = isSelf ? 'Return to profile' : `Return to ${username}`;

  // ── the base profile ─────────────────────────────────────────────────────────────────────────────
  // The limited/non-friend shape (PROF-03) omits the set-piece lists — that IS the discriminator.
  const isLimited = data.topCards === undefined && data.topGames === undefined;
  const s = data.stats;
  const isEmpty = s.gamesAdded === 0 && s.cardsDesigned === 0;

  return (
    <Frame title="Contributions" backLabel={backLabel} onBack={() => router.back()}>
      <IdentityBlock
        username={data.user.username}
        avatarUrl={data.user.avatarUrl}
        memberSince={data.user.memberSince}
      />

      <StatsBlock stats={s} standing={data.standing} />

      {isLimited ? (
        // P4 — privacy-limited: stats persist (honest aggregates + PctPill); detail locks.
        <LockWell username={username} onAddFriend={() => router.back()} />
      ) : isEmpty ? (
        isSelf ? (
          // P2 — self cold-start hook (the only gold: acquisitive create doors, F-02).
          <SelfHook
            onAddGame={() => router.push('/add-game')}
            onDesignCard={() => router.push('/add-game')}
          />
        ) : (
          // P3b — friend, no contributions yet: a quiet message, NO create hooks (you can't add for them).
          <View style={styles.quietHook}>
            <EmptyState
              title="NOTHING HERE YET"
              message={`When ${username} brings a game to the catalog or designs a card, their contributions will show up here.`}
            />
          </View>
        )
      ) : (
        // P1 / P3 / P2b — populated (self or friend).
        <>
          {data.signatureCard ? (
            <Section title="Signature card">
              <SignatureHero card={data.signatureCard} onView={() => openGame(router)(data.signatureCard!.gameId)} />
            </Section>
          ) : null}

          <CardsDesignedSection
            cards={data.topCards ?? []}
            isSelf={isSelf}
            onViewAll={() => router.push(`/contributor/${id}/cards`)}
            onOpenGame={openGame(router)}
            onDesignCard={() => router.push('/add-game')}
          />

          <GamesAddedSection
            games={data.topGames ?? []}
            isSelf={isSelf}
            onViewAll={() => router.push(`/contributor/${id}/games`)}
            onOpenGame={openGame(router)}
            onAddGame={() => router.push('/add-game')}
          />
        </>
      )}
    </Frame>
  );
}

// A single navigate-to-game helper (CARD-23 NAVIGATE) — cards + games + the signature hero all open
// the Game page (there is no standalone community CardDetail-by-id route; the not-owned Game page
// handles a game the viewer doesn't own gracefully). EXPECTED(later community CardDetail route).
function openGame(router: ReturnType<typeof useRouter>) {
  return (gameId: string) => router.push(`/game/${gameId}`);
}

// ── STATS (boxless tiles in panel cells; PctPill per axis when the payload carries it) ─────────────
function StatsBlock({
  stats,
  standing,
}: {
  stats: ContributionsResponse['stats'];
  standing: ContributorStanding | null;
}) {
  const styles = useStyles();
  return (
    <Section title="Stats">
      <View style={styles.stats}>
        <StatCell value={stats.gamesAdded} label="Games" pct={standing?.byGames?.percentile} />
        <StatCell value={stats.cardsDesigned} label="Cards" />
        <StatCell value={fmt(stats.totalAdoptions)} label="Adoptions" pct={standing?.byAdoptions?.percentile} />
        <StatCell value={fmt(stats.totalReached)} label="Reached" pct={standing?.byReach?.percentile} />
      </View>
    </Section>
  );
}

function StatCell({ value, label, pct }: { value: string | number; label: string; pct?: number }) {
  const styles = useStyles();
  return (
    <View style={styles.statCell}>
      <StatTile value={value} label={label} />
      {pct !== undefined ? <PctPill percentile={pct} /> : null}
    </View>
  );
}

// ── SIGNATURE CARD hero (most-adopted) ────────────────────────────────────────────────────────────
function SignatureHero({ card, onView }: { card: ContributorCard; onView: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.hero}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${card.gameTitle} card`}
        onPress={onView}
      >
        {/* W-A2 — both urls ride; the wrapper picks (130pt ≥ the plate gate → the plated full). */}
        <EntryCard
          title={card.gameTitle}
          card={{ imageUrl: card.card.imageUrl, thumbUrl: card.card.thumbUrl }}
          width={130}
          height={182}
        />
      </Pressable>
      <View style={styles.heroMeta}>
        <Text style={styles.heroEyebrow}>MOST ADOPTED</Text>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {card.gameTitle.toUpperCase()}
        </Text>
        <Text style={styles.heroSub}>{fmt(card.adoptionCount)} ADOPTIONS</Text>
        <ScreenButton label="View card" variant="secondary" size="mini" onPress={onView} />
      </View>
    </View>
  );
}

// ── CARDS DESIGNED — /cell grid (+ VIEW ALL); self-partial → the gold DESIGN-A-CARD nudge (P2b) ────
function CardsDesignedSection({
  cards,
  isSelf,
  onViewAll,
  onOpenGame,
  onDesignCard,
}: {
  cards: ContributorCard[];
  isSelf: boolean;
  onViewAll: () => void;
  onOpenGame: (gameId: string) => void;
  onDesignCard: () => void;
}) {
  const styles = useStyles();
  if (cards.length === 0) {
    // P2b — self with games-but-no-cards: the gold DESIGN-A-CARD nudge. A friend with no cards → the
    // section is simply absent (no gold for someone else's shelf).
    if (!isSelf) return null;
    return (
      <Section title="Cards designed">
        <SectionEmpty
          variant="contributor-hook"
          title="NO CARDS YET"
          message="Design a card for one of your games — others can adopt it, and it shows up here."
          actionLabel="Design a card"
          onAction={onDesignCard}
        />
      </Section>
    );
  }
  return (
    <Section title="Cards designed" action={<TertiaryLink label="View all" onPress={onViewAll} />}>
      <View style={styles.minigrid}>
        {cards.slice(0, 3).map((c, i) => (
          <Pressable
            key={c.cardId}
            style={styles.cardSeat}
            accessibilityRole="button"
            accessibilityLabel={`View ${c.gameTitle} card, ${c.adoptionCount} adoptions`}
            onPress={() => onOpenGame(c.gameId)}
          >
            <EntryCard title={c.gameTitle} card={{ imageUrl: c.card.imageUrl, thumbUrl: c.card.thumbUrl }} size="cell" />
            <RankChip rank={i + 1} />
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

// ── GAMES ADDED — title rows (+ VIEW ALL). No card thumb: the CAT-07 topGames shape carries no card
// (GAP flagged in the manifest — the board draws a thumb the contract doesn't provide). ──────────────
function GamesAddedSection({
  games,
  isSelf,
  onViewAll,
  onOpenGame,
  onAddGame,
}: {
  games: ContributorGame[];
  isSelf: boolean;
  onViewAll: () => void;
  onOpenGame: (gameId: string) => void;
  onAddGame: () => void;
}) {
  const styles = useStyles();
  if (games.length === 0) {
    if (!isSelf) return null;
    return (
      <Section title="Games added">
        <SectionEmpty
          variant="add-a-game"
          title="NO GAMES YET"
          message="Bring a game to the catalog — everything you add shows up here."
          actionLabel="Add a game"
          onAction={onAddGame}
        />
      </Section>
    );
  }
  return (
    <Section title="Games added" action={<TertiaryLink label="View all" onPress={onViewAll} />}>
      <View style={styles.rows}>
        {games.slice(0, 5).map((g) => (
          <GameRow key={g.gameId} game={g} onPress={() => onOpenGame(g.gameId)} />
        ))}
      </View>
    </Section>
  );
}

function GameRow({ game, onPress }: { game: ContributorGame; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      style={({ pressed }) => [styles.crow, pressed && styles.crowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${game.title}, in ${game.collectionsCount} collections`}
      onPress={onPress}
    >
      <View style={styles.crowMeta}>
        <Text style={styles.crowTitle} numberOfLines={1}>
          {game.title.toUpperCase()}
        </Text>
        <Text style={styles.crowReach}>
          IN {fmt(game.collectionsCount)} COLLECTIONS
        </Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

// ── P2 self cold-start hook (the two gold create doors) ──────────────────────────────────────────
function SelfHook({ onAddGame, onDesignCard }: { onAddGame: () => void; onDesignCard: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.hook}>
      <View style={styles.hookGlyph}>
        <Svg width={30} height={30} viewBox="0 0 24 24">
          <Rect x={3} y={3} width={7} height={7} rx={1} stroke={t.scr.faint} strokeWidth={2} fill="none" />
          <Rect x={14} y={3} width={7} height={7} rx={1} stroke={t.scr.faint} strokeWidth={2} fill="none" />
          <Rect x={3} y={14} width={7} height={7} rx={1} stroke={t.scr.faint} strokeWidth={2} fill="none" />
          <Path d="M17.5 14.5v6M14.5 17.5h6" stroke={t.scr.faint} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </View>
      <Text style={styles.hookTitle}>NOTHING HERE YET</Text>
      <Text style={styles.hookSub}>
        Be the first to bring a game to the catalog, or design a card others can adopt. Everything you
        add shows up here.
      </Text>
      <View style={styles.hookActs}>
        <ScreenButton label="Add a game" variant="add" icon={<Text style={styles.plus}>＋</Text>} onPress={onAddGame} block />
        <ScreenButton label="Design a card" variant="add" icon={<Text style={styles.plus}>✦</Text>} onPress={onDesignCard} block />
      </View>
    </View>
  );
}

// ── P4 privacy lock-well (non-friend detail lock) ────────────────────────────────────────────────
function LockWell({ username, onAddFriend }: { username: string; onAddFriend: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.lockWell}>
      <Svg width={26} height={26} viewBox="0 0 24 24">
        <Rect x={5} y={11} width={14} height={9} rx={1.5} stroke={t.scr.dim} strokeWidth={2} fill="none" />
        <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={t.scr.dim} strokeWidth={2} fill="none" />
      </Svg>
      <Text style={styles.lockTitle}>FRIENDS-ONLY DETAIL</Text>
      <Text style={styles.lockSub}>
        {username} shares the games and cards they've made with friends. The stats above are public —
        add them to browse the full record.
      </Text>
      {/* GAP: no friend-request mutation exists yet (P8/P1). ADD FRIEND returns toward their profile,
          where the friend action lives (honest, not a fake write). */}
      <ScreenButton label="Add friend" variant="action-alt" onPress={onAddFriend} />
    </View>
  );
}

// ── section header + the shared screen frame (header · back-seam · scroll) ─────────────────────────
function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
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
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

// L1 — the §1.6 Skeleton: solid quiet fills in the identity → stats → hero → card-row shapes.
function ContributorSkeleton() {
  return (
    <View>
      <Skeleton variant="text-lines" lines={2} />
      <View style={{ height: 12 }} />
      <Skeleton variant="tile-row" count={4} />
      <View style={{ height: 12 }} />
      <Skeleton variant="card-cell" count={3} />
    </View>
  );
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    ...SCREEN_HEADER_PAD, // W-B1 — was bottom sm
  },
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  section: { gap: t.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },

  // stats — 4 panel cells, boxless tile + optional PctPill centred
  stats: { flexDirection: 'row', gap: t.space.sm },
  statCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: t.scr.panel,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.xs,
  },

  // signature hero
  hero: {
    flexDirection: 'row',
    gap: t.space.lg,
    alignItems: 'center',
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    padding: t.space.lg,
  },
  heroMeta: { flex: 1, gap: t.space.sm },
  heroEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 2 },
  heroTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 0.5 },
  heroSub: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 1 },

  // cards designed grid
  minigrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  cardSeat: { alignItems: 'center', gap: t.space.sm },

  // games added rows
  rows: { backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline },
  crow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.lg,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
  },
  crowPressed: { backgroundColor: t.scr.panelHi },
  crowMeta: { flex: 1, gap: t.space.xs },
  crowTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  crowReach: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  chev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },

  // self hook (P2)
  hook: { alignItems: 'center', gap: t.space.lg, paddingTop: t.space.xl, paddingHorizontal: t.space.md },
  hookGlyph: {
    width: 58,
    height: 58,
    borderWidth: 2,
    borderColor: t.scr.faint,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hookTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  hookSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 17, maxWidth: 260 },
  hookActs: { gap: t.space.md, width: 220, marginTop: t.space.xs },
  plus: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.valueInk },

  quietHook: { paddingTop: t.space.md },

  // lock well (P4)
  lockWell: {
    borderWidth: 1,
    borderColor: t.scr.faint,
    borderStyle: 'dashed',
    padding: t.space.xl,
    alignItems: 'center',
    gap: t.space.md,
  },
  lockTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1.5 },
  lockSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, textAlign: 'center', lineHeight: 15, maxWidth: 260 },
}));
