import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, Platform, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { FriendCollectionItem, GenreView } from '@ingame/shared';
import { EntryCard } from '../../../src/components/EntryCard';
import { FriendTopView } from '../../../src/components/collection/TopCurated';
import {
  SearchIcon,
  SortIcon,
  FilterIcon,
  ViewIcon,
  ClearIcon,
} from '../../../src/components/collection/toolsGlyphs';
import { TertiaryLink } from '../../../src/components/TertiaryLink';
import { ScreenButton } from '../../../src/components/ScreenButton';
import { ToolButton } from '../../../src/components/ToolButton';
import { SearchField } from '../../../src/components/SearchField';
import { GenreTag } from '../../../src/components/GenreTag';
import { KeyboardLift } from '../../../src/components/KeyboardLift';
import { PulledSheet } from '../../../src/components/PulledSheet';
import { useSheetLocked } from '../../../src/components/SheetLock';
import { Skeleton } from '../../../src/components/lifecycle/Skeleton';
import { LoadError } from '../../../src/components/lifecycle/LoadError';
import { Unavailable } from '../../../src/components/lifecycle/Unavailable';
import { STATUS_LABEL, COLLECTION_STATUSES } from '../../../src/constants/collection';
import { themedStyles } from '../../../src/theme';
import { useGetUserQuery, useGetUserCollectionQuery, isFriendProfile } from '../../../src/store/friendApi';
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../../../src/components/ScreenHead';

// P9 — a friend's Collection (COL-10/11 · collection-states.html friend read-only boards). READ-ONLY,
// privacy-gated: the friend-visible field set only (no notes/rating/platforms/percentComplete — they're
// not on the shape, the F06 allowlist). Full browse-tool PARITY (COL-11): search · sort · filter · view
// — but NO write tools (no Add / Arrange / per-entry edit; owner-only). ARCH A2: this does NOT reuse
// collection.tsx's inline owner ShelfView/GridView/ListView (bound to the owner shape + a private
// flip-back) — it shares the VOCABULARY (EntryCard face, tools-bar chrome, section grammar) as a thin
// read-only parallel. An entry tap → the SOC-11 entry detail. The friend TOP view is EXPECTED(P5).
//
// ── walk-5 CR (owner): FILTER/SEARCH PARITY with the personal Collection ──────────────────────────
// "The filtering and search UI should LOOK like the owner's own Collection screen's (same controls,
// same placement/affordances) so the functionality feels transferable between the two surfaces."
// What that means concretely, and what changed here:
//   • the tools are the BOTTOM-DOCKED bar (a sibling of the scroll, not an in-flow chip row at the top
//     of the shelf) — the same slot the owner's tools occupy;
//   • the controls are the SHARED catalog components: four icon-only cream `ToolButton` keycaps
//     (Search · Sort · Filter · View) wearing the SAME board glyphs (`collection/toolsGlyphs`), with
//     the same OQ-034 split — a TAP acts, a LONG-PRESS opens the drawer;
//   • tapping Search MORPHS the bar into a docked `SearchField` + ⊗ clear over a `KeyboardLift`;
//   • the drawer is a `PulledSheet` of `GenreTag` chip rows (View · Sort · Status · Genre) with the
//     same tap-the-active-sort-to-flip grammar, RESET, and Done;
//   • the search matches TITLE · DEVELOPER · PUBLISHER (the owner's haystack) under the same RESULTS
//     header, and the zero-match beat wears the owner's NO MATCHES copy + Clear.
// The owner shelf's tools are declared INLINE in app/(tabs)/collection.tsx (there is no shared
// `ToolsBar` component yet) and that file is owned by a parallel packet this wave — so this is built
// from the same shared PRIMITIVES rather than by extracting the owner's markup. Extracting a real
// `ToolsBar` (and pointing both screens at it) is a recorded follow-up.
// The trailing key is COMPARE, not the owner's gold ADD: a friend's shelf is read-only and comparing
// mints nothing, so it stays the cream secondary voice (F-02 / decision 0069).

