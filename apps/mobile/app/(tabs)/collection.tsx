import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { CollectionItem, CollectionStatus, GenreView } from '@ingame/shared';
import { ScreenHead } from '../../src/components/ScreenHead';
import { GameCard } from '../../src/components/GameCard';
import { ScreenButton } from '../../src/components/ScreenButton';
import { ToolButton } from '../../src/components/ToolButton';
import { SearchField } from '../../src/components/SearchField';
import { PulledSheet } from '../../src/components/PulledSheet';
import { TextField } from '../../src/components/TextField';
import { GenreTag } from '../../src/components/GenreTag';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { theme } from '../../src/theme';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { setCollectionView, type CollectionView } from '../../src/store/prefsSlice';
import { useGetCollectionQuery, useUpdateEntryMutation } from '../../src/store/api';

// The REAL Collection (COL-01..09 · WTP-03) — the M2 scratch-seed retired; everything renders from
// GET /me/collection. D2/decision 0058: the sort/filter/search DRAWER executes CLIENT-SIDE over the
// loaded shelf (D4 unpaginated); the tools-bar keycaps ACT, the drawer CONFIGURES (OQ-034), the view
// keycap CYCLES SHELF·GRID·LIST·TOP (the board's no-segmented-switchers grammar), the gold ADD docks
// right (F-02). Card faces are the CARD-18 default until M4; the COL-12 peek-flip rides M4 (D1).

const VIEW_ORDER: CollectionView[] = ['shelf', 'grid', 'list', 'top'];
const SORTS = [
  { key: 'order', label: 'MY ORDER' },
  { key: 'hours', label: 'HOURS' },
  { key: 'ownedSince', label: 'OWNED SINCE' },
  { key: 'title', label: 'A–Z' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];
const STATUSES: CollectionStatus[] = ['backlog', 'playing', 'beaten', 'completed', 'dropped', 'wishlist'];
/** COL-02 display names (`completed` = "Completed 100%"). */
const STATUS_LABEL: Record<CollectionStatus, string> = {
  backlog: 'BACKLOG',
  playing: 'PLAYING',
  beaten: 'BEATEN',
  completed: 'COMPLETED 100%',
  dropped: 'DROPPED',
  wishlist: 'WISHLIST',
};

export default function Collection() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const view = useAppSelector((s) => s.prefs.collectionView);
  const { data, isLoading, isError, refetch } = useGetCollectionQuery();

  // ONE shared query state between the in-place search and the drawer (OQ-034).
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [sortAsc, setSortAsc] = useState(false); // hours default DESC (the storytelling order)
  const [statusFilter, setStatusFilter] = useState<Set<CollectionStatus>>(new Set());
  const [genreFilter, setGenreFilter] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logHoursFor, setLogHoursFor] = useState<CollectionItem | null>(null);

  const items = useMemo(() => data?.items ?? [], [data]);
  const hero = items.find((i) => i.nowPlaying) ?? null;

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
              : a.title.localeCompare(b.title);
        return sortAsc ? cmp : -cmp;
      });
    } else if (sortAsc) {
      out = [...out].reverse(); // MY ORDER flipped
    }
    return out;
  }, [items, q, statusFilter, genreFilter, sortKey, sortAsc]);

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

  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        {/* honest totals — filtered count OF the whole shelf (the C4 class) */}
        <ScreenHead title="Collection" count={`${filtered.length} OF ${data.collectionTotal}`} />
        {searchOpen ? (
          <SearchField value={q} onChangeText={setQ} placeholder="Search title · studio" autoFocus />
        ) : null}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {data.collectionTotal === 0 ? (
          <EmptyShelf onAdd={() => router.push('/add-game')} />
        ) : view === 'list' ? (
          <ListView items={filtered} />
        ) : view === 'top' ? (
          <TopView items={filtered} />
        ) : view === 'grid' ? (
          <GridView items={filtered} />
        ) : (
          <ShelfView items={filtered} hero={hero} onLogHours={() => hero && setLogHoursFor(hero)} />
        )}
      </ScrollView>

      {/* The ToolsBar (§2.1): keycaps ACT · long-press opens the drawer at that concern (OQ-034). */}
      <View style={styles.tools}>
        <ToolButton
          glyph="⌕"
          label="Search"
          active={searchOpen || q.length > 0}
          onPress={() => {
            if (searchOpen) setQ('');
            setSearchOpen(!searchOpen);
          }}
          onLongPress={() => setDrawerOpen(true)}
        />
        <ToolButton
          glyph="⇅"
          label="Sort"
          active={sortKey !== 'order' || sortAsc}
          onPress={() => setSortAsc(!sortAsc)}
          onLongPress={() => setDrawerOpen(true)}
        />
        <ToolButton
          glyph="≡"
          label="Filter"
          active={statusFilter.size > 0 || genreFilter.size > 0}
          onPress={() => setDrawerOpen(true)}
        />
        <ToolButton glyph="▤" label={view} onPress={cycleView} onLongPress={() => setDrawerOpen(true)} />
        <View style={styles.spacer} />
        <ScreenButton label="+ Add" variant="add" onPress={() => router.push('/add-game')} />
      </View>

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

      <LogHoursSheet item={logHoursFor} onClose={() => setLogHoursFor(null)} />
    </View>
  );
}

