import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CollectionItem, GalleryCardView } from '@ingame/shared';
import { parseComposition } from '../../src/components/CardFace';
import { cardArtist } from '../../src/components/cardArtist';
import { DualFaceHero } from '../../src/components/game/DualFaceHero';
import { PlayDossier } from '../../src/components/game/PlayDossier';
import { CardSwitcher } from '../../src/components/game/CardSwitcher';
import { CardDetailSheet } from '../../src/components/game/CardDetailSheet';
import { CommunityGallery } from '../../src/components/game/CommunityGallery';
import { AboutTab } from '../../src/components/game/AboutTab';
import { FriendGamePage } from '../../src/components/game/FriendGamePage';
import { CatalogGamePage } from '../../src/components/game/CatalogGamePage';
import { AdoptCardSheet, type AdoptOutcome } from '../../src/components/game/AdoptCardSheet';
import { ReportSheet, type ReportTarget, type ReportActionOutcome } from '../../src/components/report/ReportSheet';
import { GameTabDock, type GameSection } from '../../src/components/game/GameTabDock';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { PulledSheet } from '../../src/components/PulledSheet';
import { ScreenButton } from '../../src/components/ScreenButton';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { Toast } from '../../src/components/lifecycle/Toast';
import { useSheetLocked } from '../../src/components/SheetLock';
// shareCard rides src/store/ beside mockReceipt.ts (the non-slice helper precedent) — also a Metro
// constraint: the standing :8082 watcher does not see a BRAND-NEW top-level src/ directory without a
// restart (observed 2026-07-13; new files in existing dirs resolve fine — qa-runbook candidate).
import { shareCardImage } from '../../src/store/shareCard';
import { theme, themedStyles, useTheme } from '../../src/theme';
import { steppedRectPath } from '../../src/theme/steppedPath';
import {
  useGetCollectionQuery,
  useGetWalletQuery,
  useRemoveEntryMutation,
  useSetNowPlayingMutation,
  useDeleteCardMutation,
} from '../../src/store/api';
import {
  useAdoptCardMutation,
  useBlockUserMutation,
} from '../../src/store/communityApi';
import { useSubmitReportMutation, type CreateReportRequest } from '../../src/store/reportApi';
import { useAppSelector } from '../../src/store/hooks';
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../../src/components/ScreenHead';

// GamePage — the W-D1 posture RESOLVER (§3.1 · design-spec §2.4b / §4.2). ONE route `/game/[id]` adapts
// by DATA + one param (never separate routes), so every entry point resolves the same way and the page
// upgrades in place (add from CATALOG → re-renders OWN at the same URL):
//   • `?via=<friendUserId>` present   → FRIEND (a friend's shelf / compare / now-playing; Q2 FRIEND WINS
//                                       even when you also own it — a VIEW YOUR COPY link swaps to OWN)
//   • else an entry in /me/collection → OWN (today's full page — the CARD-23 NAVIGATE target, unchanged)
//   • else                            → CATALOG (unowned, no friend context — ABOUT default, PLAY locked)
// The collection read + L1/L2 lifecycle run BEFORE the posture branch (F-16 — every hook unconditional,
// no early-return desync); each posture body is its OWN component owning its own hooks. OWN is held
// byte-faithful (a refactor-around, not a rewrite) apart from its ABOUT tab going live (W-C5 fill).
export default function GamePage() {
  const { id, via } = useLocalSearchParams<{ id: string; via?: string }>();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetCollectionQuery();

  // ── lifecycle (L1 · L2) — gated on /me/collection, the OWN check + the compare source ──────────────
  if (isLoading) {
    return (
      <Frame onBack={() => router.back()}>
        <GameSkeleton />
      </Frame>
    );
  }
  if (isError || !data) {
    return (
      <Frame onBack={() => router.back()}>
        <GameLoadError onRetry={() => void refetch()} onBack={() => router.back()} />
      </Frame>
    );
  }

  const entry = data.items.find((it) => it.gameId === id);
  // Q2 — `via` present AND `entry` exists → FRIEND WINS (you navigated to see THEIRS). VIEW YOUR COPY
  // inside FriendGamePage drops `via` (router.replace) → this re-renders OWN at the same URL.
  if (via) return <FriendGamePage gameId={id} via={via} myEntry={entry} />;
  if (entry) return <OwnGamePage entry={entry} />;
  return <CatalogGamePage gameId={id} />;
}

