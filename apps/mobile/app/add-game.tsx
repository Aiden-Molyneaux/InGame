import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import type {
  CatalogItem,
  CollectionItem,
  CollectionStatus,
  DedupSuggestion,
  GalleryCardView,
} from '@ingame/shared';
import { GameCard } from '../src/components/GameCard';
import { CardFan } from '../src/components/CardFan';
import { ScreenButton } from '../src/components/ScreenButton';
import { SearchField } from '../src/components/SearchField';
import { KeyboardLift } from '../src/components/KeyboardLift';
import { TextField } from '../src/components/TextField';
import { GenreTag } from '../src/components/GenreTag';
import { InlineBanner } from '../src/components/InlineBanner';
import { CommunityGallery } from '../src/components/game/CommunityGallery';
import { AdoptCardSheet, type AdoptOutcome } from '../src/components/game/AdoptCardSheet';
import { TertiaryLink } from '../src/components/TertiaryLink';

import { COLLECTION_STATUSES, STATUS_LABEL } from '../src/constants/collection';
import { theme, themedStyles } from '../src/theme';
import { HEADER_SEAM_GAP } from '../src/components/ScreenHead';
import {
  useGetGenresQuery,
  useGetPopularQuery,
  useGetWalletQuery,
  useLazySearchCatalogQuery,
  useCreateGameMutation,
  useAddToCollectionMutation,
  useUpdateEntryMutation,
} from '../src/store/api';
// walk2 N2b — the CAT-11 / CAT-12 pre-query rails (own slice, never api.ts).
import { useGetNewReleasesQuery, useGetFriendsActiveQuery } from '../src/store/catalogRailsApi';
// W-D Wave D (OQ-136) — the community-cards ADOPT step reuses the M5 gallery + adopt seams.
import { useGetGameGalleryQuery, useAdoptCardMutation } from '../src/store/communityApi';

// ADD GAME (§2.4, the §4.3 boards) — a FlowTakeover entered from the Collection's gold ADD.
// Search (CAT-01, bottom-docked field · never-blank POPULAR rail pre-query) → a tap-focused card
// fan with the focused card's meta + CAT-09 presence line + CAT-05 credit + gold ADD → the COL-02
// status beat. NONE OF THESE → create (CAT-02) with the CAT-03 InlineBanner dedup warn (409
// suggestions · CREATE ANYWAY = dedupOverride; an exact match never overrides). Per-field 422
// details render under their inputs (B1/W4). The full celebration/report beats ride their milestones.
//
// W-D Wave D (OQ-136 / W-C10), REORDERED at the m6 owner walk: after the add creates the collection
// ENTRY, the flow reads stats → the COL-02 STATUS BEAT → the card FORK ("adopt a card or design your
// own"): a TOP-6-by-adoption strip (adopt via the M5 AdoptCardSheet — `adoptCard(cardId)` GRANTS the
// design to the adopter's library and is ENTRY-INDEPENDENT: it does NOT equip the just-created entry —
// equipping a design onto an entry is a separate switcher action) · SEE ALL {N} › (the paged full
// list) · DESIGN YOUR OWN › (the Styler) · keep-the-default (tertiary). An empty/errored gallery renders the fork WITHOUT the strip
// (design + keep-default stand) — the old silent auto-advance is retired.

const SEARCH_DEBOUNCE_MS = 350;

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: { path: string; message: string }[];
    suggestions?: DedupSuggestion[];
  };
};
function errOf(e: unknown): NonNullable<ApiErrorPayload['error']> {
  return (e as { data?: ApiErrorPayload })?.data?.error ?? {};
}

