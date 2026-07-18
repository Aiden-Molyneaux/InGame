import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import type { GalleryCardView, CollectionItem, FriendCollectionItem } from '@ingame/shared';
import { EntryCard } from '../EntryCard';
import { EquipReadout } from './EquipReadout';
import { CommunityGallery } from './CommunityGallery';
import { AboutTab } from './AboutTab';
import { GameTabDock, type GameSection } from './GameTabDock';
import { AdoptCardSheet, type AdoptOutcome } from './AdoptCardSheet';
import { ReportSheet, type ReportTarget, type ReportActionOutcome } from '../report/ReportSheet';
import { ConfirmSheet } from '../ConfirmSheet';
import { PulledSheet } from '../PulledSheet';
import { ScreenButton } from '../ScreenButton';
import { TertiaryLink } from '../TertiaryLink';
import { StateMark } from '../StateMark';
import { Toast } from '../lifecycle/Toast';
import { Skeleton } from '../lifecycle/Skeleton';
import { LoadError } from '../lifecycle/LoadError';
import { Unavailable } from '../lifecycle/Unavailable';
import { useSheetLocked } from '../SheetLock';
import { shareCardImage } from '../../store/shareCard';
import { themedStyles } from '../../theme';
import { useGetWalletQuery } from '../../store/api';
import { useGetUserCollectionQuery, useGetUserQuery } from '../../store/friendApi';
import { useGetGameGalleryQuery, useAdoptCardMutation, useBlockUserMutation } from '../../store/communityApi';
import { useAddToCollectionMutation } from '../../store/api';
import { useSubmitReportMutation, type CreateReportRequest } from '../../store/reportApi';
import { useAppSelector } from '../../store/hooks';
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../ScreenHead';

