import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, FlatList, ActivityIndicator, Pressable, BackHandler, Keyboard, Platform, Animated, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import type { CollectionItem, CollectionStatus, GenreView } from '@ingame/shared';
import { ScreenHead, SCREEN_HEADER_PAD } from '../../src/components/ScreenHead';
import { EntryCard } from '../../src/components/EntryCard';
import { FlipCard } from '../../src/components/collection/FlipCard';
import { SelfTopView, TopTenCardPicker } from '../../src/components/collection/TopCurated';
import { Coachmark } from '../../src/components/Coachmark';
import { ScreenButton } from '../../src/components/ScreenButton';
import { ToolButton } from '../../src/components/ToolButton';
import { SearchField } from '../../src/components/SearchField';
import { PulledSheet } from '../../src/components/PulledSheet';
import { useSheetLocked } from '../../src/components/SheetLock';
import { ScrollLockContext, useScrollLockHost } from '../../src/components/ScrollLock';
import { TextField } from '../../src/components/TextField';
import { GenreTag } from '../../src/components/GenreTag';
import { CurrencyCounter } from '../../src/components/commerce';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { KeyboardLift } from '../../src/components/KeyboardLift';
import { COLLECTION_STATUSES, STATUS_LABEL } from '../../src/constants/collection';
import { useReducedMotion } from '../../src/a11y/useReducedMotion';
import { theme, themedStyles, useTheme } from '../../src/theme';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { setCollectionView, setCol12CoachmarkSeen, type CollectionView } from '../../src/store/prefsSlice';
import { useGetCollectionQuery, useUpdateEntryMutation, useGetWalletQuery } from '../../src/store/api';

// The REAL Collection (COL-01..09 · WTP-03) — the M2 scratch-seed retired; everything renders from
// GET /me/collection. D2/decision 0058: the sort/filter/search DRAWER executes CLIENT-SIDE over the
// loaded shelf (D4 unpaginated); the tools-bar keycaps ACT, the drawer CONFIGURES (OQ-034), the view
// keycap CYCLES SHELF·GRID·LIST·TOP (the board's no-segmented-switchers grammar), the gold ADD docks
// right (F-02). Card faces are the CARD-18 default until M4; the COL-12 peek-flip rides M4 (D1).