// ── OWN posture — today's full page (dual-face hero + dossier · switcher + community gallery · ABOUT) ──
// entry is guaranteed defined (the resolver branch); every OWN hook lives HERE and runs unconditionally.
function OwnGamePage({ entry }: { entry: CollectionItem }) {
  const router = useRouter();
  // the wallet balance feeds the adopt sheet's BuyBar meta + its pre-emptive NOT-ENOUGH state (M5 F-9 G3).
  const { data: wallet } = useGetWalletQuery();
  const styles = useStyles();
  const bgLocked = useSheetLocked(); // C2 (F-13) — freeze the page scroll while the inspect/adopt sheet is open

  // The equipped design renders LIVE from its composition (0066; null → the CARD-18 default face).
  const equippedComposition = useMemo(
    () => parseComposition(entry.card.composition),
    [entry.card.composition],
  );

  const [section, setSection] = useState<GameSection>('play');
  const [inspectOpen, setInspectOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  // Owner walk (m6) — the wiki-edit trigger is RELOCATED into the ⋯ overflow ("Edit catalog details").
  // The page owns the mode; the overflow turns it on and AboutTab reflects it (CAT-13 controlled entry).
  const [editingCatalog, setEditingCatalog] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  // the switcher's card-delete confirm lives HERE — a sheet mounted inside the ScrollView docks to
  // the switcher's box, not the screen bottom (PulledSheet's screen-root contract; gate-5 D.27)
  // `adopted` varies the confirm copy: an owned design DELETES; an adopted card only REMOVES the
  // caller's copy (un-adopt, F-2b — the design/gallery/count are untouched, and it can be re-adopted).
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<{ id: string; name: string; adopted: boolean } | null>(null);
  const [deleteCardError, setDeleteCardError] = useState<string | null>(null);
  // ── P8 community gallery / adopt / share / block ────────────────────────────────────────────────
  const [inspectCard, setInspectCard] = useState<GalleryCardView | null>(null); // the community card in the adopt sheet
  const [blockCard, setBlockCard] = useState<GalleryCardView | null>(null); // the SOC-09-light block confirm
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  // P12 — the MOD-01 ReportSheet target (card = the community card ⋯ menu · game = the overflow REPORT row).
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [submitReport, reportState] = useSubmitReportMutation();

  const [removeEntry, removeState] = useRemoveEntryMutation();
  const [setNowPlaying] = useSetNowPlayingMutation();
  const [deleteCard, deleteCardState] = useDeleteCardMutation();
  const [adoptCard, adoptState] = useAdoptCardMutation();
  const [blockUser, blockState] = useBlockUserMutation();
  // Share bytes are fetched off-store (round-2 bug 6): the access token rides to `shareCardImage` and
  // a plain local busy flag drives the button state (no RTK query cache holds the Blob).
  const shareToken = useAppSelector((s) => s.auth.accessToken);
  const [shareBusy, setShareBusy] = useState(false);

  // Reset per-game view state when the game changes — expo-router RE-RENDERS (does not remount) a dynamic
  // route on param change, so a mid-edit draft/section would bleed across games if a future surface adds
  // game→game navigation while STAYING in OWN posture (a posture change unmounts this component instead).
  // Cheap to guard. (murr — latent cross-game state leak.)
  useEffect(() => {
    setSection('play');
    setInspectOpen(false);
    setOverflowOpen(false);
    setEditingCatalog(false);
    setConfirmRemove(false);
    setConfirmDeleteCard(null);
    setDeleteCardError(null);
    setInspectCard(null);
    setBlockCard(null);
    setToast(null);
  }, [entry.gameId]);

  // ── the resolved-entry screen (stats edit PER-ROW inside PlayDossier — gate-5 B.8) ─────────────
  async function toggleNowPlaying() {
    setOverflowOpen(false);
    try {
      await setNowPlaying({ gameId: entry.nowPlaying ? null : entry.gameId }).unwrap();
    } catch {
      /* invalidation refetches; a failure just leaves the pin unchanged */
    }
  }
  async function doRemove() {
    try {
      await removeEntry(entry.entryId).unwrap();
      router.back();
    } catch {
      setConfirmRemove(false);
    }
  }
  async function doDeleteCard() {
    if (!confirmDeleteCard) return;
    setDeleteCardError(null);
    try {
      await deleteCard(confirmDeleteCard.id).unwrap();
      setConfirmDeleteCard(null);
    } catch (e) {
      setConfirmDeleteCard(null);
      const err = (e as { data?: { error?: { message?: string } } })?.data?.error;
      setDeleteCardError(err?.message ?? 'Could not delete it.');
    }
  }

  // ── P8 adopt (0072) — map the RTK error surface to the sheet's AdoptOutcome ─────────────────────
  async function onAdopt(): Promise<AdoptOutcome> {
    if (!inspectCard) return { ok: false, code: 'ERROR' };
    try {
      const result = await adoptCard(inspectCard.id).unwrap();
      return { ok: true, result };
    } catch (e) {
      const err = e as { status?: unknown; data?: { error?: { code?: string; shortBy?: number } } };
      if (err?.status === 'FETCH_ERROR' || err?.status === 'TIMEOUT_ERROR') {
        return { ok: false, code: 'OFFLINE' }; // adopt is online-only (0073 §0.10)
      }
      const code = err?.data?.error?.code;
      if (code === 'INSUFFICIENT_BALANCE') {
        return { ok: false, code: 'INSUFFICIENT_BALANCE', shortBy: err?.data?.error?.shortBy ?? 0 };
      }
      if (code === 'ALREADY_ADOPTED') return { ok: false, code: 'ALREADY_ADOPTED' };
      if (code === 'NOT_PUBLISHED') return { ok: false, code: 'NOT_PUBLISHED' };
      return { ok: false, code: 'ERROR' };
    }
  }
  // Success — the mutation already invalidated Cards/Collection (the switcher refetches) + Wallet/Ledger/
  // Entitlements (the global CurrencyCounter ticks) + CommunityCards (the gallery re-reads). M5 F-9 G5:
  // NO toast + NO close — the sheet acknowledges IN PLACE (the settle beat + AcquireBeat), and its Done
  // door closes it. This just lets the invalidation ride (the args are unused but keep the contract).
  function onAdopted(_result: { totalPaid: number }, _card: GalleryCardView) {
    // intentionally empty — the in-place settle is the acknowledgement (G5).
  }

  async function doBlock() {
    if (!blockCard) return;
    const designer = blockCard.designer.username;
    try {
      await blockUser(blockCard.designer.userId).unwrap();
      setToast({ tone: 'success', message: `${designer}'s cards are hidden from your community views.` });
      setInspectCard(null); // the gallery refetches (CommunityCards invalidated) — their cards vanish
    } catch {
      // GAP: POST /me/blocks is not yet registered server-side (gallery-manifest) — surface it honestly.
      setToast({ tone: 'error', message: `Couldn't block ${designer} right now. Please try again.` });
    }
    setBlockCard(null);
  }

  // ── P12 report (MOD-01) — SEAM(P7): POST /reports 404s until the server capture lands. Map the RTK
  // error surface to the ReportSheet's outcome (offline vs a genuine failure → the B3 Toast). ───────────
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

  // ── P8 share (CARD-21) — fetch the branded PNG (authenticated) and present it (web opens/saves;
  // native best-effort). A not-published / moderation-hidden card → a quiet "unavailable".
  async function shareCard(cardId: string, title: string) {
    setShareBusy(true);
    try {
      const res = await shareCardImage(cardId, title, shareToken);
      if (res === 'unavailable') {
        setToast({ tone: 'error', message: 'Sharing isn’t available for this card yet.' });
      }
    } catch {
      setToast({ tone: 'error', message: 'This card can’t be shared yet.' });
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        {/* ScreenHead: GAME + the ▸ NOW PLAYING tag (when pinned) + the ⋯ overflow (WTP-03 / COL-01) */}
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            GAME
          </Text>
          <View style={styles.headRight}>
            {entry.nowPlaying ? (
              <View style={styles.nowTag}>
                <Text style={styles.nowTagText}>▸ NOW PLAYING</Text>
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

        {/* W-B2 — the return seam is a FIXED row above the scroll (the app-wide seam grammar). */}
        <View style={styles.retlink}>
          <TertiaryLink label="Return to collection" chevron="leading-back" onPress={() => router.back()} />
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets // the NOTES editor must not hide behind the keyboard (B.6)
          showsVerticalScrollIndicator={false}
          scrollEnabled={!bgLocked}
        >
          {section === 'play' ? (
            <>
              {/* title · facts · hero as one tight group (gate-5 B.5) */}
              <View style={styles.heroGroup}>
                <Text style={styles.heroTitle}>{entry.title}</Text>
                <Text style={styles.factsLine}>{factsLine(entry)}</Text>
                <DualFaceHero
                  title={entry.title}
                  composition={equippedComposition}
                  imageUrl={entry.card.imageUrl}
                  thumbUrl={entry.card.thumbUrl}
                  hours={entry.hours}
                  percent={entry.percentComplete}
                  status={entry.status}
                  since={entry.ownedSince}
                  // W-A1 — the shared derivation: an adopted card attributes its DESIGNER, never YOU.
                  artist={cardArtist(entry.card)}
                  onInspect={() => setInspectOpen(true)}
                />
              </View>
              <PlayDossier entry={entry} />
              {/* round-5 N-B9 — the SWITCH CARD button is retired (the CARDS dock tab is the door) and
                  SHARE moved into the CARDS tab as a per-card action (any card, not just the equipped). */}
            </>
          ) : section === 'cards' ? (
            <>
              <CardSwitcher
                entry={entry}
                onEditInStyler={(cardId) => router.push(`/styler/${entry.gameId}?cardId=${cardId}`)}
                onDesignNew={() => router.push(`/styler/${entry.gameId}`)}
                onRequestDelete={(id, name, adopted) => setConfirmDeleteCard({ id, name, adopted: adopted ?? false })}
                deleteError={deleteCardError}
                onClearDeleteError={() => setDeleteCardError(null)}
                // N-B9 — SHARE rides each card's action panel now (CARD-21; publish-gated in the switcher)
                onShare={(cardId, name) => void shareCard(cardId, name)}
                shareBusy={shareBusy}
              />
              {/* P8 — the community gallery (other users' published cards for this game) → adopt */}
              <CommunityGallery
                gameId={entry.gameId}
                onInspect={setInspectCard}
                onDesignACard={() => router.push(`/styler/${entry.gameId}`)}
                onViewDesigner={(userId) => router.push(`/contributor/${userId}`)}
              />
            </>
          ) : (
            /* W-D1 / W-C5 — ABOUT now renders the game-detail fill (facts · genres · studio · CAT-05
               contributor · CAT-09 presence · CAT-09c friends-who-own), shared with FRIEND + CATALOG. */
            <AboutTab
              gameId={entry.gameId}
              onViewContributor={(userId) => router.push(`/contributor/${userId}`)}
              onOpenUser={(userId) => router.push(`/user/${userId}`)}
              editing={editingCatalog}
              onEditingChange={setEditingCatalog}
            />
          )}
        </ScrollView>

        <GameTabDock
          value={section}
          onChange={(s) => {
            // leaving ABOUT ends an in-progress catalog edit (the mode is ABOUT-scoped)
            if (s !== 'about') setEditingCatalog(false);
            setSection(s);
          }}
        />
      </View>

      {/* overlays — mounted at the screen root (PulledSheet contract) */}
      <CardDetailSheet
        visible={inspectOpen}
        entry={entry}
        composition={equippedComposition}
        onClose={() => setInspectOpen(false)}
        onShare={entry.card.isCustom ? () => void shareCard(entry.card.id, entry.title) : undefined}
        shareBusy={shareBusy}
        onEdit={
          entry.card.isCustom
            ? () => {
                setInspectOpen(false);
                router.push(`/styler/${entry.gameId}?cardId=${entry.card.id}`);
              }
            : undefined
        }
      />

      <PulledSheet visible={overflowOpen} onClose={() => setOverflowOpen(false)} title="Game options">
        <ScreenButton
          label={entry.nowPlaying ? 'Clear now playing' : 'Set as now playing'}
          variant="secondary"
          onPress={toggleNowPlaying}
          block
        />
        {/* Owner walk (m6) — the wiki EDIT entry, relocated off the ABOUT facts block into the overflow.
            Turns on ABOUT + edit mode (AboutTab shows the per-field rows + the accuracy disclaimer). */}
        <ScreenButton
          label="Edit catalog details"
          variant="secondary"
          onPress={() => {
            setOverflowOpen(false);
            setSection('about');
            setEditingCatalog(true);
          }}
          block
        />
        <ScreenButton
          label="Report this game"
          variant="secondary"
          onPress={() => {
            setOverflowOpen(false);
            setReportTarget({ type: 'game', id: entry.gameId, name: entry.title });
          }}
          block
        />
        <ScreenButton
          label="Remove from collection"
          variant="destructive"
          onPress={() => {
            setOverflowOpen(false);
            setConfirmRemove(true);
          }}
          block
        />
      </PulledSheet>

      <ConfirmSheet
        visible={confirmRemove}
        title="Remove from collection?"
        message={`"${entry.title}" and your play stats for it will be removed from your collection. You can add it again from the catalog.`}
        confirmLabel="Remove"
        busy={removeState.isLoading}
        onConfirm={doRemove}
        onClose={() => setConfirmRemove(false)}
      />

      {/* the switcher's card delete / adopted-copy remove — at the screen root so it docks to the
          in-app bottom (D.27). Un-adopt copy is honest: only YOUR copy goes; re-adopting brings it back. */}
      <ConfirmSheet
        visible={confirmDeleteCard !== null}
        title={confirmDeleteCard?.adopted ? 'Remove this adopted card?' : 'Delete this card?'}
        message={
          confirmDeleteCard?.adopted
            ? `"${confirmDeleteCard?.name ?? ''}" leaves your switcher — the designer's card and its adoption count aren't touched. You can adopt it again any time.`
            : `"${confirmDeleteCard?.name ?? ''}" is deleted everywhere — the switcher and your designs shelf. This can't be undone.`
        }
        confirmLabel={confirmDeleteCard?.adopted ? 'Remove' : 'Delete'}
        busy={deleteCardState.isLoading}
        onConfirm={() => void doDeleteCard()}
        onClose={() => setConfirmDeleteCard(null)}
      />

      {/* P8 — the community card inspect / adopt sheet (SOC-11 atomic adopt) */}
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
            setInspectCard(null); // close the adopt sheet before raising the report drawer (one drawer)
            setReportTarget({ type: 'card', id: c.id, name: c.name });
          }
        }}
        onViewContributor={(userId) => {
          setInspectCard(null); // close the sheet before navigating (PulledSheet contract)
          router.push(`/contributor/${userId}`);
        }}
        shareBusy={shareBusy}
      />

      {/* P8 — block-the-designer (SOC-09-light, decision 0073 §0.6): destructive confirm at the root */}
      <ConfirmSheet
        visible={blockCard !== null}
        title={`Block ${blockCard?.designer.username ?? ''}?`}
        message={`Their cards leave your community views. This doesn't remove a card you already adopted — your copy stays.`}
        confirmLabel="Block"
        busy={blockState.isLoading}
        onConfirm={() => void doBlock()}
        onClose={() => setBlockCard(null)}
      />

      {/* P12 — the MOD-01 ReportSheet (card + game targets on this page; user targets ride P8/P9). SEAM(P7):
          the submit 404s until the server capture lands — a failure surfaces the B3 Toast, safe to retry. */}
      <ReportSheet
        visible={reportTarget !== null}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={onSubmitReport}
        submitting={reportState.isLoading}
        onError={(message) => setToast({ tone: 'error', message })}
      />

      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      ) : null}
    </View>
  );
}