// FriendGamePage (W-D1 · game-page board M7) — the FRIEND posture of the adaptive Game page: a friend's
// game viewed via `/game/[id]?via=<friendUserId>`. It ABSORBS the retired `/user/[id]/entry/[gameId]`
// SOC-11 screen (its PLAY body ports here verbatim) and dresses it in the full tabbed Game-page chrome.
//
//   PLAY  — THEIR play data READ-ONLY (COL-10/11 · CARD-22): their flattened card (EntryCard, never
//           composition — OQ-122/CARD-15) · the gated stats readout (hours/status/since; notes/rating
//           PRIVATE, PROF-03/COL-04/05) · the CARD-22 EquipReadout (only when present) · the card-artist
//           credit → contributor · ADOPT THEIR CARD (A4 gallery lookup → the ECON-03 AdoptCardSheet) ·
//           the inline COMPARE-WITH-MINE fragment (Q1; % on your side only, 0026) when you own it ·
//           ADD TO COLLECTION when you don't · VIEW YOUR COPY (Q2 — drops `via`, swaps to OWN) when you do.
//   CARDS — the COMMUNITY GALLERY ONLY (no switcher — not your shelf); adopt-capable (the same ECON-03 sheet).
//   ABOUT — the shared game-detail fill (identical to OWN/CATALOG).
//
// READ-ONLY invariants (§6): no EDIT/LOG-HOURS/remove/now-playing on a friend's game; the ⋯ overflow
// carries only REPORT (the game), never a mutation of their entry. Composes client-side (ARCH A3): the
// friend's collection item (by gameId) + MY entry (`myEntry`, for compare + iOwn) + the gallery (adopt lookup).
export function FriendGamePage({
  gameId,
  via,
  myEntry,
}: {
  gameId: string;
  via: string;
  /** MY collection item for this game (from the resolver's /me/collection read) — compare + iOwn source. */
  myEntry: CollectionItem | undefined;
}) {
  const router = useRouter();
  const styles = useStyles();
  const bgLocked = useSheetLocked();

  // Hooks ALL unconditional (F-16) — the lifecycle/edge returns sit below every hook.
  const { data: friendCol, isLoading: friendLoading, isError: friendError, error: friendErr, refetch } =
    useGetUserCollectionQuery(via, { skip: !via });
  const { data: friendProfile } = useGetUserQuery(via, { skip: !via });
  const { data: gallery } = useGetGameGalleryQuery(gameId, { skip: !gameId });
  const { data: wallet } = useGetWalletQuery();
  const [adoptCard, adoptState] = useAdoptCardMutation();
  const [addToCollection, addState] = useAddToCollectionMutation();
  const [blockUser, blockState] = useBlockUserMutation();
  const [submitReport, reportState] = useSubmitReportMutation();
  const shareToken = useAppSelector((s) => s.auth.accessToken);

  const [section, setSection] = useState<GameSection>('play');
  const [added, setAdded] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  // ONE inspect sheet drives BOTH adopt paths (ADOPT THEIR CARD on PLAY + a CARDS-gallery cell tap).
  const [inspectCard, setInspectCard] = useState<GalleryCardView | null>(null);
  const [blockCard, setBlockCard] = useState<GalleryCardView | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  // Reset per-game view state when the game (or the friend) changes — expo-router re-renders this route.
  useEffect(() => {
    setSection('play');
    setAdded(false);
    setOverflowOpen(false);
    setInspectCard(null);
    setBlockCard(null);
    setReportTarget(null);
    setToast(null);
  }, [gameId, via]);

  const friendItem = useMemo<FriendCollectionItem | undefined>(
    () => friendCol?.items.find((it) => it.gameId === gameId),
    [friendCol, gameId],
  );
  // The adopt-able gallery card = the friend's card resolved in the game's published gallery (ARCH A4).
  // Absent when their card is private/default/unpublished → ADOPT THEIR CARD is not offered.
  const galleryCard = useMemo<GalleryCardView | null>(
    () => gallery?.items.find((c) => c.id === friendItem?.card.id) ?? null,
    [gallery, friendItem],
  );

  // Both the friend/full and non-friend/limited profile shapes carry `username` (the header chip source).
  const friendName = friendProfile?.username;

  // ── adopt (0072) — map the RTK error surface to the sheet's AdoptOutcome (shared by both adopt paths) ──
  async function onAdopt(): Promise<AdoptOutcome> {
    if (!inspectCard) return { ok: false, code: 'ERROR' };
    try {
      const result = await adoptCard(inspectCard.id).unwrap();
      return { ok: true, result };
    } catch (e) {
      const err = e as { status?: unknown; data?: { error?: { code?: string; shortBy?: number } } };
      if (err?.status === 'FETCH_ERROR' || err?.status === 'TIMEOUT_ERROR') return { ok: false, code: 'OFFLINE' };
      const code = err?.data?.error?.code;
      if (code === 'INSUFFICIENT_BALANCE') return { ok: false, code: 'INSUFFICIENT_BALANCE', shortBy: err?.data?.error?.shortBy ?? 0 };
      if (code === 'ALREADY_ADOPTED') return { ok: false, code: 'ALREADY_ADOPTED' };
      if (code === 'NOT_PUBLISHED') return { ok: false, code: 'NOT_PUBLISHED' };
      return { ok: false, code: 'ERROR' };
    }
  }
  function onAdopted() {
    /* the mutation invalidates the switcher/gallery/wallet; the sheet shows the in-place settle (G5) */
  }
  async function onAddToCollection() {
    try {
      await addToCollection({ gameId }).unwrap();
      setAdded(true); // the resolver's Collection re-read will also land myEntry (VIEW YOUR COPY appears)
    } catch {
      setToast({ tone: 'error', message: 'Couldn’t add this to your collection right now.' });
    }
  }
  async function doBlock() {
    if (!blockCard) return;
    const designer = blockCard.designer.username;
    try {
      await blockUser(blockCard.designer.userId).unwrap();
      setToast({ tone: 'success', message: `${designer}'s cards are hidden from your community views.` });
      setInspectCard(null);
    } catch {
      setToast({ tone: 'error', message: `Couldn't block ${designer} right now. Please try again.` });
    }
    setBlockCard(null);
  }
  async function onSubmitReport(req: CreateReportRequest): Promise<ReportActionOutcome> {
    try {
      await submitReport(req).unwrap();
      return 'ok';
    } catch (e) {
      const err = e as { status?: unknown };
      if (err?.status === 'FETCH_ERROR' || err?.status === 'TIMEOUT_ERROR') return 'offline';
      return 'error';
    }
  }
  async function shareCard(cardId: string, title: string) {
    setShareBusy(true);
    try {
      const res = await shareCardImage(cardId, title, shareToken);
      if (res === 'unavailable') setToast({ tone: 'error', message: 'Sharing isn’t available for this card yet.' });
    } catch {
      setToast({ tone: 'error', message: 'This card can’t be shared yet.' });
    } finally {
      setShareBusy(false);
    }
  }

  // ── lifecycle / edge (mirrors the retired SOC-11 screen) ──────────────────────────────────────────
  if (friendLoading) {
    return (
      <Frame friendName={friendName} onBack={() => router.back()}>
        <Skeleton variant="card-cell" count={1} />
      </Frame>
    );
  }
  const status = (friendErr as { status?: unknown } | undefined)?.status;
  if (friendError && status === 404) {
    return (
      <Frame friendName={friendName} onBack={() => router.back()}>
        <Unavailable message="This isn't available." onBack={() => router.back()} />
      </Frame>
    );
  }
  if (friendError || !friendCol) {
    return (
      <Frame friendName={friendName} onBack={() => router.back()}>
        <LoadError message="Couldn't load this. Check your connection and try again." onRetry={() => void refetch()} />
      </Frame>
    );
  }
  if (!friendItem) {
    return (
      <Frame friendName={friendName} onBack={() => router.back()}>
        <View style={styles.edge}>
          <Text style={styles.edgeTitle}>NOT IN THEIR COLLECTION</Text>
          <Text style={styles.edgeSub}>They don&apos;t have this game on their shelf.</Text>
        </View>
      </Frame>
    );
  }

  const iOwn = myEntry !== undefined || added;

  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        {/* header — GAME + the friend tag chip (board: RIKO'S) + the ⋯ overflow (REPORT only, no remove) */}
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">GAME</Text>
          <View style={styles.headRight}>
            {friendName ? (
              <View style={styles.friendTag}>
                <Text style={styles.friendTagText}>{friendName.toUpperCase()}’S</Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Game options"
              onPress={() => setOverflowOpen(true)}
              hitSlop={8}
            >
              <Text style={styles.ovf}>⋯</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.retlink}>
          <TertiaryLink label="Return to collection" chevron="leading-back" onPress={() => router.back()} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!bgLocked}
        >
          {section === 'play' ? (
            <FriendPlayTab
              friendItem={friendItem}
              friendName={friendName}
              galleryCard={galleryCard}
              iOwn={iOwn}
              myItem={myEntry}
              adding={addState.isLoading}
              added={added}
              onAdoptTheirCard={() => galleryCard && setInspectCard(galleryCard)}
              onAddToCollection={() => void onAddToCollection()}
              onViewYourCopy={() => router.replace(`/game/${gameId}`)}
              onViewContributor={(userId) => router.push(`/contributor/${userId}`)}
            />
          ) : section === 'cards' ? (
            // CARDS = the community gallery ONLY (no switcher — not your shelf); adopt-capable (ECON-03).
            <CommunityGallery
              gameId={gameId}
              onInspect={setInspectCard}
              onDesignACard={() => router.push(`/styler/${gameId}`)}
              onViewDesigner={(userId) => router.push(`/contributor/${userId}`)}
            />
          ) : (
            <AboutTab
              gameId={gameId}
              onViewContributor={(userId) => router.push(`/contributor/${userId}`)}
              onOpenUser={(userId) => router.push(`/user/${userId}`)}
            />
          )}
        </ScrollView>

        <GameTabDock value={section} onChange={setSection} />
      </View>

      {/* overlays at the screen root (PulledSheet contract) — the same ECON-03 adopt sheet for both paths */}
      <AdoptCardSheet
        card={inspectCard}
        visible={inspectCard !== null}
        balance={wallet?.balance ?? 0}
        onClose={() => setInspectCard(null)}
        onAdopt={onAdopt}
        adopting={adoptState.isLoading}
        onAdopted={onAdopted}
        onTopUp={() => {
          setInspectCard(null);
          router.push('/store?view=topup');
        }}
        onShare={() => {
          if (inspectCard) void shareCard(inspectCard.id, inspectCard.name);
        }}
        onBlock={() => {
          if (inspectCard) setBlockCard(inspectCard);
        }}
        onReport={() => {
          if (inspectCard) {
            const c = inspectCard;
            setInspectCard(null);
            setReportTarget({ type: 'card', id: c.id, name: c.name });
          }
        }}
        onViewContributor={(userId) => {
          setInspectCard(null);
          router.push(`/contributor/${userId}`);
        }}
        shareBusy={shareBusy}
      />

      <PulledSheet visible={overflowOpen} onClose={() => setOverflowOpen(false)} title="Game options">
        <ScreenButton
          label="Report this game"
          variant="secondary"
          onPress={() => {
            setOverflowOpen(false);
            setReportTarget({ type: 'game', id: gameId, name: friendItem.title });
          }}
          block
        />
      </PulledSheet>

      <ConfirmSheet
        visible={blockCard !== null}
        title={`Block ${blockCard?.designer.username ?? ''}?`}
        message={`Their cards leave your community views. This doesn't remove a card you already adopted — your copy stays.`}
        confirmLabel="Block"
        busy={blockState.isLoading}
        onConfirm={() => void doBlock()}
        onClose={() => setBlockCard(null)}
      />

      <ReportSheet
        visible={reportTarget !== null}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={onSubmitReport}
        submitting={reportState.isLoading}
        onError={(message) => setToast({ tone: 'error', message })}
      />

      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}
    </View>
  );
}