export default function AddGame() {
  const router = useRouter();
  const styles = useStyles();

  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<CollectionItem | null>(null); // the status beat

  return (
    // S4-d (M3-R R0-2): the old window-measuring KeyboardAvoidingView chronically mis-lifted inside
    // the device frame — replaced by the frame-aware KeyboardLift on the docked search bar itself.
    <View style={styles.flex}>
      <View style={styles.screen}>
        {/* FlowHeader (S4-a/e): LEFT-aligned title + a labeled RETURN link (no ✕), and NO count chip —
            add-game isn't a collection-count surface (board add-game-states :755–756). */}
        <View style={styles.flowHead}>
          <Text style={styles.flowTitle}>ADD GAME</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to collection"
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Text style={styles.returnLink}>‹ RETURN TO COLLECTION</Text>
          </Pressable>
        </View>

        {added ? (
          <AddedFlow item={added} onDone={() => router.back()} />
        ) : mode === 'create' ? (
          <CreateForm
            initialName={q}
            onCancel={() => setMode('search')}
            onAdded={setAdded}
            onPickExisting={(name) => {
              setQ(name);
              setMode('search');
            }}
          />
        ) : (
          <SearchMode q={q} setQ={setQ} onNoneOfThese={() => setMode('create')} onAdded={setAdded} />
        )}
      </View>
    </View>
  );
}

