import { useMemo, useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { GalleryCardView, AdoptResponse, CollectionItem, FriendCollectionItem } from '@ingame/shared';
import { EntryCard } from '../../../../src/components/EntryCard';
import { EquipReadout } from '../../../../src/components/game/EquipReadout';
import { AdoptCardSheet, type AdoptOutcome } from '../../../../src/components/game/AdoptCardSheet';
import { ScreenButton } from '../../../../src/components/ScreenButton';
import { TertiaryLink } from '../../../../src/components/TertiaryLink';
import { StateMark } from '../../../../src/components/StateMark';
import { Skeleton } from '../../../../src/components/lifecycle/Skeleton';
import { LoadError } from '../../../../src/components/lifecycle/LoadError';
import { Unavailable } from '../../../../src/components/lifecycle/Unavailable';
import { themedStyles } from '../../../../src/theme';
import { useGetCollectionQuery, useGetWalletQuery, useAddToCollectionMutation } from '../../../../src/store/api';
import { useGetUserCollectionQuery } from '../../../../src/store/friendApi';
import { useGetGameGalleryQuery, useAdoptCardMutation } from '../../../../src/store/communityApi';

// P9 — the SOC-11 entry detail (game-page M7 friend artboard, as a screen). A friend's game viewed via
// THEIR entry: their card (flattened, EntryCard) + the CARD-22 equipped readout (when present) + the
// gated stats (hours/status/since — notes/rating/platforms stay private, PROF-03). Composed client-side
// (ARCH A3): ONE friendCollectionItem (found in /users/:id/collection by gameId) + my own entry for the
// same game (compare fragment + owned check) + the game gallery (to resolve the adopt-able card by id).
// Actions: ADOPT their card (AdoptCardSheet re-pointed via the gallery lookup, ARCH A4) · ADD TO
// COLLECTION when I don't own it · COMPARE-with-mine (the single-game side-by-side) when I do.
export default function FriendEntryDetail() {
  const { id, gameId } = useLocalSearchParams<{ id: string; gameId: string }>();
  const router = useRouter();
  const styles = useStyles();

  // Hooks ALL unconditional (F-16).
  const { data: friendCol, isLoading: friendLoading, isError: friendError, error: friendErr, refetch } =
    useGetUserCollectionQuery(id ?? '', { skip: !id });
  const { data: myCol } = useGetCollectionQuery();
  const { data: gallery } = useGetGameGalleryQuery(gameId ?? '', { skip: !gameId });
  const { data: wallet } = useGetWalletQuery();
  const [adoptCard, adoptState] = useAdoptCardMutation();
  const [addToCollection, addState] = useAddToCollectionMutation();
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const friendItem = useMemo<FriendCollectionItem | undefined>(
    () => friendCol?.items.find((it) => it.gameId === gameId),
    [friendCol, gameId],
  );
  const myItem = useMemo<CollectionItem | undefined>(
    () => myCol?.items.find((it) => it.gameId === gameId),
    [myCol, gameId],
  );
  // The adopt-able gallery card = the friend's card resolved in the game's published gallery (ARCH A4).
  // Absent when their card is private/default/unpublished → ADOPT is not offered.
  const galleryCard = useMemo<GalleryCardView | null>(
    () => gallery?.items.find((c) => c.id === friendItem?.card.id) ?? null,
    [gallery, friendItem],
  );

  async function onAdopt(): Promise<AdoptOutcome> {
    if (!galleryCard) return { ok: false, code: 'ERROR' };
    try {
      const result = await adoptCard(galleryCard.id).unwrap();
      return { ok: true, result };
    } catch (e) {
      const err = e as { status?: unknown; data?: { error?: { code?: string; shortBy?: number } } };
      const code = err?.data?.error?.code;
      if (code === 'INSUFFICIENT_BALANCE') return { ok: false, code: 'INSUFFICIENT_BALANCE', shortBy: err.data?.error?.shortBy ?? 0 };
      if (code === 'ALREADY_ADOPTED') return { ok: false, code: 'ALREADY_ADOPTED' };
      if (code === 'NOT_PUBLISHED') return { ok: false, code: 'NOT_PUBLISHED' };
      if (err?.status === 'FETCH_ERROR' || err?.status === 'TIMEOUT_ERROR') return { ok: false, code: 'OFFLINE' };
      return { ok: false, code: 'ERROR' };
    }
  }
  function onAdopted(_r: AdoptResponse, _c: GalleryCardView) {
    /* the mutation invalidates the switcher/gallery/wallet; the sheet shows the in-place settle */
  }
  async function onAddToCollection() {
    if (!gameId) return;
    try {
      await addToCollection({ gameId }).unwrap();
      setAdded(true);
    } catch {
      /* invalidation refetches; a failure leaves the button as-is */
    }
  }

  if (friendLoading || !id || !gameId) {
    return (
      <Frame title="Game" backLabel="Back" onBack={() => router.back()}>
        <Skeleton variant="card-cell" count={1} />
      </Frame>
    );
  }
  const status = (friendErr as { status?: unknown } | undefined)?.status;
  if (friendError && status === 404) {
    return (
      <Frame title="Game" backLabel="Go back" onBack={() => router.back()}>
        <Unavailable message="This isn't available." onBack={() => router.back()} />
      </Frame>
    );
  }
  if (friendError || !friendCol) {
    return (
      <Frame title="Game" backLabel="Go back" onBack={() => router.back()}>
        <LoadError message="Couldn't load this. Check your connection and try again." onRetry={() => void refetch()} />
      </Frame>
    );
  }
  if (!friendItem) {
    return (
      <Frame title="Game" backLabel="Return to collection" onBack={() => router.back()}>
        <View style={styles.notOwned}>
          <Text style={styles.notOwnedTitle}>NOT IN THEIR COLLECTION</Text>
          <Text style={styles.notOwnedSub}>They don&apos;t have this game on their shelf.</Text>
        </View>
      </Frame>
    );
  }

  const card = friendItem.card;
  const iOwn = myItem !== undefined || added;

  return (
    <Frame title="Game" backLabel="Return to collection" onBack={() => router.back()}>
      <Text style={styles.title}>{friendItem.title}</Text>
      <Text style={styles.facts}>{factsLine(friendItem)}</Text>

      {/* their card face (flattened) + gated stats readout */}
      <View style={styles.dualface}>
        <View style={styles.faceCol}>
          <EntryCard title={friendItem.title} card={{ imageUrl: card.imageUrl }} size="cell" nowPlaying={friendItem.nowPlaying} />
          <Text style={styles.faceLabel}>THEIR FACE</Text>
        </View>
        <View style={styles.statsCol}>
          <StatRow label="HOURS" value={`${fmt(friendItem.hours)}`} />
          <StatRow label="STATUS" value={friendItem.status.toUpperCase()} />
          {friendItem.ownedSince ? <StatRow label="SINCE" value={friendItem.ownedSince} /> : null}
          <View style={styles.privRow}>
            <Text style={styles.privLabel}>NOTES · RATING</Text>
            <Text style={styles.privValue}>🔒 PRIVATE</Text>
          </View>
        </View>
      </View>

      {/* CARD-22 equipped readout — rendered ONLY when present (a quiet absence otherwise) */}
      {card.equipped ? (
        <View style={styles.equipWrap}>
          <EquipReadout equipped={card.equipped} />
        </View>
      ) : null}

      {/* card-artist attribution (custom cards) → the contributor profile (app-wide designer-tap) */}
      {card.designer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Card by ${card.designer.username} — view contributions`}
          onPress={() => router.push(`/contributor/${card.designer!.userId}`)}
        >
          <Text style={styles.artist}>
            CARD ARTIST · <Text style={styles.artistName}>{card.designer.username.toUpperCase()}</Text>
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.privacyNote}>
        Their notes &amp; platforms stay private (COL-04/05) — only hours · status · since show.
      </Text>

      {/* actions — ADOPT (if the card is published/adopt-able) · ADD TO COLLECTION (if unowned) */}
      <View style={styles.actions}>
        {galleryCard ? (
          <ScreenButton label="Adopt their card" variant="primary" onPress={() => setAdoptOpen(true)} block />
        ) : null}
        {!iOwn ? (
          <ScreenButton
            label={added ? 'Added ✓' : addState.isLoading ? 'Adding…' : 'Add to collection'}
            variant={galleryCard ? 'secondary' : 'primary'}
            onPress={() => void onAddToCollection()}
            disabled={added || addState.isLoading}
            block
          />
        ) : null}
      </View>

      {/* COMPARE-with-mine (single-game) — only when I own the game (ARCH A3) */}
      {iOwn && myItem ? (
        <SingleGameCompare mine={myItem} theirs={friendItem} />
      ) : null}

      <AdoptCardSheet
        card={galleryCard}
        visible={adoptOpen}
        balance={wallet?.balance ?? 0}
        onClose={() => setAdoptOpen(false)}
        onAdopt={onAdopt}
        adopting={adoptState.isLoading}
        onAdopted={onAdopted}
        onTopUp={() => router.push({ pathname: '/store', params: { view: 'wallet' } })}
        onShare={() => { /* sharing a friend's card isn't offered from the entry detail */ }}
        onBlock={() => { /* block lives on the profile ⋯ overflow — not surfaced from an adopt of their card */ }}
        onViewContributor={(userId) => { setAdoptOpen(false); router.push(`/contributor/${userId}`); }}
      />
    </Frame>
  );
}

// The single-game compare fragment (M7 `.compare`) — your card vs their card, your hours vs theirs
// (winner orange). Completion shows on YOUR side only (theirs is omitted cross-user, decision 0026).
function SingleGameCompare({ mine, theirs }: { mine: CollectionItem; theirs: FriendCollectionItem }) {
  const styles = useStyles();
  const youWin = mine.hours >= theirs.hours;
  return (
    <View style={styles.compare}>
      <Text style={styles.compareHead}>⇄ COMPARE — YOU vs THEM</Text>
      <View style={styles.compareRow}>
        <View style={styles.compareCol}>
          <Text style={styles.compareWho}>YOU</Text>
          <EntryCard title={mine.title} card={{ imageUrl: mine.card.imageUrl, composition: mine.card.composition }} size="cell" />
        </View>
        <View style={styles.compareMid}>
          <View style={styles.vbar}>
            <Text style={[styles.vv, youWin && styles.vvWin]}>{fmt(mine.hours)}</Text>
            <Text style={styles.vl}>HRS</Text>
            <Text style={styles.vs}>vs</Text>
            <Text style={[styles.vv, !youWin && styles.vvWin]}>{fmt(theirs.hours)}</Text>
          </View>
          <View style={styles.vbar}>
            <Text style={styles.vv}>{mine.percentComplete ?? '—'}{mine.percentComplete != null ? '%' : ''}</Text>
            <Text style={styles.vl}>DONE</Text>
            <Text style={styles.vs}>vs</Text>
            <Text style={styles.vvDim}>—</Text>
          </View>
          <View style={styles.leadStrip}>
            <StateMark size={8} />
            <Text style={styles.leadText}>{youWin ? 'YOU LEAD' : 'THEY LEAD'}</Text>
          </View>
        </View>
        <View style={styles.compareCol}>
          <Text style={styles.compareWho}>THEM</Text>
          <EntryCard title={theirs.title} card={{ imageUrl: theirs.card.imageUrl }} size="cell" />
        </View>
      </View>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function factsLine(i: FriendCollectionItem): string {
  return [i.developer, i.releaseYear, i.genres[0]?.name].filter(Boolean).join(' · ').toUpperCase();
}
function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function Frame({ title, backLabel, onBack, children }: { title: string; backLabel: string; onBack: () => void; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Text style={styles.headTitle} accessibilityRole="header">{title.toUpperCase()}</Text>
        </View>
        <View style={styles.retlink}>
          <TertiaryLink label={backLabel} chevron="leading-back" onPress={onBack} />
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
  head: { paddingHorizontal: t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.sm },
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 3 },
  retlink: { paddingHorizontal: t.space.lg, paddingBottom: t.space.md },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 0.5 },
  facts: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1, marginTop: -t.space.sm },

  dualface: { flexDirection: 'row', gap: t.space.lg, alignItems: 'center' },
  faceCol: { alignItems: 'center', gap: t.space.sm },
  faceLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  statsCol: { flex: 1, gap: t.space.sm, backgroundColor: t.scr.panel, padding: t.space.lg },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  statValue: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  privRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6, marginTop: t.space.xs },
  privLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  privValue: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },

  equipWrap: {},
  artist: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  artistName: { fontFamily: t.font.screenBold, color: t.scr.ink },
  privacyNote: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.3, lineHeight: 14 },

  actions: { gap: t.space.md },

  compare: { backgroundColor: t.scr.panelHi, borderWidth: 1, borderColor: t.scr.hairline, padding: t.space.lg, gap: t.space.md },
  compareHead: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1, textAlign: 'center' },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space.md },
  compareCol: { alignItems: 'center', gap: t.space.sm },
  compareWho: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  compareMid: { flex: 1, gap: t.space.sm, alignItems: 'center' },
  vbar: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  vv: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink },
  vvWin: { color: t.scr.accent },
  vvDim: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },
  vl: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  vs: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
  leadStrip: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  leadText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },

  notOwned: { alignItems: 'center', gap: t.space.md, paddingTop: t.space.xxl },
  notOwnedTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  notOwnedSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center' },
}));