// SHELF (decision 0057): ONE Now-Playing hero (card + NOW PLAYING eyebrow · stat-line · title ·
// the M3 catalog line · LOG HOURS) over TWO-per-row bare card faces — no per-row meta (stats live
// in LIST; the COL-12 flip rides M4, D1).
function ShelfView({
  items,
  hero,
  onLogHours,
}: {
  items: CollectionItem[];
  hero: CollectionItem | null;
  onLogHours: () => void;
}) {
  return (
    <View style={styles.shelf}>
      {hero ? (
        <View style={styles.hero}>
          <GameCard title={hero.title} size="grid" style={styles.heroCard} />
          <View style={styles.heroMeta}>
            <Text style={styles.heroEyebrow}>NOW PLAYING</Text>
            <Text style={styles.heroStat}>
              {hero.hours}H · {STATUS_LABEL[hero.status]}
            </Text>
            <Text style={styles.heroTitle}>{hero.title.toUpperCase()}</Text>
            <Text style={styles.heroCatalog}>
              {[hero.developer, hero.releaseYear].filter(Boolean).join(' · ').toUpperCase()}
            </Text>
            <ScreenButton label="Log hours" onPress={onLogHours} style={styles.heroBtn} />
          </View>
        </View>
      ) : (
        <View style={styles.nudge}>
          <Text style={styles.nudgeTitle}>SET YOUR NOW PLAYING</Text>
          <Text style={styles.nudgeSub}>Pin the game you’re on — it leads the shelf (WTP-03).</Text>
        </View>
      )}
      <View style={styles.shelfWrap}>
        {items.map((i) => (
          <View key={i.entryId} style={styles.shelfCol}>
            <GameCard title={i.title} size="grid" nowPlaying={i.nowPlaying} style={styles.fluidCard} />
          </View>
        ))}
      </View>
    </View>
  );
}

function GridView({ items }: { items: CollectionItem[] }) {
  return (
    <View style={styles.wrap}>
      {items.map((i) => (
        <GameCard key={i.entryId} title={i.title} size="cell" nowPlaying={i.nowPlaying} />
      ))}
    </View>
  );
}