// ── search → fan → focused meta → ADD ─────────────────────────────────────────────────────────────
function SearchMode({
  q,
  setQ,
  onNoneOfThese,
  onAdded,
}: {
  q: string;
  setQ: (v: string) => void;
  onNoneOfThese: () => void;
  onAdded: (item: CollectionItem) => void;
}) {
  const styles = useStyles();
  const { data: popular } = useGetPopularQuery();
  // walk2 N2b — the CAT-11 / CAT-12 pre-query rails, live off the now-built endpoints (skipped while
  // querying: search overwrites the rails, the board's model).
  const trimmed = q.trim();
  const querying = trimmed.length > 0;
  const { data: newReleases } = useGetNewReleasesQuery(undefined, { skip: querying });
  const { data: friendsActive } = useGetFriendsActiveQuery(undefined, { skip: querying });
  const [search, searchState] = useLazySearchCatalogQuery();
  const [foreIndex, setForeIndex] = useState(0);
  // ONE add mutation feeds every rail; `addingId`/`errFor` tag the acting card so only its button
  // shows the in-flight/error (a shared spinner would light all rails at once).
  const [addingId, setAddingId] = useState<string | null>(null);
  const [errFor, setErrFor] = useState<{ id: string; message: string } | null>(null);
  const [addToCollection] = useAddToCollectionMutation();

  useEffect(() => {
    if (trimmed.length === 0) return;
    const t = setTimeout(() => void search(trimmed, true), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed, search]);

  const results: CatalogItem[] = useMemo(
    () => (querying ? (searchState.data?.items ?? []) : []),
    [querying, searchState.data],
  );

  // Reset the search fan's fore when the result set changes (a stale index must not carry over).
  useEffect(() => setForeIndex(0), [querying, searchState.data]);
  const safeFore = results.length > 0 ? Math.min(foreIndex, results.length - 1) : 0;
  const focused = results[safeFore] ?? null;

  // The shared per-item add (any rail's ADD, or the search fan's) — routes through onAdded to the
  // COL-02 status beat exactly as before; tags the acting id for the in-flight/error affordance.
  async function addItem(item: CatalogItem) {
    setAddingId(item.id);
    setErrFor(null);
    try {
      const added = await addToCollection({ gameId: item.id }).unwrap();
      onAdded(added);
    } catch (e) {
      setErrFor({ id: item.id, message: errOf(e).message ?? 'Couldn’t add. Try again.' });
    } finally {
      setAddingId(null);
    }
  }

  return (
    <>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {querying ? (
          // ── SEARCH — the results fan overwrites the rails (the board's model) ──
          <>
            {/* R14 — the board's match COUNT, not a static "RESULTS" (board P2 "MATCHING…" · P3 "N MATCHES") */}
            <Text style={styles.railHead}>
              {searchState.isFetching ? 'MATCHING…' : `${results.length} ${results.length === 1 ? 'MATCH' : 'MATCHES'}`}
            </Text>
            {searchState.isFetching || results.length === 0 ? (
              // Owner walk (m6) — the fetch↔no-matches swap must not reflow the create hook below. The
              // NO MATCHES panel is the height ANCHOR: always laid out (its box reserves the space in
              // BOTH states); while a fetch is in flight it's held invisible + SR-hidden and the spinner
              // rides an ABSOLUTE overlay over it (out of flow — adds no height). Settled + empty → the
              // same panel simply becomes visible. Byte-identical surrounding structure, no magic-number
              // slot height (the device saveSlot / collection coachmark-overlay idioms, combined).
              <View style={styles.statusSlot}>
                <View
                  style={[styles.noneWrap, searchState.isFetching && styles.statusAnchorHidden]}
                  aria-hidden={searchState.isFetching}
                  importantForAccessibility={searchState.isFetching ? 'no-hide-descendants' : 'auto'}
                >
                  <Text style={styles.noneTitle}>NO MATCHES</Text>
                  <Text style={styles.noneSub}>Not in the community catalog yet — be the one who adds it.</Text>
                </View>
                {searchState.isFetching ? (
                  <View style={styles.statusOverlay} pointerEvents="none">
                    <ActivityIndicator color={theme.brand.accent} />
                  </View>
                ) : null}
              </View>
            ) : (
              <>
                {focused ? <FocusedMeta item={focused} /> : null}
                <CardFan items={results.map((i) => ({ id: i.id, title: i.name }))} foreIndex={safeFore} onFocus={setForeIndex} />
                {errFor && focused && errFor.id === focused.id ? <Text style={styles.errLine}>{errFor.message}</Text> : null}
                <ScreenButton
                  label={focused?.inCollection ? 'In your collection ✓' : addingId === focused?.id ? '…' : 'Add to collection'}
                  variant="add"
                  disabled={!focused || focused.inCollection || addingId === focused?.id}
                  onPress={() => focused && void addItem(focused)}
                  block
                />
              </>
            )}
            <View style={styles.noneHook}>
              {/* walk2 B8 ⚖ (owner ruling 2026-07-17) — the create-this-game prompt is the F-02
                  ACQUISITIVE voice: GOLD with the pixel-stepped silhouette. ScreenButton/add IS that
                  grammar (gold fill + steppedRectPath corners) — consumed, not hand-drawn. */}
              <Text style={styles.noneLead}>NONE OF THESE?</Text>
              <ScreenButton label={`Create “${trimmed}”`} variant="add" onPress={onNoneOfThese} block />
            </View>
          </>
        ) : (
          // ── PRE-QUERY — the rail trio (board: three stacked suggestion fans) ──
          // walk2 N2b: POPULAR (CAT-09, live) · NEW RELEASES (CAT-11, now live) · FRIENDS ARE PLAYING
          // (CAT-12, now live — ranked by friendsHaveCount; the "lands soon" placeholder retired). Each
          // is a RailFan (capped 12, its own focus + ADD via the shared addItem); FRIENDS shows the quiet
          // rail-empty when the caller has no friends-active games.
          <>
            <RailFan heading="POPULAR FIRST ADDS" items={popular?.items ?? []} addingId={addingId} errFor={errFor} onAdd={addItem} />
            <RailFan heading="NEW RELEASES" items={newReleases?.items ?? []} addingId={addingId} errFor={errFor} onAdd={addItem} />
            <RailFan
              heading="FRIENDS ARE PLAYING"
              items={friendsActive?.items ?? []}
              addingId={addingId}
              errFor={errFor}
              onAdd={addItem}
              emptyText="No friends are playing something new yet — add a friend to see their games here."
            />
          </>
        )}
      </ScrollView>

      {/* bottom-docked search (OQ-035) — rises above the keyboard within the frame (S4-d, R0-2). W-D1 D-2:
          the field starts CLOSED (no autoFocus) so entering Add-Game shows the rails/suggestions first;
          the keyboard opens only when the user taps the docked search field (its own affordance). */}
      <KeyboardLift>
        <View style={styles.dock}>
          <SearchField value={q} onChangeText={setQ} placeholder="Search the catalog" />
        </View>
      </KeyboardLift>
    </>
  );
}

// walk2 N2b — one pre-query suggestion rail (POPULAR / NEW RELEASES / FRIENDS ARE PLAYING). Capped at
// 12; a 3-up CardFan whose centered FORE is the focused card (its meta + ADD ride above/below, §0.7).
// Owns its own foreIndex (each rail scrolls independently). Empty → the quiet `emptyText` (no rail at
// all when there's no empty copy, e.g. an empty POPULAR — the catalog-empty first-run is the search
// view's concern). Add routes through the shared `onAdd` (→ the COL-02 status beat).
const RAIL_CAP = 12;
function RailFan({
  heading,
  items,
  addingId,
  errFor,
  onAdd,
  emptyText,
}: {
  heading: string;
  items: CatalogItem[];
  addingId: string | null;
  errFor: { id: string; message: string } | null;
  onAdd: (item: CatalogItem) => void;
  emptyText?: string;
}) {
  const styles = useStyles();
  const [foreIndex, setForeIndex] = useState(0);
  const capped = useMemo(() => items.slice(0, RAIL_CAP), [items]);
  useEffect(() => setForeIndex(0), [capped.length]);

  if (capped.length === 0) {
    return emptyText ? (
      <View style={styles.rail}>
        <Text style={styles.railHead}>{heading}</Text>
        <Text style={styles.railEmpty}>{emptyText}</Text>
      </View>
    ) : null;
  }
  const safe = Math.min(foreIndex, capped.length - 1);
  const focused = capped[safe]!;
  return (
    <View style={styles.rail}>
      <Text style={styles.railHead}>{heading}</Text>
      {/* S4-f — the focused card's meta ABOVE the fan (name-first · CAT-09 presence · CAT-05 credit) */}
      <FocusedMeta item={focused} />
      {/* S4-c — the 3-up CardFan: fore + rotated neighbours + ‹ dots › + SWIPE (focus-only, §0.7) */}
      <CardFan items={capped.map((i) => ({ id: i.id, title: i.name }))} foreIndex={safe} onFocus={setForeIndex} />
      {errFor && errFor.id === focused.id ? <Text style={styles.errLine}>{errFor.message}</Text> : null}
      <ScreenButton
        label={focused.inCollection ? 'In your collection ✓' : addingId === focused.id ? '…' : 'Add to collection'}
        variant="add"
        disabled={focused.inCollection || addingId === focused.id}
        onPress={() => onAdd(focused)}
        block
      />
    </View>
  );
}

function FocusedMeta({ item }: { item: CatalogItem }) {
  const styles = useStyles();
  const router = useRouter();
  const year = item.releaseDate ? item.releaseDate.slice(0, 4) : null;
  const sub = [year, item.studio].filter(Boolean).join(' · ').toUpperCase();
  return (
    <View style={styles.meta}>
      {/* R2 (owner) — NAME · YEAR · STUDIO on ONE line (name bold, meta dim); genre + CAT-05 credit removed. */}
      <Text style={styles.metaTitle}>
        {item.name.toUpperCase()}
        {sub ? <Text style={styles.metaSub}>{` · ${sub}`}</Text> : null}
      </Text>
      {/* the CAT-09 presence line */}
      <Text style={styles.metaPresence}>
        IN {item.collectionsCount} COLLECTION{item.collectionsCount === 1 ? '' : 'S'} ·{' '}
        {item.friendsHaveCount} FRIEND{item.friendsHaveCount === 1 ? '' : 'S'}{' '}
        {item.friendsHaveCount === 1 ? 'HAS' : 'HAVE'} IT
      </Text>
      {/* W-D1 Q3 — the INSPECT affordance: see the ABOUT page + Community Cards before adding (the B7
          shelf-chevron grammar). Resolves the adaptive Game page: CATALOG when unowned, OWN if owned. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Inspect ${item.name}`}
        onPress={() => router.push(`/game/${item.id}`)}
        hitSlop={8}
        style={({ pressed }) => pressed && styles.metaInspectPressed}
      >
        <Text style={styles.metaInspect}>INSPECT ›</Text>
      </Pressable>
    </View>
  );
}

// ── the post-add flow (W-D Wave D · reordered at the m6 owner walk) ───────────────────────────────
// Sequenced AFTER the add resolves (the entry exists, so adopt targets it): the ADDED stats + the
// COL-02 STATUS BEAT first, THEN the card screen — an adopt-or-design FORK (owner ruling: the status
// beat moves BEFORE the card step; the card step never silently auto-advances again). The fork ends
// the flow (onDone → router.back() to Collection) or hands off to the Styler.
function AddedFlow({ item, onDone }: { item: CollectionItem; onDone: () => void }) {
  const [stage, setStage] = useState<'status' | 'cards'>('status');
  const goCards = useCallback(() => setStage('cards'), []);
  return stage === 'status' ? (
    <StatusBeat item={item} onNext={goCards} />
  ) : (
    <CardForkStep item={item} onDone={onDone} />
  );
}

// The fork's curated strip size — the server-ranked TOP 6 by adoption (sort=top&limit=6), not the
// whole gallery (the owner's "top ~6" ruling; the full list rides the SEE ALL door).
const FORK_STRIP_N = 6;

// ── the card FORK step (OQ-136, reshaped at the m6 owner walk) ────────────────────────────────────
// "Adopt a card or design your own": a curated TOP-6-by-adoption strip (server-ranked — never the
// whole gallery) with four doors — adopt-from-strip (the M5 AdoptCardSheet: `adoptCard(cardId)` needs
// no entryId because adoption is ENTRY-INDEPENDENT — it GRANTS the design to the adopter's library, it
// does NOT resolve or equip the just-created collection entry; equipping a design onto an entry is a
// separate switcher action) · SEE ALL {N} › (the paged full list) · DESIGN YOUR OWN › (the Styler's
// normal per-game entry — the entry the add just created makes it work) · keep-the-default (tertiary, ends
// the flow). A game with NO community cards NO LONGER auto-advances silently (the owner never saw the
// old step): the fork still renders, minus the strip/see-all — DESIGN YOUR OWN + keep-default stand.
// A gallery error degrades the same way (the doors never depend on the fetch). Share/block/report are
// full-game-page concerns — the sheet's secondary hooks stay quiet no-ops here.
function CardForkStep({ item, onDone }: { item: CollectionItem; onDone: () => void }) {
  const styles = useStyles();
  const router = useRouter();
  // The SAME arg the strip's CommunityGallery uses (top=FORK_STRIP_N → { sort:'top', limit:N }), so
  // RTK dedupes the two subscriptions into ONE cache entry / one network read.
  const { data: gallery, isLoading, isError } = useGetGameGalleryQuery({
    gameId: item.gameId,
    sort: 'top',
    limit: FORK_STRIP_N,
  });
  const { data: wallet } = useGetWalletQuery();
  const [adoptCard, adoptState] = useAdoptCardMutation();
  const [inspectCard, setInspectCard] = useState<GalleryCardView | null>(null);
  // a ref (not state) — the sheet's Done reads it in the same tick a fast adopt→Done could fire, and it
  // never needs to re-render the step (adopt settles inside the sheet).
  const didAdopt = useRef(false);

  const hasCards = !isError && (gallery?.items.length ?? 0) > 0;

  // Reuse the game-page adopt mapping (0072/0073): the container owns the RTK mutation; the sheet owns
  // the confirm + result UX. Success settles IN PLACE (M5 G5) — its Done door ends the add flow.
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

  // The strip fetch's quiet gate — the fork's doors render the moment the read settles (either way).
  if (isLoading) {
    return (
      <View style={[styles.body, styles.adoptGate]}>
        <ActivityIndicator color={theme.brand.accent} />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.addedWrap}>
          <GameCard title={item.title} size="grid" />
          <Text style={styles.addedTitle}>ADDED TO YOUR SHELF</Text>
        </View>
        <Text style={styles.railHead}>ADOPT A CARD — OR DESIGN YOUR OWN</Text>
        <Text style={styles.adoptSub}>
          {hasCards
            ? 'Give the new game a face: adopt one of the community’s cards, or design your own in the Styler.'
            : 'No community cards for this game yet — design your own in the Styler, or keep the default for now.'}
        </Text>
        {hasCards ? (
          // the TOP-6 strip (the same cache entry as the step's own read) + its SEE ALL {N} › door
          <CommunityGallery
            gameId={item.gameId}
            top={FORK_STRIP_N}
            onSeeAll={() => router.push(`/game/${item.gameId}/cards?adopt=1`)}
            onInspect={setInspectCard}
            onDesignACard={() => router.push(`/styler/${item.gameId}`)}
            onViewDesigner={(userId) => router.push(`/contributor/${userId}`)}
          />
        ) : null}
        {/* DESIGN YOUR OWN — the gold card-creating grammar (F-02); the Styler's normal per-game entry */}
        <ScreenButton
          label="Design your own ›"
          variant="add"
          onPress={() => router.push(`/styler/${item.gameId}`)}
          block
        />
        <View style={styles.keepDefault}>
          <TertiaryLink label="Keep the default for now" chevron="none" onPress={onDone} dim />
        </View>
      </ScrollView>

      {/* the adopt sheet — a screen-root sibling of the ScrollView (never in-scroll; PulledSheet docks
          to the routed screen). Done after a successful adopt ends the flow; a plain cancel closes it. */}
      <AdoptCardSheet
        card={inspectCard}
        visible={inspectCard !== null}
        balance={wallet?.balance ?? 0}
        onClose={() => {
          setInspectCard(null);
          if (didAdopt.current) onDone();
        }}
        onAdopt={onAdopt}
        adopting={adoptState.isLoading}
        onAdopted={() => {
          didAdopt.current = true;
        }}
        onTopUp={() => router.push('/store?view=topup')}
        onShare={() => {}}
        onBlock={() => setInspectCard(null)}
        onViewContributor={(userId) => {
          setInspectCard(null);
          router.push(`/contributor/${userId}`);
        }}
      />
    </>
  );
}

// ── the COL-02 status beat (chips OFF-card — no stamps on art) ────────────────────────────────────
// First in the post-add sequence now (m6 owner reorder): stats → SET A STATUS → Next → the card fork.
function StatusBeat({ item, onNext }: { item: CollectionItem; onNext: () => void }) {
  const styles = useStyles();
  const [updateEntry, state] = useUpdateEntryMutation();
  const [status, setStatus] = useState<CollectionStatus>(item.status);

  async function pick(next: CollectionStatus) {
    setStatus(next);
    try {
      await updateEntry({ entryId: item.entryId, status: next }).unwrap();
    } catch {
      setStatus(item.status); // quiet revert — the beat is advisory, NEXT advances either way
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.addedWrap}>
        <GameCard title={item.title} size="grid" />
        <Text style={styles.addedTitle}>ADDED TO YOUR SHELF</Text>
      </View>
      <Text style={styles.railHead}>SET A STATUS</Text>
      <View style={styles.chipRow}>
        {COLLECTION_STATUSES.map((s) => (
          <GenreTag key={s} label={STATUS_LABEL[s]} selected={status === s} onPress={() => void pick(s)} />
        ))}
      </View>
      <ScreenButton label={state.isLoading ? '…' : 'Next'} onPress={onNext} block />
    </ScrollView>
  );
}

// ── create (CAT-02) + the CAT-03 dedup warn beat ─────────────────────────────────────────────────
function CreateForm({
  initialName,
  onCancel,
  onAdded,
  onPickExisting,
}: {
  initialName: string;
  onCancel: () => void;
  onAdded: (item: CollectionItem) => void;
  onPickExisting: (name: string) => void;
}) {
  const styles = useStyles();
  const { data: genres } = useGetGenresQuery();
  const [createGame, createState] = useCreateGameMutation();
  const [addToCollection] = useAddToCollectionMutation();

  const [name, setName] = useState(initialName);
  const [genreIds, setGenreIds] = useState<Set<string>>(new Set());
  const [studio, setStudio] = useState('');
  const [publisher, setPublisher] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DedupSuggestion[]>([]);

  const hasExact = suggestions.some((s) => s.exact);

  async function submit(dedupOverride: boolean) {
    setFieldErrors({});
    setTopError(null);
    setSuggestions([]);
    try {
      const body = {
        name: name.trim(),
        genreIds: [...genreIds],
        ...(studio.trim() ? { studio: studio.trim() } : {}),
        ...(publisher.trim() ? { publisher: publisher.trim() } : {}),
        ...(releaseDate.trim() ? { releaseDate: releaseDate.trim() } : {}),
        ...(dedupOverride ? { dedupOverride: true } : {}),
      };
      const created = await createGame(body).unwrap();
      onAdded(await addToCollection({ gameId: created.id }).unwrap());
    } catch (e) {
      const err = errOf(e);
      if (err.code === 'DUPLICATE_SUSPECTED') {
        setSuggestions(err.suggestions ?? []);
        return;
      }
      const fields: Record<string, string> = {};
      for (const d of err.details ?? []) if (d.path && !fields[d.path]) fields[d.path] = d.message;
      setFieldErrors(fields);
      setTopError(Object.keys(fields).length > 0 ? null : (err.message ?? 'Couldn’t create. Try again.'));
    }
  }

  const toggleGenre = (id: string) => {
    const next = new Set(genreIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGenreIds(next);
  };

  return (
    // R0-follow (murr R0 audit): the removed KAV left the create form with no keyboard handling — a
    // focused lower field (publisher / release date) + the Create button sat under the keyboard on
    // iOS. `automaticallyAdjustKeyboardInsets` insets the scroll content by the keyboard's own
    // intersection with THIS ScrollView (frame-correct, unlike the window-measuring KAV). Android's
    // adjustResize reflows; web is a no-op. Native — confirmed at the R2 device pass.
    <ScrollView
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.railHead}>CREATE A CATALOG ENTRY</Text>

      {suggestions.length > 0 ? (
        <InlineBanner title={hasExact ? 'Already in the catalog' : 'Did you mean…?'}>
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`Use ${s.name}`}
              onPress={() => onPickExisting(s.name)}
              style={styles.suggestionRow}
            >
              <GameCard title={s.name} size="thumb" />
              <View style={styles.suggestionMeta}>
                <Text style={styles.suggestionName}>{s.name}</Text>
                <Text style={styles.suggestionSub}>
                  {[s.releaseDate?.slice(0, 4), s.studio].filter(Boolean).join(' · ') || 'TAP TO ADD THIS ONE'}
                </Text>
              </View>
            </Pressable>
          ))}
          {!hasExact ? (
            <ScreenButton
              label="Create anyway"
              variant="secondary"
              onPress={() => void submit(true)}
              block
            />
          ) : null}
        </InlineBanner>
      ) : null}

      <TextField label="Name" value={name} onChangeText={setName} error={fieldErrors.name} />
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>GENRE(S)</Text>
        <View style={styles.chipRow}>
          {(genres?.items ?? []).map((g) => (
            <GenreTag
              key={g.id}
              label={g.name}
              selected={genreIds.has(g.id)}
              onPress={() => toggleGenre(g.id)}
            />
          ))}
        </View>
        {fieldErrors.genreIds ? <Text style={styles.errLine}>{fieldErrors.genreIds}</Text> : null}
      </View>
      <TextField label="Studio" value={studio} onChangeText={setStudio} error={fieldErrors.studio} />
      <TextField
        label="Publisher"
        value={publisher}
        onChangeText={setPublisher}
        error={fieldErrors.publisher}
      />
      <TextField
        label="Release date"
        value={releaseDate}
        onChangeText={setReleaseDate}
        placeholder="YYYY-MM-DD"
        error={fieldErrors.releaseDate}
      />

      {topError ? <Text style={styles.errLine}>{topError}</Text> : null}

      <ScreenButton
        label={createState.isLoading ? '…' : 'Create + add'}
        variant="add"
        disabled={createState.isLoading || name.trim().length === 0 || genreIds.size === 0}
        onPress={() => void submit(false)}
        block
      />
      <ScreenButton label="Back to search" variant="secondary" onPress={onCancel} block />
    </ScrollView>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  // N3 — no divider between the header and the POPULAR FIRST ADDS section (owner, 2026-07-04).
  // W-B1/B2 — the S2-b under-title seam as ONE fused block on the shared geometry: title → the
  // HEADER_SEAM_GAP (= the header's paddingBottom app-wide) → the RETURN link → seam bottom md.
  // (Was: gap xs(2) + paddingVertical lg — an off-grid 2px gap-1 and a 12px gap-2.)
  flowHead: {
    alignItems: 'flex-start',
    gap: HEADER_SEAM_GAP,
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.lg,
    paddingBottom: t.space.md,
  },
  // N2 — same size as the Collection ScreenHead title (display 21, F-06).
  flowTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1 },
  // N5 — the RETURN link is orange (the on-screen accent).
  returnLink: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.lg, gap: t.space.lg }, // W-B2 — top pad dropped (the seam owns gap-2)
  railHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  // walk2 N2b — one pre-query suggestion rail (POPULAR / NEW RELEASES / FRIENDS ARE PLAYING).
  rail: { gap: t.space.md, marginBottom: t.space.xl },
  railEmpty: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.3, lineHeight: 14 },
  // N4 — the focused game's details are centered (owner, 2026-07-04).
  meta: { gap: 3, alignItems: 'center' },
  metaTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5, textAlign: 'center' },
  metaSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 1 }, // R2 — inline year·studio (body/dim), baseline in the title line
  metaPresence: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1, textAlign: 'center' },
  metaInspect: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1, textAlign: 'center', marginTop: 2 },
  metaInspectPressed: { opacity: 0.6 },
  // Owner walk (m6) — the search results-status slot: the NO MATCHES panel anchors the height; the
  // fetch spinner rides statusOverlay (absolute → out of flow) so the fetch↔no-matches swap can't jar
  // the create hook below. statusAnchorHidden holds the anchor invisible-but-laid-out during a fetch.
  statusSlot: { position: 'relative' },
  statusAnchorHidden: { opacity: 0 },
  statusOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  noneWrap: { gap: t.space.sm, padding: t.space.lg, backgroundColor: t.scr.panel },
  noneTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  noneSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16 },
  noneHook: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.md },
  // walk2 B8 — the quiet lead over the gold stepped create button (the be-first hook, CAT-02).
  noneLead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  dock: {
    padding: t.space.lg,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
    backgroundColor: t.scr.bg,
  },
  addedWrap: { alignItems: 'center', gap: t.space.lg, paddingVertical: t.space.lg },
  addedTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.success, letterSpacing: 2 },
  // W-D Wave D / m6 fork — the card step's quiet loading gate + its lead copy + the tertiary door.
  adoptGate: { alignItems: 'center', justifyContent: 'center', paddingVertical: t.space.xxl },
  adoptSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16 },
  keepDefault: { alignItems: 'center', paddingVertical: t.space.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  field: { gap: t.space.xs },
  fieldLabel: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  errLine: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.brand.alert },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  suggestionMeta: { flex: 1, gap: 1 },
  suggestionName: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.ink },
  suggestionSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
}));