function factsLine(entry: CollectionItem): string {
  return [entry.developer, entry.releaseYear, entry.genres[0]?.name]
    .filter((x) => x != null && x !== '')
    .join(' · ')
    .toUpperCase();
}

// ── the shared frame for the lifecycle/edge states (header + return, no data yet) ──────────────────
function Frame({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            GAME
          </Text>
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

// L1 — the §1.6 Skeleton: solid scr.panel fills in the exact PLAY shapes (never dashed).
function GameSkeleton() {
  const styles = useStyles();
  return (
    <View style={{ gap: theme.space.lg }} accessibilityLabel="Loading">
      <View style={[styles.skBar, { height: 21, width: '46%', alignSelf: 'center' }]} />
      <View style={[styles.skBar, { height: 11, width: '64%', alignSelf: 'center' }]} />
      <View style={styles.skDual}>
        <View style={styles.skCard} />
        <View style={styles.skCard} />
      </View>
      <View style={{ gap: theme.space.sm }}>
        <View style={[styles.skBar, { height: 11, width: '80%' }]} />
        <View style={[styles.skBar, { height: 11, width: '90%' }]} />
        <View style={[styles.skBar, { height: 11, width: '70%' }]} />
      </View>
    </View>
  );
}

// L2 — the §1.8 LoadError: dashed stepped card + accent ! + SIGNAL LOST + orange RETRY + GO BACK.
function GameLoadError({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.errWrap}>
      <View style={styles.errCard}>
        <Svg width={96} height={134} style={StyleSheet.absoluteFill}>
          <Path
            d={steppedRectPath(96, 134, theme.step / 2, { tl: true, br: true })}
            fill={t.scr.panel}
            stroke={t.scr.faint}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        </Svg>
        <Text style={styles.errBang}>!</Text>
      </View>
      <Text style={styles.errEyebrow}>COULDN'T LOAD THIS GAME</Text>
      <Text style={styles.errTitle}>SIGNAL LOST</Text>
      <Text style={styles.errSub}>
        We couldn't reach your collection. Check your connection and try again.
      </Text>
      <ScreenButton label="Retry" variant="primary" onPress={onRetry} />
      <TertiaryLink label="Go back" chevron="leading-back" dim onPress={onBack} />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SCREEN_HEADER_PAD, // W-B1 — was bottom sm
  },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  retlink: { ...RETURN_SEAM_PAD }, // W-B2 — the shared seam geometry
  headRight: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  nowTag: { backgroundColor: t.scr.accent, paddingHorizontal: t.space.md, paddingVertical: 3 },
  nowTagText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk, letterSpacing: 0.5 },
  ovf: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.dim, marginTop: -6 },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xl, gap: t.space.lg },
  heroGroup: { gap: t.space.xs }, // title · facts · dual-face read as one unit (gate-5 B.5)
  heroTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, textAlign: 'center', letterSpacing: 0.5 },
  factsLine: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.body,
    color: t.scr.dim,
    textAlign: 'center',
    letterSpacing: 1,
  },
  // skeleton
  skBar: { backgroundColor: t.scr.panel },
  skDual: { flexDirection: 'row', justifyContent: 'center', gap: t.space.lg, paddingVertical: t.space.md },
  skCard: { width: 138, height: 193, backgroundColor: t.scr.panel },
  // load error
  errWrap: { alignItems: 'center', gap: t.space.md, paddingTop: t.space.xxl },
  errCard: { width: 96, height: 134, alignItems: 'center', justifyContent: 'center', marginBottom: t.space.sm },
  errBang: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.accent },
  errEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  errTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1.5 },
  errSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, maxWidth: 260 },
}));
