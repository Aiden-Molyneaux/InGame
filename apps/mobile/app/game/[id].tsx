import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CollectionItem, UpdateCollectionEntryRequest } from '@ingame/shared';
import { DualFaceHero } from '../../src/components/game/DualFaceHero';
import { PlayDossier, draftFromEntry, type PlayDraft } from '../../src/components/game/PlayDossier';
import { CardSwitcher } from '../../src/components/game/CardSwitcher';
import { CardDetailSheet } from '../../src/components/game/CardDetailSheet';
import { GameTabDock, type GameSection } from '../../src/components/game/GameTabDock';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { PulledSheet } from '../../src/components/PulledSheet';
import { ScreenButton } from '../../src/components/ScreenButton';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { theme } from '../../src/theme';
import { steppedRectPath } from '../../src/theme/steppedPath';
import {
  useGetCollectionQuery,
  useUpdateEntryMutation,
  useRemoveEntryMutation,
  useSetNowPlayingMutation,
} from '../../src/store/api';

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

  const entry = useMemo<CollectionItem | undefined>(
    () => data?.items.find((it) => it.gameId === id),
    [data, id],
  );

  const [section, setSection] = useState<GameSection>('play');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlayDraft | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [updateEntry, updateState] = useUpdateEntryMutation();
  const [removeEntry, removeState] = useRemoveEntryMutation();
  const [setNowPlaying] = useSetNowPlayingMutation();

  // Reset per-game view state when the route param changes — expo-router RE-RENDERS (does not remount)
  // a dynamic route on param change, so a mid-edit draft/section would bleed across games if a future
  // surface ever adds game→game navigation. Not reachable at M4 (only the Collection push enters here),
  // but cheap to guard now. (murr — latent cross-game state leak.)
  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setSection('play');
    setInspectOpen(false);
    setOverflowOpen(false);
    setConfirmRemove(false);
    setSaveError(null);
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

  // ── the resolved-entry screen ────────────────────────────────────────────────────────────────────
  const d = draft ?? draftFromEntry(entry);
  const patchDraft = (p: Partial<PlayDraft>) => {
    setSaveError(null); // editing clears the last save error (mirrors TextField's clear-on-type)
    setDraft((prev) => ({ ...(prev ?? draftFromEntry(entry)), ...p }));
  };

  // The stats back reflects the DRAFT live while editing, else the saved entry.
  const eff = editing
    ? {
        hours: Number.parseInt(d.hours, 10) || 0,
        percent: d.percent === '' ? null : Math.min(100, Number.parseInt(d.percent, 10) || 0),
        status: d.status,
        since: d.ownedSince.trim() || null,
      }
    : { hours: entry.hours, percent: entry.percentComplete, status: entry.status, since: entry.ownedSince };

  function startEdit() {
    setDraft(draftFromEntry(entry!));
    setEditing(true);
  }
  function cancelEdit() {
    setDraft(null);
    setEditing(false);
    setSaveError(null);
  }
  async function saveEdit() {
    // Client-guard the one field the server rejects hard: ownedSince must be YYYY-MM-DD (isoDateSchema)
    // — catch a malformed date here with a clear message instead of a silent 422.
    const since = d.ownedSince.trim();
    if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
      setSaveError('Owned since must be a date — YYYY-MM-DD (e.g. 2022-02-25).');
      return;
    }
    const body: UpdateCollectionEntryRequest = {
      hours: Number.parseInt(d.hours, 10) || 0,
      percentComplete: d.percent === '' ? null : Math.max(0, Math.min(100, Number.parseInt(d.percent, 10) || 0)),
      status: d.status,
      ...(since ? { ownedSince: since } : {}),
      ...(d.notes.trim() ? { notes: d.notes.trim() } : {}),
    };
    try {
      await updateEntry({ entryId: entry!.entryId, ...body }).unwrap();
      setDraft(null);
      setEditing(false);
      setSaveError(null);
    } catch (e) {
      // Surface the failure (mirrors the reference LogHoursSheet) instead of swallowing it — the form
      // stays open with the values preserved for a retry.
      const err = (e as { data?: { error?: { message?: string; details?: { message?: string }[] } } })?.data
        ?.error;
      setSaveError(err?.details?.[0]?.message ?? err?.message ?? "Couldn't save. Check your entries and try again.");
    }
  }
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

        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <TertiaryLink label="Return to collection" chevron="leading-back" onPress={() => router.back()} />

          {section === 'play' ? (
            <>
              <Text style={styles.heroTitle}>{entry.title}</Text>
              <Text style={styles.factsLine}>{factsLine(entry)}</Text>
              <DualFaceHero
                title={entry.title}
                hours={eff.hours}
                percent={eff.percent}
                status={eff.status}
                since={eff.since}
                artist={null}
                statsLabel={editing ? '↻ UPDATES LIVE' : 'YOUR STATS'}
                onInspect={() => setInspectOpen(true)}
              />
              <PlayDossier entry={entry} editing={editing} draft={d} onDraftChange={patchDraft} />
              {!editing ? (
                <View style={styles.actionRow}>
                  <ScreenButton label="Edit stats" variant="primary" onPress={startEdit} style={styles.mini} />
                  <ScreenButton
                    label="Switch card"
                    variant="secondary"
                    onPress={() => setSection('cards')}
                    style={styles.mini}
                  />
                  <ScreenButton label="Share" variant="secondary" disabled style={styles.mini} />
                </View>
              ) : null}
            </>
          ) : section === 'cards' ? (
            <CardSwitcher entry={entry} onEditInStyler={() => {}} onDesignNew={() => {}} />
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

        {/* the pinned EDIT save bar — DONE always reachable, just above the section dock */}
        {editing ? (
          <View style={styles.editBar}>
            {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
            <View style={styles.editBarRow}>
              <ScreenButton
                label={updateState.isLoading ? '…' : '✓ Done editing'}
                variant="primary"
                onPress={saveEdit}
                disabled={updateState.isLoading}
                style={styles.editBtn}
              />
              <ScreenButton label="Cancel" variant="secondary" onPress={cancelEdit} style={styles.editBtn} />
            </View>
          </View>
        ) : null}

        <GameTabDock
          value={section}
          onChange={(s) => {
            if (editing) cancelEdit();
            setSection(s);
          }}
        />
      </View>

      {/* overlays — mounted at the screen root (PulledSheet contract) */}
      <CardDetailSheet visible={inspectOpen} entry={entry} onClose={() => setInspectOpen(false)} />

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
  return (
    <View style={styles.errWrap}>
      <View style={styles.errCard}>
        <Svg width={96} height={134} style={StyleSheet.absoluteFill}>
          <Path
            d={steppedRectPath(96, 134, theme.step / 2, { tl: true, br: true })}
            fill={theme.scr.panel}
            stroke={theme.scr.faint}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: theme.scr.bg },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  title: { fontFamily: theme.font.screenBold, fontSize: theme.type.display, color: theme.scr.ink, letterSpacing: 1.5 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  nowTag: { backgroundColor: theme.scr.accent, paddingHorizontal: theme.space.md, paddingVertical: 3 },
  nowTagText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.accentInk, letterSpacing: 0.5 },
  ovf: { fontFamily: theme.font.screenBold, fontSize: theme.type.display, color: theme.scr.dim, marginTop: -6 },
  body: { paddingHorizontal: theme.space.lg, paddingBottom: theme.space.xl, gap: theme.space.lg },
  heroTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.display, color: theme.scr.ink, textAlign: 'center', letterSpacing: 0.5 },
  factsLine: {
    fontFamily: theme.font.screenSemi,
    fontSize: theme.type.body,
    color: theme.scr.dim,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: -theme.space.sm,
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  mini: { paddingVertical: theme.space.md, paddingHorizontal: theme.space.lg },
  editBar: {
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    backgroundColor: theme.scr.panel,
    borderTopWidth: 1,
    borderTopColor: theme.scr.hairline,
  },
  editBarRow: { flexDirection: 'row', gap: theme.space.md },
  editBtn: { flex: 1 },
  saveError: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.brand.alert },
  about: { padding: theme.space.lg, backgroundColor: theme.scr.panel, borderWidth: 1, borderColor: theme.scr.hairline, gap: theme.space.sm },
  aboutTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 1 },
  aboutSub: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim, lineHeight: 16 },
  notOwned: { alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space.xxl },
  notOwnedTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 1 },
  notOwnedSub: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim, textAlign: 'center', lineHeight: 16 },
  // skeleton
  skBar: { backgroundColor: theme.scr.panel },
  skDual: { flexDirection: 'row', justifyContent: 'center', gap: theme.space.lg, paddingVertical: theme.space.md },
  skCard: { width: 138, height: 193, backgroundColor: theme.scr.panel },
  // load error
  errWrap: { alignItems: 'center', gap: theme.space.md, paddingTop: theme.space.xxl },
  errCard: { width: 96, height: 134, alignItems: 'center', justifyContent: 'center', marginBottom: theme.space.sm },
  errBang: { fontFamily: theme.font.screenBold, fontSize: theme.type.display, color: theme.scr.accent },
  errEyebrow: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 2 },
  errTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 1.5 },
  errSub: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim, textAlign: 'center', lineHeight: 16, maxWidth: 260 },
});
