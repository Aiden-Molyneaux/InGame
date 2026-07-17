import { useMemo, useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { FriendCollectionItem } from '@ingame/shared';
import { EntryCard } from '../../../src/components/EntryCard';
import { TertiaryLink } from '../../../src/components/TertiaryLink';
import { ScreenButton } from '../../../src/components/ScreenButton';
import { PulledSheet } from '../../../src/components/PulledSheet';
import { Skeleton } from '../../../src/components/lifecycle/Skeleton';
import { LoadError } from '../../../src/components/lifecycle/LoadError';
import { Unavailable } from '../../../src/components/lifecycle/Unavailable';
import { themedStyles, useTheme } from '../../../src/theme';
import { useGetUserQuery, useGetUserCollectionQuery, isFriendProfile } from '../../../src/store/friendApi';

// P9 — a friend's Collection (COL-10/11 · collection-states.html friend read-only boards). READ-ONLY,
// privacy-gated: the friend-visible field set only (no notes/rating/platforms/percentComplete — they're
// not on the shape, the F06 allowlist). Full browse-tool PARITY (COL-11): search · sort · filter · view
// — but NO write tools (no Add / Arrange / per-entry edit; owner-only). ARCH A2: this does NOT reuse
// collection.tsx's inline owner ShelfView/GridView/ListView (bound to the owner shape + a private
// flip-back) — it shares the VOCABULARY (EntryCard face, tools-bar chrome, section grammar) as a thin
// read-only parallel. An entry tap → the SOC-11 entry detail. The friend TOP view is EXPECTED(P5).

type FriendView = 'shelf' | 'grid' | 'list';
type SortKey = 'az' | 'hours' | 'ownedSince';
const VIEW_ORDER: FriendView[] = ['shelf', 'grid', 'list'];
const SORT_LABEL: Record<SortKey, string> = { az: 'A–Z', hours: 'HOURS', ownedSince: 'OWNED SINCE' };
const SORT_ORDER: SortKey[] = ['az', 'hours', 'ownedSince'];

export default function FriendCollection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useStyles();
  const t = useTheme();

  // Hooks ALL unconditional (F-16).
  const { data: profile } = useGetUserQuery(id ?? '', { skip: !id });
  const { data, isLoading, isError, error, refetch } = useGetUserCollectionQuery(id ?? '', { skip: !id });
  const [view, setView] = useState<FriendView>('shelf');
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('az');
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const username = profile && isFriendProfile(profile) ? profile.username : (profile?.username ?? '');
  const items = useMemo(() => data?.items ?? [], [data]);

  // Client-side query over the loaded friend items (the same D2 pattern as the owner shelf, read-only).
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = items.filter((i) => {
      if (needle && !i.title.toLowerCase().includes(needle)) return false;
      if (statusFilter.size > 0 && !statusFilter.has(i.status)) return false;
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
  }, [items, q, statusFilter, sortKey, sortAsc]);

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
  const openEntry = (gameId: string) => router.push(`/user/${id}/entry/${gameId}`);
  const filterActive = q.trim() !== '' || statusFilter.size > 0;

  return (
    <Frame title={username ? `Collection — ${username}` : 'Collection'} onBack={() => router.back()}>
      {/* their Now Playing hero — full stats, NO log-hours (you can't log their time) */}
      {hero ? (
        <Pressable
          style={styles.hero}
          accessibilityRole="button"
          accessibilityLabel={`Open ${hero.title}`}
          onPress={() => openEntry(hero.gameId)}
        >
          <EntryCard title={hero.title} card={{ imageUrl: hero.card.imageUrl }} size="cell" nowPlaying />
          <View style={styles.heroMeta}>
            <Text style={styles.heroEyebrow}>{username.toUpperCase()}&apos;S NOW PLAYING</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>{hero.title.toUpperCase()}</Text>
            <Text style={styles.heroSub}>{fmt(hero.hours)} HRS · {hero.status.toUpperCase()}</Text>
          </View>
        </Pressable>
      ) : null}

      {items.length === 0 ? (
        <Text style={styles.empty}>{username} hasn&apos;t added any games yet.</Text>
      ) : (
        <>
          {/* read-only browse tools (COL-11): search · sort · filter · view — no Add/Arrange/edit */}
          <View style={styles.tools}>
            <Pressable style={styles.toolChip} accessibilityLabel="Sort direction" onPress={() => setSortAsc((v) => !v)}>
              <SortIcon asc={sortAsc} color={t.scr.dim} />
              <Text style={styles.toolText}>{SORT_LABEL[sortKey]} {sortAsc ? '↑' : '↓'}</Text>
            </Pressable>
            <Pressable style={[styles.toolChip, statusFilter.size > 0 && styles.toolChipActive]} accessibilityLabel="Filter" onPress={() => setDrawerOpen(true)}>
              <FilterIcon color={t.scr.dim} />
              <Text style={styles.toolText}>{statusFilter.size > 0 ? `${statusFilter.size} FILTER` : 'ALL'}</Text>
            </Pressable>
            <Pressable style={styles.toolChip} accessibilityLabel={`View: ${view}`} onPress={() => setView(nextView(view))}>
              <Text style={styles.toolText}>{view.toUpperCase()}</Text>
            </Pressable>
            <View style={styles.toolSpacer} />
            <Pressable style={styles.toolChip} accessibilityLabel="Compare" onPress={() => router.push(`/compare/${id}`)}>
              <Text style={styles.toolText}>COMPARE</Text>
            </Pressable>
          </View>

          {/* inline scoped search */}
          <View style={styles.searchRow}>
            <SearchIcon color={t.scr.faint} />
            <SearchField value={q} onChange={setQ} placeholder={`Search ${username}'s games`} />
            {q ? (
              <Pressable accessibilityLabel="Clear search" onPress={() => setQ('')} hitSlop={8}>
                <Text style={styles.clear}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          {filtered.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No games match.</Text>
              {filterActive ? (
                <TertiaryLink label="Clear filters" chevron="none" onPress={() => { setQ(''); setStatusFilter(new Set()); }} />
              ) : null}
            </View>
          ) : view === 'list' ? (
            <FriendListView items={filtered} onOpen={openEntry} />
          ) : view === 'grid' ? (
            <FriendGridView items={filtered} onOpen={openEntry} />
          ) : (
            <FriendShelfView items={filtered} onOpen={openEntry} />
          )}

          {/* the friend TOP view is EXPECTED(P5) — the curated top10 read isn't served (AS-4) */}
          <Text style={styles.topNote}>{username}&apos;s Top 10 arrives with the profile read.</Text>
        </>
      )}

      {/* read-only sort / filter drawer (COL-11) — status facets, client-side */}
      <PulledSheet visible={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filter · read-only">
        <Text style={styles.drawerHead}>STATUS</Text>
        <View style={styles.facetRow}>
          {['playing', 'beaten', 'completed', 'backlog', 'dropped', 'wishlist'].map((s) => {
            const on = statusFilter.has(s);
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setStatusFilter((prev) => toggle(prev, s))}
                style={[styles.facet, on && styles.facetOn]}
              >
                <Text style={[styles.facetText, on && styles.facetTextOn]}>{s.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.drawerHead}>SORT</Text>
        <View style={styles.facetRow}>
          {SORT_ORDER.map((k) => {
            const on = sortKey === k;
            return (
              <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSortKey(k)} style={[styles.facet, on && styles.facetOn]}>
                <Text style={[styles.facetText, on && styles.facetTextOn]}>{SORT_LABEL[k]}</Text>
              </Pressable>
            );
          })}
        </View>
        <ScreenButton label="Done" variant="secondary" onPress={() => setDrawerOpen(false)} block />
      </PulledSheet>
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
          <EntryCard title={i.title} card={{ imageUrl: i.card.imageUrl }} size="cell" nowPlaying={i.nowPlaying} />
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
          <EntryCard title={i.title} card={{ imageUrl: i.card.imageUrl }} size="cell" nowPlaying={i.nowPlaying} />
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

// A minimal read-only search field (no keyboard-lift concerns — a plain controlled TextInput).
function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <TextInput
      style={styles.searchInput}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={t.scr.faint}
      autoCapitalize="none"
      accessibilityLabel="Search this collection"
    />
  );
}

// The sort chip flips direction; the drawer picks the KEY (mirrors the owner tools-bar act/configure split).
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

// ── icons ──
function SortIcon({ asc, color }: { asc: boolean; color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12">
      <Path d={asc ? 'M3 9V3M3 3L1 5M3 3l2 2' : 'M3 3v6M3 9l-2-2M3 9l2-2'} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 4h4M7 7h3M7 10h2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
function FilterIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 11">
      <Path d="M1 1.5h10L7.5 6v3.4L4.5 10V6L1 1.5z" fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}
function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Circle cx={6} cy={6} r={4} fill="none" stroke={color} strokeWidth={1.6} />
      <Path d="M9.2 9.2L13 13" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function Frame({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
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
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  retlink: { paddingHorizontal: t.space.lg, paddingBottom: t.space.md },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  hero: { flexDirection: 'row', gap: t.space.lg, alignItems: 'center', backgroundColor: t.scr.panel, padding: t.space.lg },
  heroMeta: { flex: 1, gap: t.space.xs },
  heroEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1.5 },
  heroTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  heroSub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },

  empty: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint, textAlign: 'center', paddingVertical: t.space.xl },

  tools: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  toolChip: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, backgroundColor: t.scr.panelHi, borderWidth: 1, borderColor: t.scr.hairline, paddingHorizontal: t.space.md, paddingVertical: t.space.sm },
  toolChipActive: { borderColor: t.scr.accent },
  toolText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  toolSpacer: { flex: 1 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, backgroundColor: t.scr.panelHi, borderWidth: 1, borderColor: t.scr.hairline, paddingHorizontal: t.space.md, paddingVertical: t.space.sm },
  searchInput: { flex: 1, fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.ink, paddingVertical: 2 },
  clear: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim },

  noResults: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.xl },
  noResultsText: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim },

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

  topNote: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, textAlign: 'center', letterSpacing: 0.3, marginTop: t.space.md },

  drawerHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5, marginTop: t.space.md, marginBottom: t.space.sm },
  facetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginBottom: t.space.md },
  facet: { borderWidth: 1, borderColor: t.scr.hairline, paddingHorizontal: t.space.md, paddingVertical: t.space.sm },
  facetOn: { borderColor: t.scr.accent, backgroundColor: t.scr.panelHi },
  facetText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  facetTextOn: { color: t.scr.accent },
}));
