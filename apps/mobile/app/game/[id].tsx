import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CollectionItem, GalleryCardView } from '@ingame/shared';
import { parseComposition } from '../../src/components/CardFace';
import { DualFaceHero } from '../../src/components/game/DualFaceHero';
import { PlayDossier } from '../../src/components/game/PlayDossier';
import { CardSwitcher } from '../../src/components/game/CardSwitcher';
import { CardDetailSheet } from '../../src/components/game/CardDetailSheet';
import { CommunityGallery } from '../../src/components/game/CommunityGallery';
import { AdoptCardSheet, type AdoptOutcome } from '../../src/components/game/AdoptCardSheet';
import { GameTabDock, type GameSection } from '../../src/components/game/GameTabDock';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { PulledSheet } from '../../src/components/PulledSheet';
import { ScreenButton } from '../../src/components/ScreenButton';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { Toast } from '../../src/components/lifecycle/Toast';
// shareCard rides src/store/ beside mockReceipt.ts (the non-slice helper precedent) — also a Metro
// constraint: the standing :8082 watcher does not see a BRAND-NEW top-level src/ directory without a
// restart (observed 2026-07-13; new files in existing dirs resolve fine — qa-runbook candidate).
import { presentShareImage } from '../../src/store/shareCard';
import { theme, themedStyles, useTheme } from '../../src/theme';
import { steppedRectPath } from '../../src/theme/steppedPath';
import {
  useGetCollectionQuery,
  useRemoveEntryMutation,
  useSetNowPlayingMutation,
  useDeleteCardMutation,
} from '../../src/store/api';
import {
  useAdoptCardMutation,
  useBlockUserMutation,
  useLazyGetShareImageQuery,
} from '../../src/store/communityApi';