type FriendView = 'shelf' | 'grid' | 'list' | 'top';
type SortKey = 'az' | 'hours' | 'ownedSince';
const VIEW_ORDER: FriendView[] = ['shelf', 'grid', 'list', 'top'];
// COL-07 view labels — the same set the owner drawer shows (its TOP chip reads "TOP 10" explicitly).
const VIEW_LABEL: Record<FriendView, string> = { shelf: 'Shelf', grid: 'Grid', list: 'List', top: 'Top 10' };
// The owner's MY ORDER + RECENT sorts are OWNER-ONLY by DATA, not by choice: manual order and the
// immutable `addedAt` are not on the friend-visible shape (the F06 allowlist). The three sorts that CAN
// be offered wear the owner's grammar exactly.
const SORT_LABEL: Record<SortKey, string> = { az: 'A–Z', hours: 'HOURS', ownedSince: 'OWNED SINCE' };
const SORT_ORDER: SortKey[] = ['az', 'hours', 'ownedSince'];
const DEFAULT_SORT: SortKey = 'az';

export default function FriendCollection() {
  // COL-13 (decision 0050) — a friend's Profile VIEW TOP 10 / Top-3 tap deep-links here with `?view=top`
  // (+ `focus=gameId` for the tapped card).
  const { id, view: viewParam, focus } = useLocalSearchParams<{ id: string; view?: string; focus?: string }>();
  const router = useRouter();
  const styles = useStyles();

  // Hooks ALL unconditional (F-16).
  const { data: profile } = useGetUserQuery(id ?? '', { skip: !id });
  const { data, isLoading, isError, error, refetch } = useGetUserCollectionQuery(id ?? '', { skip: !id });
  const [view, setView] = useState<FriendView>(viewParam === 'top' ? 'top' : 'shelf');
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT);
  const [sortAsc, setSortAsc] = useState(true); // A–Z opens ascending (OQ-129, the owner rule)
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [genreFilter, setGenreFilter] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bgLocked = useSheetLocked(); // C2 (F-13) — freeze the shelf scroll while the drawer is open

  const closeSearch = () => {
    setQ('');
    setSearchOpen(false);
  };
  // Hardware back closes the search dock instead of navigating (the owner shelf's rule, PulledSheet
  // parity). Web-guarded: react-native-web's BackHandler shim console.errors on every subscribe.
  useEffect(() => {
    if (!searchOpen || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setQ('');
      setSearchOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [searchOpen]);

  const username = profile && isFriendProfile(profile) ? profile.username : (profile?.username ?? '');
  const items = useMemo(() => data?.items ?? [], [data]);
  // The genre facets offered by the drawer are the ones this shelf actually contains (the owner rule —
  // an empty genre section is omitted rather than shown blank).
  const genres = useMemo(
    () => [...new Map(items.flatMap((i) => i.genres).map((g) => [g.id, g])).values()],
    [items],
  );

  // Client-side query over the loaded friend items (the same D2 pattern as the owner shelf, read-only).
  // The haystack matches the owner's — title · developer · publisher — so the same typed query finds the
  // same game on either shelf (that transferability IS the CR).
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = items.filter((i) => {
      if (needle) {
        const hay = `${i.title} ${i.developer ?? ''} ${i.publisher ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (statusFilter.size > 0 && !statusFilter.has(i.status)) return false;
      if (genreFilter.size > 0 && !i.genres.some((g) => genreFilter.has(g.id))) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      const cmp =
        sortKey === 'hours'
          ? a.hours - b.hours
          : sortKey === 'ownedSince'
            ? (a.ownedSince ?? '').localeCompare(b.ownedSince ?? '')
            : a.title.localeCompare(b.title);
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [items, q, statusFilter, genreFilter, sortKey, sortAsc]);

  if (isLoading || !id) {
    return (
      <Frame title="Collection" onBack={() => router.back()}>
        <Skeleton variant="card-cell" count={4} />
      </Frame>
    );
  }
  const status = (error as { status?: unknown } | undefined)?.status;
  if (isError && status === 404) {
    return (
      <Frame title="Collection" onBack={() => router.back()}>
        <Unavailable message="This collection isn't available." onBack={() => router.back()} />
      </Frame>
    );
  }
  if (isError || !data) {
    return (
      <Frame title="Collection" onBack={() => router.back()}>
        <LoadError message="Couldn't load this collection. Check your connection and try again." onRetry={() => void refetch()} />
      </Frame>
    );
  }

  const hero = items.find((i) => i.nowPlaying) ?? null;
  // W-D1 — the friend-entry route retired; a friend's game opens the adaptive Game page in FRIEND posture.
  const openEntry = (gameId: string) => router.push(`/game/${gameId}?via=${id}`);
  const filterActive = q.trim() !== '' || statusFilter.size > 0 || genreFilter.size > 0;
  const sortActive = sortKey !== DEFAULT_SORT || !sortAsc;
  // OQ-130 — the filtered-to-zero beat's clear action: drop all filters + exit search (owner parity).
  const clearAll = () => {
    setStatusFilter(new Set());
    setGenreFilter(new Set());
    closeSearch();
  };
  const cycleView = () => setView(nextView(view));
  // COL-13 — the friend's curated Top-10 rides the friend/full profile read (friendProfile.top10). The
  // read-only TOP view-mode consumes it; hours/status for the #1 headliner sub join from the collection.
  const top10 = profile && isFriendProfile(profile) ? (profile.top10 ?? []) : [];
  const friendItems = items.map((i) => ({ gameId: i.gameId, hours: i.hours, status: i.status }));

  // In-place search: the query live-filters the CURRENT view + a RESULTS header (owner board :661).
  const resultsHead =
    searchOpen && q.trim() !== '' && items.length > 0 ? (
      <Text style={styles.resultsHead}>RESULTS — TITLE · DEVELOPER · PUBLISHER</Text>
    ) : null;

  // The bottom-docked tools — the owner slot, the owner grammar, read-only contents. Absent on an empty
  // shelf (there is nothing to browse, and inert keycaps would be a lie).
  const tools =
    items.length === 0 ? null : searchOpen ? (
      <KeyboardLift>
        <View style={styles.searchBar} testID="friend-collection-search-bar">
          <View style={styles.searchFieldWrap}>
            <SearchField
              value={q}
              onChangeText={setQ}
              placeholder="Title · developer · publisher"
              autoFocus
              onSubmit={() => setSearchOpen(false)} // keyboard SEARCH un-morphs and KEEPS the query
            />
          </View>
          <Pressable
            onPress={closeSearch}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.searchClear}
          >
            <ClearIcon />
          </Pressable>
        </View>
      </KeyboardLift>
    ) : (
      <View style={styles.tools} testID="friend-collection-tools-bar">
        <ToolButton icon={<SearchIcon />} label="Search" active={q.trim() !== ''} onPress={() => setSearchOpen(true)} onLongPress={() => setDrawerOpen(true)} />
        <ToolButton icon={<SortIcon active={sortActive} asc={sortAsc} />} label="Sort" active={sortActive} onPress={() => setSortAsc(!sortAsc)} onLongPress={() => setDrawerOpen(true)} />
        <ToolButton icon={<FilterIcon />} label="Filter" active={statusFilter.size > 0 || genreFilter.size > 0} onPress={() => setDrawerOpen(true)} />
        <ToolButton icon={<ViewIcon view={view} />} label="View" active={view !== 'shelf'} onPress={cycleView} onLongPress={() => setDrawerOpen(true)} />
        <View style={styles.spacer} />
        {/* the read-only trailing key — where the owner's gold ADD sits. Cream secondary: a friend's
            shelf has no write action, and comparing is non-commerce (F-02 / 0069). */}
        <ScreenButton label="Compare" variant="secondary" onPress={() => router.push(`/compare/${id}`)} />
      </View>
    );

  return (
    <Frame
      title={username ? `Collection — ${username}` : 'Collection'}
      onBack={() => router.back()}
      scrollEnabled={!bgLocked}
      tools={tools}
      overlay={
        /* the sort/filter drawer mounts at the SCREEN ROOT — a sibling of the scroll, never inside it
           (the PulledSheet contract / F-15: an absolute-fill overlay inside a scroll anchors to the
           scroll CONTENT — top-pinned, wrong size, clipped). It used to sit inside this screen's
           ScrollView; the parity rebuild moves it out. */
        <SortFilterSheet
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          q={q}
          setQ={setQ}
          view={view}
          setView={setView}
          sortKey={sortKey}
          setSortKey={setSortKey}
          sortAsc={sortAsc}
          setSortAsc={setSortAsc}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          genreFilter={genreFilter}
          setGenreFilter={setGenreFilter}
          genres={genres}
        />
      }
    >
      {resultsHead}

      {/* their Now Playing hero — full stats, NO log-hours (you can't log their time). Hidden in TOP,
          and it YIELDS while a query is active (the owner rule, board :711–713). */}
      {hero && view !== 'top' && q.trim() === '' ? (
        <Pressable
          style={styles.hero}
          accessibilityRole="button"
          accessibilityLabel={`Open ${hero.title}`}
          onPress={() => openEntry(hero.gameId)}
        >
          <EntryCard title={hero.title} card={{ imageUrl: hero.card.imageUrl, thumbUrl: hero.card.thumbUrl }} size="cell" nowPlaying />
          <View style={styles.heroMeta}>
            <Text style={styles.heroEyebrow}>{username.toUpperCase()}&apos;S NOW PLAYING</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>{hero.title.toUpperCase()}</Text>
            <Text style={styles.heroSub}>{fmt(hero.hours)} HRS · {hero.status.toUpperCase()}</Text>
          </View>
        </Pressable>
      ) : null}

      {/* Branch ORDER copied from the owner shelf (collection.tsx:600-615): empty shelf → NO MATCHES
          → the view. NO MATCHES is checked BEFORE the TOP lane deliberately — the owner's own comment
          on that branch reads "filters/search matched nothing but the shelf isn't empty (TOP lane
          too)". Getting this order backwards (walk-5 Murr) left the RESULTS header sitting over an
          unfiltered Top-10 with NO MATCHES unreachable while searching from TOP. */}
      {items.length === 0 ? (
        <Text style={styles.empty}>{username} hasn&apos;t added any games yet.</Text>
      ) : filtered.length === 0 ? (
        <NoResults onClear={clearAll} showClear={filterActive} />
      ) : view === 'top' ? (
        // COL-13 — the friend read-only TOP (decision 0050); reads friendProfile.top10 (P5 live now).
        // The curated Top-10 renders over the FULL shelf — curation is independent of sort/filter, the
        // owner rule (`SelfTopView collectionItems={items}`), so a matching query leaves it untouched.
        <FriendTopView
          entries={top10}
          username={username}
          friendItems={friendItems}
          focusGameId={focus}
          onOpenGame={openEntry}
        />
      ) : view === 'list' ? (
        <FriendListView items={filtered} onOpen={openEntry} />
      ) : view === 'grid' ? (
        <FriendGridView items={filtered} onOpen={openEntry} />
      ) : (
        <FriendShelfView items={filtered} onOpen={openEntry} />
      )}
    </Frame>
  );
}

// ── read-only views (EntryCard vocabulary; no flip-to-private-back, no write affordances — ARCH A2) ──
function FriendShelfView({ items, onOpen }: { items: FriendCollectionItem[]; onOpen: (gameId: string) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.shelf}>
      {items.map((i) => (
        <Pressable key={i.entryId} style={styles.shelfRow} accessibilityRole="button" accessibilityLabel={`Open ${i.title}`} onPress={() => onOpen(i.gameId)}>
          <EntryCard title={i.title} card={{ imageUrl: i.card.imageUrl, thumbUrl: i.card.thumbUrl }} size="cell" nowPlaying={i.nowPlaying} />
          <View style={styles.shelfMeta}>
            <Text style={styles.shelfTitle} numberOfLines={1}>{i.title.toUpperCase()}</Text>
            <Text style={styles.shelfSub}>{factsLine(i)}</Text>
            <Text style={styles.shelfStat}>{fmt(i.hours)} HRS · {i.status.toUpperCase()}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function FriendGridView({ items, onOpen }: { items: FriendCollectionItem[]; onOpen: (gameId: string) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {items.map((i) => (
        <Pressable key={i.entryId} style={styles.gridCell} accessibilityRole="button" accessibilityLabel={`Open ${i.title}`} onPress={() => onOpen(i.gameId)}>
          <EntryCard title={i.title} card={{ imageUrl: i.card.imageUrl, thumbUrl: i.card.thumbUrl }} size="cell" nowPlaying={i.nowPlaying} />
        </Pressable>
      ))}
    </View>
  );
}

function FriendListView({ items, onOpen }: { items: FriendCollectionItem[]; onOpen: (gameId: string) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.list}>
      {items.map((i) => (
        <Pressable key={i.entryId} style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]} accessibilityRole="button" accessibilityLabel={`Open ${i.title}`} onPress={() => onOpen(i.gameId)}>
          <View style={styles.listMeta}>
            <Text style={styles.listTitle} numberOfLines={1}>{i.title.toUpperCase()}</Text>
            <Text style={styles.listSub}>{fmt(i.hours)} HRS · {i.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

// OQ-130 — the filtered-to-zero beat, in the owner's words (NO MATCHES + a Clear that is never a dead
// end). The Clear link is suppressed when nothing is actually filtered (an unreachable state today, but
// a link that clears nothing would be a lie).
function NoResults({ onClear, showClear }: { onClear: () => void; showClear: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.noResults}>
      <Text style={styles.noResultsTitle}>NO MATCHES</Text>
      <Text style={styles.noResultsSub}>Nothing on this shelf matches your search or filters.</Text>
      {showClear ? <TertiaryLink label="Clear" onPress={onClear} /> : null}
    </View>
  );
}

// The pulled sort/filter drawer — the owner drawer's grammar, read-only contents: scoped search · views ·
// sorts + the tap-the-active-sort-to-flip direction · status + genre facets · RESET · Done. One shared
// query state with the in-place search (OQ-034).
function SortFilterSheet(props: {
  visible: boolean;
  onClose: () => void;
  q: string;
  setQ: (v: string) => void;
  view: FriendView;
  setView: (v: FriendView) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  sortAsc: boolean;
  setSortAsc: (v: boolean) => void;
  statusFilter: Set<string>;
  setStatusFilter: (s: Set<string>) => void;
  genreFilter: Set<string>;
  setGenreFilter: (s: Set<string>) => void;
  genres: GenreView[];
}) {
  const styles = useStyles();
  const reset = () => {
    props.setQ('');
    props.setSortKey(DEFAULT_SORT);
    props.setSortAsc(true);
    props.setStatusFilter(new Set());
    props.setGenreFilter(new Set());
  };
  return (
    <PulledSheet visible={props.visible} onClose={props.onClose}>
      <SheetSection title="Search">
        <SearchField value={props.q} onChangeText={props.setQ} placeholder="Title · developer · publisher" />
      </SheetSection>
      <SheetSection title="View">
        <View style={styles.chipRow}>
          {VIEW_ORDER.map((v) => (
            <GenreTag key={v} label={VIEW_LABEL[v]} selected={props.view === v} onPress={() => props.setView(v)} />
          ))}
        </View>
      </SheetSection>
      {/* no standalone ASC/DESC chip — the active sort shows ↑/↓ and re-tapping it flips (S3-h/i). */}
      <SheetSection title="Sort">
        <View style={styles.chipRow}>
          {SORT_ORDER.map((k) => {
            const isActive = props.sortKey === k;
            return (
              <GenreTag
                key={k}
                label={`${SORT_LABEL[k]}${isActive ? (props.sortAsc ? ' ↑' : ' ↓') : ''}`}
                selected={isActive}
                onPress={() => {
                  if (isActive) props.setSortAsc(!props.sortAsc);
                  else {
                    props.setSortKey(k);
                    props.setSortAsc(k === 'az'); // OQ-129 — A–Z opens ascending; the others descending
                  }
                }}
              />
            );
          })}
        </View>
      </SheetSection>
      {/* S3-f: ALL = the empty status set — selected when nothing is filtered, tapping it clears. */}
      <SheetSection title="Status">
        <View style={styles.chipRow}>
          <GenreTag label="All" selected={props.statusFilter.size === 0} onPress={() => props.setStatusFilter(new Set())} />
          {COLLECTION_STATUSES.map((s) => (
            <GenreTag
              key={s}
              label={STATUS_LABEL[s]}
              selected={props.statusFilter.has(s)}
              onPress={() => props.setStatusFilter(toggle(props.statusFilter, s))}
            />
          ))}
        </View>
      </SheetSection>
      {props.genres.length > 0 ? (
        <SheetSection title="Genre">
          <View style={styles.chipRow}>
            <GenreTag label="All" selected={props.genreFilter.size === 0} onPress={() => props.setGenreFilter(new Set())} />
            {props.genres.map((g) => (
              <GenreTag
                key={g.id}
                label={g.name}
                selected={props.genreFilter.has(g.id)}
                onPress={() => props.setGenreFilter(toggle(props.genreFilter, g.id))}
              />
            ))}
          </View>
        </SheetSection>
      ) : null}
      <View style={styles.sheetFoot}>
        <Pressable onPress={reset} hitSlop={8} accessibilityRole="button">
          <Text style={styles.resetLink}>RESET</Text>
        </Pressable>
        <ScreenButton label="Done" onPress={props.onClose} />
      </View>
    </PulledSheet>
  );
}

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.sheetSection}>
      <Text style={styles.sheetHead}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

// The view keycap CYCLES SHELF · GRID · LIST · TOP; the drawer picks a mode directly (the owner's
// act/configure split).
function nextView(v: FriendView): FriendView {
  return VIEW_ORDER[(VIEW_ORDER.indexOf(v) + 1) % VIEW_ORDER.length]!;
}
function toggle(set: Set<string>, v: string): Set<string> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}
function factsLine(i: FriendCollectionItem): string {
  return [i.developer, i.releaseYear, i.genres[0]?.name].filter(Boolean).join(' · ').toUpperCase();
}
function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

// The screen frame. `tools` + `overlay` are SIBLINGS of the scroll (never inside it): the tools bar is
// bottom-docked like the owner's, and the drawer needs a screen-root mount (F-15).
function Frame({
  title,
  onBack,
  scrollEnabled = true,
  tools,
  overlay,
  children,
}: {
  title: string;
  onBack: () => void;
  scrollEnabled?: boolean;
  tools?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Text style={styles.headTitle} accessibilityRole="header" numberOfLines={1}>{title.toUpperCase()}</Text>
        </View>
        <View style={styles.retlink}>
          <TertiaryLink label="Return to profile" chevron="leading-back" onPress={onBack} />
        </View>
        <View style={styles.stage}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
          >
            {children}
          </ScrollView>
        </View>
        {tools}
        {overlay}
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: { ...SCREEN_HEADER_PAD }, // W-B1 — was bottom sm
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  retlink: { ...RETURN_SEAM_PAD },
  // stage — the space between the header and the docked tools; the scrollable shelf lives here alone
  // (the owner shelf's structure).
  stage: { flex: 1 },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  hero: { flexDirection: 'row', gap: t.space.lg, alignItems: 'center', backgroundColor: t.scr.panel, padding: t.space.lg },
  heroMeta: { flex: 1, gap: t.space.xs },
  heroEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1.5 },
  heroTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  heroSub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },

  empty: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint, textAlign: 'center', paddingVertical: t.space.xl },

  // the bottom-docked tools bar + its search morph — the owner geometry (collection.tsx `tools`/`searchBar`)
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
    backgroundColor: t.scr.bg,
  },
  spacer: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
    backgroundColor: t.scr.bg,
  },
  searchFieldWrap: { flex: 1 },
  searchClear: { width: 32, height: 30, backgroundColor: t.brand.cream, alignItems: 'center', justifyContent: 'center' },
  resultsHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },

  noResults: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.xxl },
  noResultsTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  noResultsSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center' },

  shelf: { gap: t.space.md },
  shelfRow: { flexDirection: 'row', gap: t.space.lg, alignItems: 'center', backgroundColor: t.scr.panel, padding: t.space.md },
  shelfMeta: { flex: 1, gap: t.space.xs },
  shelfTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  shelfSub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  shelfStat: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg, justifyContent: 'space-between' },
  gridCell: { alignItems: 'center' },

  list: { backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.space.lg, paddingVertical: t.space.md, borderTopWidth: 1, borderTopColor: t.scr.hairline },
  listRowPressed: { backgroundColor: t.scr.panelHi },
  listMeta: { flex: 1, gap: t.space.xs },
  listTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  listSub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  chev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },

  // drawer chrome — the owner sheet's grammar
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: t.space.sm },
  resetLink: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  sheetSection: { gap: t.space.md },
  sheetHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
}));