const VIEW_ORDER: CollectionView[] = ['shelf', 'grid', 'list', 'top'];
// Board sort chips (:592–596): A–Z · HOURS · OWNED SINCE · RECENT · MY ORDER (decision 0061 keeps
// MY ORDER first as the default). RECENT sorts by the IMMUTABLE `addedAt` (shelf-add timestamp) —
// genuinely distinct from the user-editable OWNED SINCE (OQ-128 resolved, addedAt commissioned 2026-07-04).
const SORTS = [
  { key: 'order', label: 'MY ORDER' },
  { key: 'hours', label: 'HOURS' },
  { key: 'ownedSince', label: 'OWNED SINCE' },
  { key: 'recent', label: 'RECENT' },
  { key: 'title', label: 'A–Z' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];
// The COL-02 status set (order + display names) is shared with add-game via one constant so the two
// chip rows can't drift (murr debt, 2026-07-04).
// COL-07 view labels (S3-d — the TOP chip reads "TOP 10" explicitly; collection-states.html:588/1044).
const VIEW_LABEL: Record<CollectionView, string> = { shelf: 'Shelf', grid: 'Grid', list: 'List', top: 'Top 10' };

// ── ToolsBar glyphs — the BOARD's SVG icons, extracted verbatim from collection-states.html's tools
// bar (S3-n). Navy stroke/fill on the cream keycap (mockup `.sk2 .chip svg {stroke/fill: navy}`); set
// on each element directly (react-native-svg has no descendant CSS). ──
const NAVY = theme.brand.navy;
function SearchIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12">
      <Circle cx={5} cy={5} r={3.4} fill="none" stroke={NAVY} strokeWidth={1.6} />
      <Path d="M7.8 7.8L11 11" fill="none" stroke={NAVY} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
// Sort double-arrow (down at x=3, up at x=8); when a sort is active the chosen direction's arrow is
// emphasized and the other dims — the icon-only form of the board's "↑" direction cue (S3-i).
function SortIcon({ active, asc }: { active?: boolean; asc?: boolean }) {
  const down = !active ? 1 : asc ? 0.3 : 1;
  const up = !active ? 1 : asc ? 1 : 0.3;
  return (
    <Svg width={11} height={12} viewBox="0 0 11 12">
      <Path d="M3 1.5v9M3 10.5L1 8.4M3 10.5l2-2.1" fill="none" stroke={NAVY} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={down} />
      <Path d="M8 10.5v-9M8 1.5L6 3.6M8 1.5l2 2.1" fill="none" stroke={NAVY} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={up} />
    </Svg>
  );
}
function FilterIcon() {
  return (
    <Svg width={12} height={11} viewBox="0 0 12 11">
      <Path d="M1 1.5h10L7.5 6v3.4L4.5 10V6L1 1.5z" fill="none" stroke={NAVY} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}
// The view keycap always wears the CURRENT mode's glyph (board caption §View modes).
function ViewIcon({ view }: { view: CollectionView }) {
  if (view === 'grid') {
    return (
      <Svg width={12} height={12} viewBox="0 0 12 12">
        <Rect x={1} y={1} width={4.4} height={4.4} rx={1} fill={NAVY} />
        <Rect x={6.6} y={1} width={4.4} height={4.4} rx={1} fill={NAVY} />
        <Rect x={1} y={6.6} width={4.4} height={4.4} rx={1} fill={NAVY} />
        <Rect x={6.6} y={6.6} width={4.4} height={4.4} rx={1} fill={NAVY} />
      </Svg>
    );
  }
  if (view === 'list') {
    return (
      <Svg width={12} height={10} viewBox="0 0 12 10">
        <Path d="M1 1.5h10M1 5h10M1 8.5h10" fill="none" stroke={NAVY} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }
  if (view === 'top') {
    return (
      <Svg width={12} height={10} viewBox="0 0 12 10">
        <Path d="M1 1.5h10M1 5h7M1 8.5h4" fill="none" stroke={NAVY} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={10} height={12} viewBox="0 0 10 12">
      <Path d="M1.5 1.5h7v9h-7z" fill="none" stroke={NAVY} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M2.8 8.6h4.4" fill="none" stroke={NAVY} strokeWidth={1.3} />
    </Svg>
  );
}
// The board's button "+" (`.btn` svg, currentColor = the button's ink). Default 15px; the tools ADD uses
// 12 to match the tools-bar glyphs (FilterIcon etc.); accent-ink at 11px on the hero LOG HOURS. (R2 2a.)
function PlusIcon({ color = theme.brand.goldInk, size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 11 11">
      <Path d="M5.5 1v9M1 5.5h9" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
// The in-place-search ⊗ clear (board `.search-bar .field .clear`, :693) — dismisses search + clears q.
function ClearIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 13 13">
      <Circle cx={6.5} cy={6.5} r={5.5} fill="none" stroke={NAVY} strokeWidth={1.4} />
      <Path d="M4.4 4.4l4.2 4.2M8.6 4.4L4.4 8.6" fill="none" stroke={NAVY} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

// Shared row copy (decision 0061 — the showcase stat-line + catalog line, reused by the hero and the
// shelf-stack rows; board `.stat-line` :747 / `.hero-sub` :749).
const statLine = (i: CollectionItem) => `${i.hours} HRS · ${STATUS_LABEL[i.status]}`;
const catalogLine = (i: CollectionItem) =>
  [i.developer, i.releaseYear, i.genres[0]?.name].filter(Boolean).join(' · ').toUpperCase();

export default function Collection() {
  const router = useRouter();
  // COL-13 — a Top-3/VIEW-TOP-10 door can deep-link into the TOP view FOCUSED on a game (decision 0050 §C).
  // walk-4 P2 (OC-3) — `justAdded=<entryId>` is the one-shot the ADD flow lands with: the shelf scrolls
  // that entry into view and pulses it for ~1.5s. Landing alone doesn't deliver the owner's "the new
  // entry is VISIBLE" — the default sort is MY ORDER, where a fresh add can sit well below the fold.
  const params = useLocalSearchParams<{ focus?: string; justAdded?: string }>();
  const dispatch = useAppDispatch();
  const view = useAppSelector((s) => s.prefs.collectionView);
  const col12CoachmarkSeen = useAppSelector((s) => s.prefs.col12CoachmarkSeen);
  const { data, isLoading, isError, refetch } = useGetCollectionQuery();
  // F-1 fix 7 — the persistent PX counter rides the Collection header (ECON-07 entry point); it reads the
  // shared wallet cache and doors into the Store's wallet view.
  const { data: wallet } = useGetWalletQuery();
  const styles = useStyles();
  const bgLocked = useSheetLocked(); // C2 (F-13) — freeze the shelf scroll while the sort/filter drawer is open
  // walk-4 — the ScrollLock HOST seam (design-spec 0.54 round 3, the shipped touch-held-control rule):
  // a TOP-arrange drag (DragRankList) acquires the lock via context, freezing this scroll for the
  // gesture's duration so the drag doesn't fight the pan.
  const { scrollEnabled: dragScrollEnabled, api: scrollLockApi } = useScrollLockHost();

  // ONE shared query state between the in-place search and the drawer (OQ-034).
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [sortAsc, setSortAsc] = useState(false); // hours default DESC (the storytelling order)
  const [statusFilter, setStatusFilter] = useState<Set<CollectionStatus>>(new Set());
  const [genreFilter, setGenreFilter] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Keyed by entryId (not an item snapshot) so the sheet always derives the FRESHEST cached item —
  // a snapshot taken pre-refetch can pre-fill stale hours, and §0.4's Save-as-is would write them back.
  const [logHoursId, setLogHoursId] = useState<string | null>(null);
  // COL-12 — the peek-flip is TRANSIENT screen state (never persisted). A Set of flipped entryIds
  // (owner ruling 2026-07-12: many-flipped, not one-at-a-time); cleared on a view-switch (the effect
  // below) and on blur (the useFocusEffect cleanup). Shelf + grid only — dense-list/top still NAVIGATE.
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  // COL-13 — the TOP view ARRANGE toggle (drag re-rank + CardPicker). Cleared on any view-switch.
  const [topArranging, setTopArranging] = useState(false);
  // walk-1 — the CardPicker SHEET state lives at the SCREEN so the sheet mounts OUTSIDE the ScrollView
  // (PulledSheet contract / F-15: an absolute-fill overlay inside a scroll anchors to the scroll CONTENT
  // — top-pinned, wrong size, clipped results). SelfTopView (in-scroll) only requests open.
  const [topPickerOpen, setTopPickerOpen] = useState(false);

  // ── walk-4 P2 (OC-3) — the JUST-ADDED landing: scroll the new entry into view + pulse it ────────
  // One-shot by construction: the param is consumed into local state on arrival and immediately
  // cleared off the URL (`setParams`), so a re-render, a tab round-trip or a relog can't re-fire it.
  const listRef = useRef<FlatList<CollectionItem>>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const justAddedIdRef = useRef<string | null>(null); // the mark, readable from async callbacks
  const didScrollRef = useRef(false); // the scroll fires once per landing
  // R3 (P6 §6 row 6) — the shelf is WINDOWED now, so a far row may simply not be mounted and the old
  // Walk-4 Murr per-row y-report map (a ScrollView mechanism: native layout events fire on metric
  // CHANGE only, so an already-laid-out row never re-reported — the map recorded every row
  // continuously to cover the retained-tab landing) has no rows to report from outside the window.
  // scrollToIndex asks the LIST for the position instead: it works for unmounted rows, and
  // onScrollToIndexFailed (below) covers the not-yet-measured case with an estimated offset + retry.
  const filteredRef = useRef<CollectionItem[]>([]); // render-synced below (after the filtered memo)
  const viewRef = useRef(view);
  viewRef.current = view;
  const scrollToJustAdded = useCallback((id: string) => {
    if (didScrollRef.current) return;
    const idx = filteredRef.current.findIndex((i) => i.entryId === id);
    if (idx < 0) return; // not in the loaded shelf yet — the filtered-change effect below retries
    didScrollRef.current = true;
    // Under numColumns the list's items are ROWS — scrollToIndex takes the row index, not the item's.
    const cols = viewRef.current === 'grid' ? 2 : 1;
    listRef.current?.scrollToIndex({ index: Math.floor(idx / cols), viewOffset: 12, animated: true });
  }, []);
  // The unmeasured-target fallback (fresh mount, or a target far outside the window): jump to the
  // estimated offset so the window advances and measures, then retry the precise landing. Only our
  // own scrollToJustAdded ever calls scrollToIndex, so this converges on the one marked row.
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
      setTimeout(() => {
        if (justAddedIdRef.current != null) {
          listRef.current?.scrollToIndex({ index: info.index, viewOffset: 12, animated: true });
        }
      }, 120);
    },
    [],
  );
  // The clear timer lives in a REF, not the effect's cleanup: clearing the param immediately re-runs
  // this effect, and a cleanup-owned timer would be cancelled by that very re-run — leaving the mark
  // on forever. Re-armed per arrival, cleared only on unmount.
  const markTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const id = params.justAdded;
    if (!id) return;
    didScrollRef.current = false;
    justAddedIdRef.current = id;
    setJustAdded(id);
    router.setParams({ justAdded: undefined });
    if (markTimerRef.current) clearTimeout(markTimerRef.current);
    markTimerRef.current = setTimeout(() => {
      setJustAdded(null);
      justAddedIdRef.current = null; // the mark window also bounds the scroll retries (no late jumps)
    }, JUST_ADDED_MS);
    // The retained-tab mainline: the shelf data already holds the entry — scroll now (a frame later,
    // so a same-commit cold mount has the list mounted before the scroll issues).
    requestAnimationFrame(() => scrollToJustAdded(id));
  }, [params.justAdded, router, scrollToJustAdded]);
  useEffect(
    () => () => {
      if (markTimerRef.current) clearTimeout(markTimerRef.current);
    },
    [],
  );

  const items = useMemo(() => data?.items ?? [], [data]);
  const hero = items.find((i) => i.nowPlaying) ?? null;
  const logHoursItem = logHoursId != null ? (items.find((i) => i.entryId === logHoursId) ?? null) : null;
  // If the open entry vanishes from a landing refetch, drop the id — otherwise the sheet hides
  // with onClose never firing and a later refetch that re-includes the entry silently reopens it.
  useEffect(() => {
    if (logHoursId != null && logHoursItem === null) setLogHoursId(null);
  }, [logHoursId, logHoursItem]);

  const closeSearch = () => {
    setQ('');
    setSearchOpen(false);
  };

  // Hardware back closes the search dock instead of navigating (parity with PulledSheet's rule).
  // Web-guarded: react-native-web's BackHandler shim console.errors on every subscribe.
  // NOTE: hooks live ABOVE the isLoading/isError early returns — hook count must not vary per render.
  useEffect(() => {
    if (!searchOpen || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSearch();
      return true;
    });
    return () => sub.remove();
    // closeSearch is re-created per render; searchOpen is the real subscribe key.
  }, [searchOpen]);

  // Leaving the tab with the dock focused would strand the keyboard over the next screen (the Tabs
  // navigator keeps this screen mounted) — dismiss it on blur; the dock itself survives the round trip.
  // COL-12: the peek-flip is transient — clear every flip on blur too (spec: resets on leaving the screen).
  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
        setFlippedIds((prev) => (prev.size === 0 ? prev : new Set()));
      };
    }, []),
  );

  // COL-12 — switching view mode resets the flips (spec). Catches both the tools View cycle and the
  // drawer's set-view, since both dispatch setCollectionView → `view` changes.
  useEffect(() => {
    setFlippedIds((prev) => (prev.size === 0 ? prev : new Set()));
    setTopArranging(false); // leaving TOP (or any view cycle) exits ARRANGE
    setTopPickerOpen(false); // …and drops the picker sheet with it
  }, [view]);

  // COL-12 — a card tap toggles its flip (owner: many-flipped); the first flip retires the coachmark.
  // STABLE handlers (useCallback + the seen-ref) so the memoized FlipCards skip re-render — a tap must
  // re-render only the tapped card, never redraw all rows' skia canvases mid-animation (the round-4
  // device flicker report). Hooks, so they live ABOVE the isLoading/isError early returns.
  const coachSeenRef = useRef(col12CoachmarkSeen);
  useEffect(() => {
    coachSeenRef.current = col12CoachmarkSeen;
  }, [col12CoachmarkSeen]);
  const toggleFlip = useCallback(
    (entryId: string) => {
      setFlippedIds((prev) => {
        const next = new Set(prev);
        if (next.has(entryId)) next.delete(entryId);
        else next.add(entryId);
        return next;
      });
      if (!coachSeenRef.current) dispatch(setCol12CoachmarkSeen(true));
    },
    [dispatch],
  );
  // COL-12 — long-press (either face) + the back's VIEW GAME → the Game page (CARD-23 NAVIGATE).
  const openGame = useCallback((gameId: string) => router.push(`/game/${gameId}`), [router]);

  // COL-07/09 — client-side query execution over the loaded shelf (D2).
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
    if (sortKey !== 'order') {
      out = [...out].sort((a, b) => {
        const cmp =
          sortKey === 'hours'
            ? a.hours - b.hours
            : sortKey === 'ownedSince'
              ? (a.ownedSince ?? '').localeCompare(b.ownedSince ?? '')
              : sortKey === 'recent'
                ? a.addedAt.localeCompare(b.addedAt) // ISO timestamps sort chronologically (OQ-128)
                : a.title.localeCompare(b.title);
        return sortAsc ? cmp : -cmp;
      });
    } else if (sortAsc) {
      out = [...out].reverse(); // MY ORDER flipped
    }
    return out;
  }, [items, q, statusFilter, genreFilter, sortKey, sortAsc]);
  filteredRef.current = filtered; // render-synced for the just-added scroll (index lookup at call time)

  // The cold-mount landing retry: the param effect can consume `justAdded` before the shelf data
  // lands (the query is still in flight behind the isLoading return) — when the entry appears in
  // `filtered`, land on it. Replaces the old per-row layout-report retry, which needed a mounted row.
  useEffect(() => {
    if (justAddedIdRef.current != null && !didScrollRef.current) scrollToJustAdded(justAddedIdRef.current);
  }, [filtered, scrollToJustAdded]);

  // ── R3 (P6 §6 row 6) — the windowed shelf: per-view row renderers for the FlatList. Hooks, so they
  // live ABOVE the isLoading/isError early returns. `renderRow`'s identity changing on flip/mark
  // state is what re-renders the visible cells; the memoized row components below then bail for
  // every row whose own {item, flipped, marked} didn't change — the same "a tap re-renders only the
  // tapped card" contract the unwindowed .map() rows kept (round-4 device flicker report). ────────
  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<CollectionItem>) => {
      const marked = item.entryId === justAdded;
      if (view === 'list') return <ListRow item={item} marked={marked} onNavigate={openGame} />;
      if (view === 'grid') {
        return (
          <GridCell
            item={item}
            flipped={flippedIds.has(item.entryId)}
            marked={marked}
            onToggle={toggleFlip}
            onNavigate={openGame}
          />
        );
      }
      return (
        <ShelfRow
          item={item}
          flipped={flippedIds.has(item.entryId)}
          marked={marked}
          onToggle={toggleFlip}
          onNavigate={openGame}
        />
      );
    },
    [view, flippedIds, justAdded, toggleFlip, openGame],
  );
  const keyExtractor = useCallback((i: CollectionItem) => i.entryId, []);
  // The inter-row gap rides an explicit separator, NEVER `gap` on the content container: the
  // virtualized list interleaves its own spacer/cell wrapper children there, and a container gap
  // would add phantom spacing around them as the window moves.
  const RowSeparator = useCallback(
    () => <View style={view === 'list' ? styles.listSepGap : styles.rowSepGap} />,
    [view, styles],
  );

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.brand.accent} />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errTitle}>SIGNAL LOST</Text>
        <Text style={styles.errSub}>Couldn’t load your collection.</Text>
        <ScreenButton label="Retry" variant="action-alt" onPress={() => refetch()} />
      </View>
    );
  }

  const cycleView = () => {
    const next = VIEW_ORDER[(VIEW_ORDER.indexOf(view) + 1) % VIEW_ORDER.length]!;
    dispatch(setCollectionView(next));
  };
  // The Now-Playing hero persists across all three browse modes (decision 0061) — LOG HOURS opens
  // the hero's sheet from whichever mode is showing.
  const onLogHours = () => hero && setLogHoursId(hero.entryId);
  // OQ-130 — the filtered-to-zero "no results" beat's clear action: drop all filters + exit search.
  const clearAll = () => {
    setStatusFilter(new Set());
    setGenreFilter(new Set());
    closeSearch();
  };

  // COL-12 discoverability — the one-time coachmark, gated on the persisted flag; only where cards flip
  // (shelf/grid), when there's something to flip and no active query (search results replace the view).
  const flippableView = view === 'shelf' || view === 'grid';
  const showCoachmark =
    !col12CoachmarkSeen && flippableView && q.trim() === '' && data.collectionTotal > 0 && filtered.length > 0;

  // S3-j / §0.3 — count copy: "N game(s)" unfiltered · "N of M games" filtered (singular-aware);
  // absent until the first add (the board shows no count keycap on the empty shelf, :491).
  const filterActive = q.trim() !== '' || statusFilter.size > 0 || genreFilter.size > 0;
  const total = data.collectionTotal;
  const games = (n: number) => (n === 1 ? 'GAME' : 'GAMES');
  // TOP view wears the curated-list label, not the shelf total (board :1044).
  const countLabel =
    total === 0
      ? undefined
      : view === 'top'
        ? 'TOP 10'
        : filterActive
          ? `${filtered.length} OF ${total} ${games(total)}`
          : `${total} ${games(total)}`;

  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        {/* honest totals — filtered count OF the whole shelf (the C4 class); S3-j copy */}
        <ScreenHead
          title="Collection"
          count={countLabel}
          trailing={
            <CurrencyCounter
              balance={wallet?.balance ?? 0}
              onPress={() => router.push({ pathname: '/store', params: { view: 'wallet' } })}
            />
          }
        />
      </View>
      {/* stage — the space between header + tools; the scrollable shelf/grid lives here alone.
          R3 (P6 §6 row 6): TWO lanes. The N-scaling browse views (shelf · grid · list) render through
          a WINDOWED FlatList — the pre-R3 ScrollView+.map() mounted all N FlipCards at once (N live
          skia canvases + N SVG backs, load-harness cliff #1). The bounded views (TOP's curated 10 ·
          the empty shelf) keep a plain ScrollView. NoResults rides the FlatList's ListEmptyComponent,
          NOT a lane switch — typing a query that oscillates matched↔zero must never remount the list
          (a lane swap would rebuild every visible canvas per keystroke). */}
      <View style={styles.stage}>
      <ScrollLockContext.Provider value={scrollLockApi}>
      {view === 'top' || data.collectionTotal === 0 ? (
        <ScrollView testID="collection-scroll" style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEnabled={!bgLocked && dragScrollEnabled}>
          {/* In-place search: the query live-filters the CURRENT view + a RESULTS header (board :661). */}
          {searchOpen && q.trim() !== '' && data.collectionTotal > 0 ? (
            <Text style={styles.resultsHead}>RESULTS — TITLE · DEVELOPER · PUBLISHER</Text>
          ) : null}
          {data.collectionTotal === 0 ? (
            <EmptyShelf onAdd={() => router.push('/add-game')} />
          ) : filtered.length === 0 ? (
            // OQ-130 — filters/search matched nothing but the shelf isn't empty (TOP lane too).
            <NoResults onClear={clearAll} />
          ) : (
            // COL-13 — the curated Top-10 over the FULL shelf (curation is independent of sort/filter).
            // No just-added treatment here: TOP is a curated 10, and a fresh add is not in it.
            <SelfTopView
              collectionItems={items}
              arranging={topArranging}
              onOpenPicker={() => setTopPickerOpen(true)}
              focusGameId={params.focus}
              onOpenGame={openGame}
            />
          )}
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          // numColumns cannot change on a live list (RN invariant) — the view switch remounts it.
          // Each view is a wholly different subtree anyway (the old lane unmounted ShelfView and
          // mounted GridView), so the cost profile is unchanged; the scroll offset resets to top on
          // a view switch (the one behavior delta — flips already reset there too).
          key={view}
          testID="collection-scroll"
          style={styles.scroll}
          contentContainerStyle={styles.listBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!bgLocked && dragScrollEnabled}
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          numColumns={view === 'grid' ? 2 : 1}
          columnWrapperStyle={view === 'grid' ? styles.gridRow : undefined}
          ItemSeparatorComponent={RowSeparator}
          // The windowing policy (owner-eye): ~10 rows up front (two screensful of shelf rows; a
          // comfortable first paint for the shorter list strips), batches of 8, a 7-viewport window
          // (≈21 shelf rows resident) — at today's N=18 everything sits inside the window (zero
          // visual change); at N=200+ the resident canvas count is capped near ~21 instead of N.
          // removeClippedSubviews stays the RN platform default (Android on, iOS off) — forcing it
          // on iOS re-opens the rasterize/transform surfaces the flip rounds hardened.
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          onScrollToIndexFailed={onScrollToIndexFailed}
          ListHeaderComponent={
            // In-place search RESULTS header + the Now-Playing hero (persists across the browse
            // modes, 0061, but YIELDS while a query is active — board :711–713). One wrapper so an
            // absent header contributes no phantom margin.
            (searchOpen && q.trim() !== '') || (q.trim() === '' && filtered.length > 0) ? (
              <View style={styles.listHead}>
                {searchOpen && q.trim() !== '' ? (
                  <Text style={styles.resultsHead}>RESULTS — TITLE · DEVELOPER · PUBLISHER</Text>
                ) : null}
                {q.trim() === '' && filtered.length > 0 ? (
                  <NowPlayingHero hero={hero} onLogHours={onLogHours} />
                ) : null}
              </View>
            ) : null
          }
          // OQ-130 — filters/search matched nothing but the shelf isn't empty.
          ListEmptyComponent={<NoResults onClear={clearAll} />}
        />
      )}
      </ScrollLockContext.Provider>
      </View>

      {/* COL-12/CARD-16 — the first-run peek-flip hint. Walk-4 P5-a: no floating elements in this
          design language, so the hint is docked as an in-flow strip directly ABOVE the tools/add bar
          (not an absolute overlay). It still lives OUTSIDE the scrollable stage — appearing/dismissing
          it only grows/shrinks this strip's own slot, so the shelf/grid below never reflows (the
          walk-3 "dismiss moved 0 of 35 cards" bar holds without needing position: absolute). */}
      {showCoachmark ? (
        <View style={styles.coachStrip} testID="coachmark-overlay">
          <Coachmark text="Tap a card to flip it for your stats." onDismiss={() => dispatch(setCol12CoachmarkSeen(true))} />
        </View>
      ) : null}

      {/* The ToolsBar (§2.1 · OQ-034): keycaps ACT · long-press opens the drawer. Tapping Search MORPHS
          the whole bar into a docked SearchField that lifts over the keyboard (R0-2 KeyboardLift, board
          :689–695); the ⊗ clears the query and exits search. */}
      {searchOpen ? (
        <KeyboardLift>
          <View style={styles.searchBar}>
            <View style={styles.searchFieldWrap}>
              {/* Keyboard SEARCH = the non-destructive exit: un-morph, KEEP the query (the Search
                  keycap returns pressed + pip via its q-based active predicate). ⊗ clears (board :712). */}
              <SearchField
                value={q}
                onChangeText={setQ}
                placeholder="Title · developer · publisher"
                autoFocus
                onSubmit={() => setSearchOpen(false)}
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
        <View style={styles.tools} testID="collection-tools-bar">
          <ToolButton
            icon={<SearchIcon />}
            label="Search"
            active={q.trim() !== ''}
            onPress={() => setSearchOpen(true)}
            onLongPress={() => setDrawerOpen(true)}
          />
          <ToolButton
            icon={<SortIcon active={sortKey !== 'order' || sortAsc} asc={sortAsc} />}
            label="Sort"
            active={sortKey !== 'order' || sortAsc}
            onPress={() => setSortAsc(!sortAsc)}
            onLongPress={() => setDrawerOpen(true)}
          />
          <ToolButton
            icon={<FilterIcon />}
            label="Filter"
            active={statusFilter.size > 0 || genreFilter.size > 0}
            onPress={() => setDrawerOpen(true)}
          />
          <ToolButton
            icon={<ViewIcon view={view} />}
            label="View"
            active={view !== 'shelf'}
            onPress={cycleView}
            onLongPress={() => setDrawerOpen(true)}
          />
          <View style={styles.spacer} />
          {view === 'top' ? (
            // COL-13 — in TOP, the trailing keycap is ARRANGE (enter edit) ↔ DONE (commit + exit); the
            // gold ADD is absent here (curation is non-commerce — 0069). walk-5c (owner placement
            // ruling): the ONE DONE lives HERE on the tools bar — the tv-bar inside the view is a pure
            // "N / 10 SEATED" status readout, no button (reverses walk-5a's keep, which had picked the
            // tv-bar copy; there is still exactly one DONE on screen).
            data.collectionTotal > 0 ? (
              <ScreenButton
                label={topArranging ? 'Done' : 'Arrange'}
                variant="action-alt"
                onPress={() => setTopArranging((v) => !v)}
              />
            ) : null
          ) : (
            /* R2 (2a) — the '+' glyph is 12 to match the tools-bar glyphs (FilterIcon etc.); button base size. */
            <ScreenButton label="Add" variant="add" icon={<PlusIcon size={12} />} onPress={() => router.push('/add-game')} />
          )}
        </View>
      )}

      <SortFilterSheet
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        q={q}
        setQ={setQ}
        view={view}
        setView={(v) => dispatch(setCollectionView(v))}
        sortKey={sortKey}
        setSortKey={setSortKey}
        sortAsc={sortAsc}
        setSortAsc={setSortAsc}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        genreFilter={genreFilter}
        setGenreFilter={setGenreFilter}
        genres={[...new Map(items.flatMap((i) => i.genres).map((g) => [g.id, g])).values()]}
      />

      <LogHoursSheet item={logHoursItem} onClose={() => setLogHoursId(null)} />

      {/* walk-1 — the TOP CardPicker mounts HERE, a SCREEN-ROOT sibling of the ScrollView (PulledSheet
          contract; the game/[id] CardDetailSheet / store ItemSheet pattern). Inside the scroll it
          anchored to the scroll content: top-pinned, wrong size, results clipped (F-15 class). */}
      <TopTenCardPicker
        visible={topPickerOpen}
        onClose={() => setTopPickerOpen(false)}
        collectionItems={items}
      />
    </View>
  );
}