// Game page hub shell (§3.1 · design-spec §2.4b / §4.2) — the CARD-23 NAVIGATE target + the
// M3-deferred per-game host. A root-level Stack screen inside the persistent DeviceShell (like
// add-game), NavBand stays COLLECTION-active (ShellNav). M4 scope: PLAY (dual-face hero + dossier),
// EDIT-STATS (the dossier→form, COL-02/03/05 + WTP-03 now-playing + COL-01 remove), CARDS (the
// switcher over your own cards — default-card-limited per OQ-133), CardDetail INSPECT (CARD-23), and
// L1/L2 lifecycle. Owned states source catalog facts from the collection entry (GET /catalog/games/:id
// is unbuilt); board-state M4 gallery/adopt + M5 ABOUT + M6/M7/M8 are EXPECTED. Route key = gameId.
export default function GamePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetCollectionQuery();
  const styles = useStyles();

  const entry = useMemo<CollectionItem | undefined>(
    () => data?.items.find((it) => it.gameId === id),
    [data, id],
  );
  // The equipped design renders LIVE from its composition (0066; null → the CARD-18 default face).
  const equippedComposition = useMemo(
    () => parseComposition(entry?.card.composition),
    [entry?.card.composition],
  );

  const [section, setSection] = useState<GameSection>('play');
  const [inspectOpen, setInspectOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
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

  const [removeEntry, removeState] = useRemoveEntryMutation();
  const [setNowPlaying] = useSetNowPlayingMutation();
  const [deleteCard, deleteCardState] = useDeleteCardMutation();
  const [adoptCard, adoptState] = useAdoptCardMutation();
  const [blockUser, blockState] = useBlockUserMutation();
  const [fetchShareImage, shareState] = useLazyGetShareImageQuery();

  // Reset per-game view state when the route param changes — expo-router RE-RENDERS (does not remount)
  // a dynamic route on param change, so a mid-edit draft/section would bleed across games if a future
  // surface ever adds game→game navigation. Not reachable at M4 (only the Collection push enters here),
  // but cheap to guard now. (murr — latent cross-game state leak.)
  useEffect(() => {
    setSection('play');
    setInspectOpen(false);
    setOverflowOpen(false);
    setConfirmRemove(false);
    setConfirmDeleteCard(null);
    setDeleteCardError(null);
    setInspectCard(null);
    setBlockCard(null);
    setToast(null);
  }, [id]);

  // ── lifecycle (L1 · L2) ────────────────────────────────────────────────────────────────────────
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
  if (!entry) {
    // Not in your collection → the neutral / not-owned Game page is board-state M6 (EXPECTED).
    return (
      <Frame onBack={() => router.back()}>
        <View style={styles.notOwned}>
          <Text style={styles.notOwnedTitle}>NOT IN YOUR COLLECTION</Text>
          <Text style={styles.notOwnedSub}>
            The not-owned Game page (catalog facts · ADD · friends-who-own) arrives in a later milestone.
          </Text>
          <TertiaryLink label="Return to collection" chevron="leading-back" onPress={() => router.back()} />
        </View>
      </Frame>
    );
  }

  // ── the resolved-entry screen (stats edit PER-ROW inside PlayDossier — gate-5 B.8) ─────────────
  async function toggleNowPlaying() {
    setOverflowOpen(false);
    try {
      await setNowPlaying({ gameId: entry!.nowPlaying ? null : entry!.gameId }).unwrap();
    } catch {
      /* invalidation refetches; a failure just leaves the pin unchanged */
    }
  }
  async function doRemove() {
    try {
      await removeEntry(entry!.entryId).unwrap();
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
  // Entitlements (the global CurrencyCounter ticks) + CommunityCards (the gallery re-reads).
  function onAdopted(result: { totalPaid: number }, card: GalleryCardView) {
    setInspectCard(null);
    setToast({
      tone: 'success',
      message:
        result.totalPaid > 0
          ? `Adopted — "${card.name}" is yours. ${result.totalPaid} PX spent · it's in your switcher.`
          : `Adopted — "${card.name}" is yours · it's in your switcher.`,
    });
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

  // ── P8 share (CARD-21) — fetch the branded PNG (authenticated) and present it (web opens/saves;
  // native best-effort). A not-published / moderation-hidden card → a quiet "unavailable".
  async function shareCard(cardId: string, title: string) {
    try {
      const blob = await fetchShareImage(cardId).unwrap();
      const res = await presentShareImage(blob, title);
      if (res === 'unavailable') {
        setToast({ tone: 'error', message: 'Sharing isn’t available for this card yet.' });
      }
    } catch {
      setToast({ tone: 'error', message: 'This card can’t be shared yet.' });
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

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets // the NOTES editor must not hide behind the keyboard (B.6)
        >
          <TertiaryLink label="Return to collection" chevron="leading-back" onPress={() => router.back()} />

          {section === 'play' ? (
            <>
              {/* title · facts · hero as one tight group (gate-5 B.5) */}
              <View style={styles.heroGroup}>
                <Text style={styles.heroTitle}>{entry.title}</Text>
                <Text style={styles.factsLine}>{factsLine(entry)}</Text>
                <DualFaceHero
                  title={entry.title}
                  composition={equippedComposition}
                  hours={entry.hours}
                  percent={entry.percentComplete}
                  status={entry.status}
                  since={entry.ownedSince}
                  artist={entry.card.isCustom ? 'YOU' : null}
                  onInspect={() => setInspectOpen(true)}
                />
              </View>
              <PlayDossier entry={entry} />
              <View style={styles.actionRow}>
                <ScreenButton
                  label="Switch card"
                  variant="secondary"
                  onPress={() => setSection('cards')}
                  style={styles.mini}
                />
                <ScreenButton
                  label="Share"
                  variant="secondary"
                  onPress={() => void shareCard(entry.card.id, entry.title)}
                  disabled={shareState.isFetching}
                  style={styles.mini}
                />
              </View>
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
              />
              {/* P8 — the community gallery (other users' published cards for this game) → adopt */}
              <CommunityGallery
                gameId={entry.gameId}
                onInspect={setInspectCard}
                onDesignACard={() => router.push(`/styler/${entry.gameId}`)}
              />
            </>
          ) : (
            <View style={styles.about}>
              <Text style={styles.aboutTitle}>ABOUT</Text>
              <Text style={styles.aboutSub}>
                Catalog facts · community presence · friends-who-own arrive in M5 (needs the game-detail
                read + CAT-09).
              </Text>
            </View>
          )}
        </ScrollView>

        <GameTabDock value={section} onChange={setSection} />
      </View>

      {/* overlays — mounted at the screen root (PulledSheet contract) */}
      <CardDetailSheet
        visible={inspectOpen}
        entry={entry}
        composition={equippedComposition}
        onClose={() => setInspectOpen(false)}
        onShare={entry.card.isCustom ? () => void shareCard(entry.card.id, entry.title) : undefined}
        shareBusy={shareState.isFetching}
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
        shareBusy={shareState.isFetching}
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
        <ScrollView style={styles.flex} contentContainerStyle={styles.body}>
          <TertiaryLink label="Return to collection" chevron="leading-back" onPress={onBack} />
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
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.lg,
    paddingBottom: t.space.sm,
  },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
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
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  mini: { paddingVertical: t.space.md, paddingHorizontal: t.space.lg },
  about: { padding: t.space.lg, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline, gap: t.space.sm },
  aboutTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  aboutSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16 },
  notOwned: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.xxl },
  notOwnedTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  notOwnedSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16 },
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