function ListView({ items }: { items: CollectionItem[] }) {
  return (
    <View style={styles.list}>
      {items.map((i) => (
        <View key={i.entryId} style={styles.row}>
          <GameCard title={i.title} size="mini" nowPlaying={i.nowPlaying} />
          <View style={styles.rowMeta}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {i.title}
            </Text>
            <Text style={styles.rowSub}>
              {i.hours}H · {STATUS_LABEL[i.status]}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// TOP (D3) — read-only, hours-derived placeholder for the curated Top-10 (COL-13 curation rides
// M4). The #1 rank marker is scr.accent ORANGE — never gold (C6/F-02).
function TopView({ items }: { items: CollectionItem[] }) {
  const top = [...items].sort((a, b) => b.hours - a.hours).slice(0, 10);
  return (
    <View style={styles.list}>
      {top.map((i, idx) => (
        <View key={i.entryId} style={[styles.topRow, idx === 0 && styles.topRowFirst]}>
          <Text style={[styles.rank, idx === 0 && styles.rankFirst]}>#{idx + 1}</Text>
          <GameCard title={i.title} size={idx === 0 ? 'cell' : 'mini'} />
          <View style={styles.rowMeta}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {i.title}
            </Text>
            <Text style={styles.rowSub}>{i.hours}H</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyShelf({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.nudgeTitle}>YOUR SHELF IS EMPTY</Text>
      <Text style={styles.nudgeSub}>Add your first game — the catalog is community-built.</Text>
      <ScreenButton label="+ Add a game" variant="add" onPress={onAdd} />
      <TertiaryLink label="Can't find your game? Be the first to add it" onPress={onAdd} dim />
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
        <SearchField value={props.q} onChangeText={props.setQ} placeholder="Title · studio · publisher" />
      </SheetSection>
      <SheetSection title="View">
        <View style={styles.chipRow}>
          {VIEW_ORDER.map((v) => (
            <GenreTag key={v} label={v} selected={props.view === v} onPress={() => props.setView(v)} />
          ))}
        </View>
      </SheetSection>
      <SheetSection title="Sort">
        <View style={styles.chipRow}>
          {SORTS.map((s) => (
            <GenreTag
              key={s.key}
              label={s.label}
              selected={props.sortKey === s.key}
              onPress={() => props.setSortKey(s.key)}
            />
          ))}
          <GenreTag
            label={props.sortAsc ? 'ASC ↑' : 'DESC ↓'}
            onPress={() => props.setSortAsc(!props.sortAsc)}
          />
        </View>
      </SheetSection>
      <SheetSection title="Status">
        <View style={styles.chipRow}>
          {STATUSES.map((s) => (
            <GenreTag
              key={s}
              label={STATUS_LABEL[s]}
              selected={props.statusFilter.has(s)}
              onPress={() => toggle(props.statusFilter, s, props.setStatusFilter)}
            />
          ))}
        </View>
      </SheetSection>
      {props.genres.length > 0 ? (
        <SheetSection title="Genre">
          <View style={styles.chipRow}>
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
    <PulledSheet visible={item !== null} onClose={onClose}>
      <SheetSection title={`Log hours — ${item?.title ?? ''}`}>
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
  return (
    <View style={styles.sheetSection}>
      <Text style={styles.sheetHead}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.scr.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: theme.space.lg },
  errTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.accent, letterSpacing: 1 },
  errSub: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim },
  pad: { paddingHorizontal: theme.space.lg, paddingTop: theme.space.lg, paddingBottom: theme.space.md, gap: theme.space.md },
  scroll: { flex: 1 },
  body: { padding: theme.space.lg, gap: theme.space.lg },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.scr.hairline,
    backgroundColor: theme.scr.bg,
  },
  spacer: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.lg, justifyContent: 'space-between' },
  shelf: { gap: theme.space.lg },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: theme.space.lg,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
  },
  heroCard: { width: 138, height: 193 }, // mockup `.gcard.hero-size`
  heroMeta: { flex: 1, justifyContent: 'center', gap: 7 },
  heroEyebrow: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.accent, letterSpacing: 2 },
  heroStat: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 2 },
  heroTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.display, color: theme.scr.ink, letterSpacing: 1 },
  heroCatalog: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  heroBtn: { alignSelf: 'flex-start', marginTop: theme.space.sm },
  nudge: {
    padding: theme.space.xl,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    gap: theme.space.sm,
  },
  nudgeTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.ink, letterSpacing: 1 },
  nudgeSub: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.dim, lineHeight: 16 },
  empty: { alignItems: 'flex-start', gap: theme.space.lg, padding: theme.space.xl, backgroundColor: theme.scr.panel },
  shelfWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: theme.space.lg },
  shelfCol: { width: '48%' },
  fluidCard: { width: '100%', height: 'auto', aspectRatio: 63 / 88 }, // mockup `.grid-size`
  list: { gap: theme.space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    padding: theme.space.md,
  },
  rowMeta: { flex: 1, gap: 1 },
  rowTitle: { fontFamily: theme.font.screenSemi, fontSize: theme.type.title, color: theme.scr.ink },
  rowSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    padding: theme.space.md,
  },
  topRowFirst: { borderColor: theme.scr.accent },
  rank: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.dim, width: 30 },
  // C6/F-02 — the TOP list #1 marker is the on-screen ACCENT (orange), never gold.
  rankFirst: { color: theme.scr.accent, fontSize: theme.type.display },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.space.sm },
  resetLink: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  sheetSection: { gap: theme.space.md },
  sheetHead: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
});