// The Now-Playing hero, shared across all three browse modes (decision 0061): the pinned card +
// NOW PLAYING eyebrow · stat-line · title · catalog line · LOG HOURS (hero-exclusive). Unset → the
// "set your Now Playing" nudge (WTP-03; the per-game picker is M4, §0.5/0.8).
function NowPlayingHero({ hero, onLogHours }: { hero: CollectionItem | null; onLogHours: () => void }) {
  const router = useRouter(); // CARD-23 NAVIGATE — the now-playing hero card → the Game page (mode 1)
  const styles = useStyles();
  const t = useTheme();
  if (!hero) {
    return (
      <View style={styles.nudge}>
        <Text style={styles.nudgeTitle}>SET YOUR NOW PLAYING</Text>
        <Text style={styles.nudgeSub}>Pin the game you’re on — it leads the shelf.</Text>
      </View>
    );
  }
  return (
    <View style={styles.hero}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${hero.title}`}
        onPress={() => router.push(`/game/${hero.gameId}`)}
      >
        <EntryCard
          title={hero.title}
          card={hero.card}
          size="grid"
          width={138}
          height={193}
          animate // the ONE now-playing hero — animated cosmetics run here (0068 opt-in)
        />
      </Pressable>
      <View style={styles.heroMeta}>
        <Text style={styles.heroEyebrow}>NOW PLAYING</Text>
        <Text style={styles.heroStat}>{statLine(hero)}</Text>
        <Text style={styles.heroTitle}>{hero.title.toUpperCase()}</Text>
        <Text style={styles.heroCatalog}>{catalogLine(hero)}</Text>
        <ScreenButton
          label="Log hours"
          icon={<PlusIcon color={t.scr.accentInk} size={11} />}
          onPress={onLogHours}
          style={styles.heroBtn}
        />
      </View>
    </View>
  );
}

// The COL-12 flip + walk-4 just-added wiring shared by the windowed rows. Each row takes per-row
// BOOLEANS (`flipped`, `marked`) — never the whole Set/mark — so the row memo below can bail for
// every row a flip/mark change doesn't touch (the round-4 "a tap re-renders only the tapped card"
// contract, now enforced one level higher than FlipCard's own memo).
type RowProps = {
  item: CollectionItem;
  marked: boolean; // this row is the fresh add — wear the JustAddedPulse
  onNavigate: (gameId: string) => void;
};
type FlipRowProps = RowProps & {
  flipped: boolean;
  onToggle: (entryId: string) => void;
};

// ── walk-4 P2 (OC-3) — the JUST-ADDED landing treatment ────────────────────────────────────────────
// How long the new entry stays marked after the add flow lands (the OC-3 "~1.5s highlight pulse").
const JUST_ADDED_MS = 1500;

// The pulse itself — an ABSOLUTE-FILL accent outline over the row. Absolute so it adds no height and
// shifts nothing (the same layout-stability rule the coachmark strip and the search status slot obey):
// a row that grows a border when it's marked would jog the whole shelf. Three quick beats over the
// ~1.5s window, then it unmounts with the state — self-terminating, never an idle loop (P6 lane).
// Reduce-motion (§104) holds a steady outline for the same window instead of pulsing.
function JustAddedPulse({ entryId }: { entryId: string }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const beat = () =>
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]);
    const anim = Animated.sequence([beat(), beat(), beat()]);
    anim.start();
    return () => anim.stop();
  }, [opacity, reduceMotion]);
  return (
    <Animated.View
      testID={`just-added-${entryId}`}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderWidth: 2, borderColor: t.scr.accent },
        reduceMotion ? null : { opacity },
      ]}
    />
  );
}

// SHELF row (decision 0061 — the showcase / "flip through your binder"): EVERY entry gets the hero
// treatment (full face + stat-line · title · catalog line). LOG HOURS stays hero-exclusive (the
// NowPlayingHero, rendered by the list header). Now-playing chrome is hero-only (W-B6) — the stack
// rows carry no NOW tag.
// COL-12: the card is a FlipCard (tap → flip · long-press / VIEW GAME → the Game page); the meta
// beside it stays display-only labels (the quick scan lives beside the full peek, board :1377).
const ShelfRow = memo(function ShelfRow({ item, flipped, marked, onToggle, onNavigate }: FlipRowProps) {
  const styles = useStyles();
  return (
    <View style={styles.stackRow}>
      {/* cardSlot — GRID PARITY (the round-9 fix): the identical FlipCard renders the turn
          perfectly in the grid, whose cell is a card-tight box, and broke ONLY here in the wide
          shelf row where the mis-drawn mid-turn svg (owner's recording) could sweep across the
          sibling meta text. The slot recreates the grid's structure: a REAL (overflow:'hidden' →
          never flattened), card-sized, CLIPPING native ancestor — nothing the turning card paints
          can cross a masksToBounds boundary onto the row, by construction. Handlers passed RAW
          (an inline closure would defeat FlipCard's memo — the round-4 all-rows redraw). */}
      <View style={styles.cardSlot} collapsable={false}>
        <FlipCard
          item={item}
          flipped={flipped}
          onToggle={onToggle}
          onNavigate={onNavigate}
          width={138}
          height={193}
        />
      </View>
      {/* Owner walk (m6) — the WHOLE row-body (meta + chevron) press-navigates to the Game page,
          not just the chevron; the card face keeps its own flip tap. This Pressable is a SIBLING
          of the card slot, NEVER its ancestor: RN-web routes a nested press to the OUTER responder
          (P13-F3 — the CommunityGallery sibling-Pressable fix), so keeping the card outside this
          button is what lets the card's own tap still win (flip, not navigate). One button per row
          ("Open {game}"); the card face is its own labeled control. (walk2 B7 folded the chevron
          in — same affordance, now the whole body carries it.) */}
      <Pressable
        style={styles.rowBody}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}`}
        onPress={() => onNavigate(item.gameId)}
      >
        <View style={styles.heroMeta}>
          <Text style={styles.heroStat}>{statLine(item)}</Text>
          <Text style={styles.heroTitle}>{item.title.toUpperCase()}</Text>
          <Text style={styles.heroCatalog}>{catalogLine(item)}</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      {marked ? <JustAddedPulse entryId={item.entryId} /> : null}
    </View>
  );
});