// ── the FRIEND PLAY body (§5.2 — ported from the retired /user/[id]/entry/[gameId] route) ─────────────
function FriendPlayTab({
  friendItem,
  friendName,
  galleryCard,
  iOwn,
  myItem,
  adding,
  added,
  onAdoptTheirCard,
  onAddToCollection,
  onViewYourCopy,
  onViewContributor,
}: {
  friendItem: FriendCollectionItem;
  friendName: string | undefined;
  galleryCard: GalleryCardView | null;
  iOwn: boolean;
  myItem: CollectionItem | undefined;
  adding: boolean;
  added: boolean;
  onAdoptTheirCard: () => void;
  onAddToCollection: () => void;
  onViewYourCopy: () => void;
  onViewContributor: (userId: string) => void;
}) {
  const styles = useStyles();
  const card = friendItem.card;
  const whose = friendName ? `${friendName.toUpperCase()}’S` : 'THEIR';
  return (
    <>
      <Text style={styles.gameTitle}>{friendItem.title}</Text>
      <Text style={styles.facts}>{factsLine(friendItem)}</Text>

      {/* their card face (flattened) + gated stats readout */}
      <View style={styles.dualface}>
        <View style={styles.faceCol}>
          <EntryCard
            title={friendItem.title}
            card={{ imageUrl: card.imageUrl, thumbUrl: card.thumbUrl }}
            size="cell"
            nowPlaying={friendItem.nowPlaying}
          />
          <Text style={styles.faceLabel}>{whose} FACE</Text>
        </View>
        <View style={styles.statsCol}>
          <StatRow label="HOURS" value={fmt(friendItem.hours)} />
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
          onPress={() => onViewContributor(card.designer!.userId)}
        >
          <Text style={styles.artist}>
            CARD ARTIST · <Text style={styles.artistName}>{card.designer.username.toUpperCase()}</Text>
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.privacyNote}>
        {friendName ? `${friendName}’s` : 'Their'} notes &amp; platforms stay private (COL-04/05) — only
        hours · status · since show.
      </Text>

      {/* actions — ADOPT THEIR CARD (if adopt-able) · ADD TO COLLECTION (if unowned) · VIEW YOUR COPY (if owned) */}
      <View style={styles.actions}>
        {galleryCard ? (
          <ScreenButton label={`Adopt ${friendName ? `${friendName}’s` : 'their'} card`} variant="primary" onPress={onAdoptTheirCard} block />
        ) : null}
        {!iOwn ? (
          <ScreenButton
            label={adding ? 'Adding…' : 'Add to collection'}
            variant={galleryCard ? 'secondary' : 'primary'}
            onPress={onAddToCollection}
            disabled={adding || added}
            block
          />
        ) : null}
      </View>

      {/* COMPARE-with-mine (single-game) — only when I own the game (ARCH A3) */}
      {iOwn && myItem ? <SingleGameCompare mine={myItem} theirs={friendItem} /> : null}

      {/* VIEW YOUR COPY (Q2) — drops `via` → the same route re-renders OWN */}
      {iOwn ? (
        <TertiaryLink label="View your copy" chevron="trailing" onPress={onViewYourCopy} />
      ) : null}
    </>
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
          <EntryCard title={mine.title} card={{ imageUrl: mine.card.imageUrl, thumbUrl: mine.card.thumbUrl, composition: mine.card.composition }} size="cell" />
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
          <EntryCard title={theirs.title} card={{ imageUrl: theirs.card.imageUrl, thumbUrl: theirs.card.thumbUrl }} size="cell" />
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

// The shared frame for the lifecycle/edge states (header + friend tag + return, no tabs yet).
function Frame({ friendName, onBack, children }: { friendName: string | undefined; onBack: () => void; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">GAME</Text>
          {friendName ? (
            <View style={styles.friendTag}>
              <Text style={styles.friendTagText}>{friendName.toUpperCase()}’S</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.retlink}>
          <TertiaryLink label="Return to collection" chevron="leading-back" onPress={onBack} />
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SCREEN_HEADER_PAD },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  friendTag: { backgroundColor: t.scr.panel, paddingHorizontal: t.space.md, paddingVertical: 3, borderWidth: 1, borderColor: t.scr.hairline },
  friendTagText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  ovf: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.dim, marginTop: -6 },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xl, gap: t.space.lg },

  gameTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 0.5 },
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

  edge: { alignItems: 'center', gap: t.space.md, paddingTop: t.space.xxl },
  edgeTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  edgeSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center' },
}));