// GRID cell (decision 0061 — compact browsing): two-per-row bare card FACES (never cropped, F-01);
// no per-row meta. The hero renders in the list header.
// COL-12: each face is a FlipCard (tap → flip · long-press / VIEW GAME → the Game page).
const GridCell = memo(function GridCell({ item, flipped, marked, onToggle, onNavigate }: FlipRowProps) {
  const styles = useStyles();
  return (
    <View style={styles.gridCol}>
      {/* raw handlers — same memo rule as the shelf rows. */}
      <FlipCard item={item} flipped={flipped} onToggle={onToggle} onNavigate={onNavigate} style={styles.fluidCard} />
      {marked ? <JustAddedPulse entryId={item.entryId} /> : null}
    </View>
  );
});

// LIST row (management scan): dense strip — thumb + title + HRS · STATUS + chevron → the Game page
// (CARD-23 NAVIGATE — the list row is the Game-page tap-target, M4 §3.1). The always-visible
// per-row stats mode; hero in the list header.
const ListRow = memo(function ListRow({ item, marked, onNavigate }: RowProps) {
  const styles = useStyles();
  return (
    <Pressable
      style={styles.strip}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
      onPress={() => onNavigate(item.gameId)}
    >
      <EntryCard title={item.title} card={item.card} size="thumb" />
      <View style={styles.stripMeta}>
        <View style={styles.stripTitleRow}>
          <Text style={styles.stripTitle} numberOfLines={1}>
            {item.title.toUpperCase()}
          </Text>
          {/* walk2 B6 ⚖ (owner ruling 2026-07-17, 0078) — the ▶ NOW inline tag is GONE from list
              rows: now-playing renders in the HERO ONLY; the entry stays as a plain row. The board
              drew the inline tag (collection-states :681) — the ruling supersedes it (0078 ripple). */}
        </View>
        <Text style={styles.rowSub}>{statLine(item)}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
      {marked ? <JustAddedPulse entryId={item.entryId} /> : null}
    </Pressable>
  );
});

// TOP (COL-13) is now the curated Top-10 view-mode — see SelfTopView in components/collection/TopCurated.tsx
// (the hours-sorted placeholder that lived here was retired at M6 P10 when /me/lists went live).

function EmptyShelf({ onAdd }: { onAdd: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <Text style={styles.nudgeTitle}>YOUR SHELF IS EMPTY</Text>
      <Text style={styles.nudgeSub}>Add your first game — the catalog is community-built.</Text>
      <ScreenButton label="Add a game" variant="add" icon={<PlusIcon />} onPress={onAdd} />
      <TertiaryLink label="Can't find your game? Be the first to add it" onPress={onAdd} dim />
    </View>
  );
}

// OQ-130 — the filtered-to-zero beat: the shelf HAS games, but the current search/filters match none.
// A calm message + a Clear affordance (drops filters + exits search) so it's never a dead end.
function NoResults({ onClear }: { onClear: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.noResults}>
      <Text style={styles.noResultsTitle}>NO MATCHES</Text>
      <Text style={styles.noResultsSub}>Nothing on your shelf matches your search or filters.</Text>
      <TertiaryLink label="Clear" onPress={onClear} />
    </View>
  );
}

// The pulled sort/filter drawer (D2 — full board grammar, client-side): scoped search · views ·
// sorts + ASC/DESC · status + genre filters. One shared query state with the in-place search.
function SortFilterSheet(props: {
  visible: boolean;
  onClose: () => void;
  q: string;
  setQ: (v: string) => void;
  view: CollectionView;
  setView: (v: CollectionView) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  sortAsc: boolean;
  setSortAsc: (v: boolean) => void;
  statusFilter: Set<CollectionStatus>;
  setStatusFilter: (s: Set<CollectionStatus>) => void;
  genreFilter: Set<string>;
  setGenreFilter: (s: Set<string>) => void;
  genres: GenreView[];
}) {
  const styles = useStyles();
  const toggle = <T,>(set: Set<T>, value: T, put: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    put(next);
  };
  const reset = () => {
    props.setQ('');
    props.setSortKey('order');
    props.setSortAsc(false);
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
      {/* S3-h/i: no standalone ASC/DESC chip — the active sort shows ↑/↓ and re-tapping it flips
          (the board's "tap the active sort to flip", :598); direction also folds onto the Sort tool. */}
      <SheetSection title="Sort">
        <View style={styles.chipRow}>
          {SORTS.map((s) => {
            const isActive = props.sortKey === s.key;
            return (
              <GenreTag
                key={s.key}
                label={`${s.label}${isActive ? (props.sortAsc ? ' ↑' : ' ↓') : ''}`}
                selected={isActive}
                onPress={() => {
                  if (isActive) props.setSortAsc(!props.sortAsc);
                  else {
                    props.setSortKey(s.key);
                    props.setSortAsc(s.key === 'title'); // OQ-129 — A–Z opens ascending (A first); others descending
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
              onPress={() => toggle(props.statusFilter, s, props.setStatusFilter)}
            />
          ))}
        </View>
      </SheetSection>
      {/* S3-g: ALL genre option, same grammar. */}
      {props.genres.length > 0 ? (
        <SheetSection title="Genre">
          <View style={styles.chipRow}>
            <GenreTag label="All" selected={props.genreFilter.size === 0} onPress={() => props.setGenreFilter(new Set())} />
            {props.genres.map((g) => (
              <GenreTag
                key={g.id}
                label={g.name}
                selected={props.genreFilter.has(g.id)}
                onPress={() => toggle(props.genreFilter, g.id, props.setGenreFilter)}
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

// The hero's quick log-hours beat (decision 0011 — the Collection hero action; COL-03 cap server-enforced).
function LogHoursSheet({ item, onClose }: { item: CollectionItem | null; onClose: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updateEntry, state] = useUpdateEntryMutation();

  // S3-m / §0.4 — pre-fill the field with the current hours (as the VALUE, not a placeholder over an
  // empty field): Save-as-is keeps it, and CLEARING it is what trips the empty-guard error below.
  // Value-driven deps (not item identity): every refetch re-parses the response into fresh objects,
  // and an identity dep would re-seed — wiping in-progress typing — even when hours didn't change.
  useEffect(() => {
    if (item) {
      setValue(String(item.hours));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional value-driven deps (see above); `item` identity would re-seed and wipe in-progress typing
  }, [item?.entryId, item?.hours]);

  async function save() {
    if (!item) return;
    if (value.trim() === '') {
      // Number('') === 0 would silently OVERWRITE the logged hours with 0 — reject empty first.
      setError('Enter your total hours.');
      return;
    }
    const hours = Number(value);
    if (!Number.isInteger(hours) || hours < 0) {
      setError('Whole hours only.');
      return;
    }
    try {
      await updateEntry({ entryId: item.entryId, hours }).unwrap();
      setValue('');
      setError(null);
      onClose();
    } catch (e) {
      const detail = (e as { data?: { error?: { details?: { message: string }[] } } })?.data?.error;
      setError(detail?.details?.[0]?.message ?? 'Couldn’t save. Try again.');
    }
  }

  return (
    <PulledSheet visible={item !== null} onClose={onClose} title="Log Hours">
      <SheetSection title={item?.title ?? ''}>
        <TextField
          label="Total hours"
          value={value}
          onChangeText={setValue}
          placeholder={item ? String(item.hours) : '0'}
          keyboardType="number-pad"
          error={error}
        />
      </SheetSection>
      <ScreenButton label={state.isLoading ? '…' : 'Save'} onPress={save} disabled={state.isLoading} block />
    </PulledSheet>
  );
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.sheetSection}>
      <Text style={styles.sheetHead}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: t.space.lg },
  errTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.accent, letterSpacing: 1 },
  errSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim },
  pad: { ...SCREEN_HEADER_PAD, gap: t.space.md }, // W-B1 — the reference geometry, now the shared constant
  // stage — fills the space between header + tools; the scrollable shelf/grid lives here alone.
  stage: { flex: 1 },
  // walk-4 P5-a — the peek-flip hint is a docked, in-flow strip directly above the tools bar (no
  // floating elements). It sits OUTSIDE stage (not inside the ScrollView), so its own mount/unmount
  // never touches the shelf/grid's layout — the walk-3 "dismiss shifted the list" jar stays fixed
  // without relying on absolute positioning.
  coachStrip: {},
  scroll: { flex: 1 },
  body: { padding: t.space.lg, gap: t.space.lg },
  // OQ-130 — filtered-to-zero "no results" beat.
  noResults: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.xxl },
  noResultsTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  noResultsSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center' },
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
  // S3-o — the gold ADD reads larger than the cream tool keycaps (the one loud object). Token-driven
  // padding; the "+" icon (PlusIcon) adds height, the F-02 step (add variant) adds the card signature.
  // 1c — the in-place search dock: the tools bar becomes a cream SearchField + ⊗ clear, same slot,
  // same border/background chrome so the morph reads in place (board `.tools.search-bar`, :689–695).
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
  searchClear: {
    width: 32,
    height: 30,
    backgroundColor: t.brand.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  // R3 — the windowed list's chrome. The content container carries padding ONLY (no `gap` — the
  // virtualized cells/spacers are its direct children; spacing rides the explicit separators).
  listBody: { padding: t.space.lg },
  // header (results head + hero) → first row: the same lg beat the old `body` gap gave it.
  listHead: { gap: t.space.lg, marginBottom: t.space.lg },
  rowSepGap: { height: t.space.lg }, // shelf rows + grid rows (the old shelfStack gap / gridWrap rowGap)
  listSepGap: { height: t.space.sm + 1 }, // list strips (the old listStack gap)
  gridRow: { justifyContent: 'space-between' }, // the grid's column wrapper (the old gridWrap axis)
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: t.space.lg,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  heroCard: { width: 138, height: 193 }, // mockup `.gcard.hero-size`
  // Owner walk (m6) — the shelf row-body: the meta + chevron as ONE navigate button beside the card.
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroMeta: { flex: 1, justifyContent: 'center', gap: 7 },
  heroEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 2 },
  heroStat: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  heroTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1 },
  heroCatalog: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  heroBtn: { alignSelf: 'flex-start', marginTop: t.space.sm },
  nudge: {
    padding: t.space.xl,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    gap: t.space.sm,
  },
  nudgeTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  nudgeSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16 },
  empty: { alignItems: 'flex-start', gap: t.space.lg, padding: t.space.xl, backgroundColor: t.scr.panel },
  // COL-12 round-9 — the card's grid-parity slot: real (overflow prevents flattening), card-tight,
  // clipping. The masksToBounds boundary is what keeps the turning card's paint off the row's meta text.
  cardSlot: { width: 138, height: 193, overflow: 'hidden' },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: t.space.lg,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  // GRID (decision 0061) — two-per-row bare card faces (board `.grid` 1fr/1fr).
  gridCol: { width: '48%' },
  fluidCard: { width: '100%', height: 'auto', aspectRatio: 63 / 88 }, // mockup `.grid-size`
  // LIST — dense strip rows (board `.strip`; the stack gap rides listSepGap).
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
  },
  stripMeta: { flex: 1, gap: t.space.xs, minWidth: 0 },
  stripTitleRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  stripTitle: { flexShrink: 1, fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  chev: { marginLeft: 'auto', fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },
  list: { gap: t.space.md },
  rowMeta: { flex: 1, gap: 1 },
  rowTitle: { fontFamily: t.font.screenSemi, fontSize: t.type.title, color: t.scr.ink },
  rowSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    padding: t.space.md,
  },
  topRowFirst: { borderColor: t.scr.accent },
  rank: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim, width: 30 },
  // C6/F-02 — the TOP list #1 marker is the on-screen ACCENT (orange), never gold.
  rankFirst: { color: t.scr.accent, fontSize: t.type.display },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: t.space.sm },
  resetLink: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  sheetSection: { gap: t.space.md },
  sheetHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
}));
