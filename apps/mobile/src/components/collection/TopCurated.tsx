import { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import type { CollectionItem, FriendTopTenEntry } from '@ingame/shared';
import { EntryCard, type EntryCardData } from '../EntryCard';
import { ScreenButton } from '../ScreenButton';
import { PulledSheet } from '../PulledSheet';
import { SearchField } from '../SearchField';
import { DragRankList } from '../wtp/DragRankList';
import { Grip } from '../wtp/rows';
import { reorder } from '../wtp/reorder';
import { STATUS_LABEL } from '../../constants/collection';
import { themedStyles, useTheme } from '../../theme';
import {
  useGetListsQuery,
  useAddListItemMutation,
  useRemoveListItemMutation,
  useRerankListMutation,
  TOP10_LIST_ID,
} from '../../store/listsApi';

// TopCurated (component-map §12 SlotFrame/RankSlot/CardPicker) — the COL-13 Collection TOP view-mode
// (decisions 0049/0050). SELF = read + ARRANGE (drag re-rank + CardPicker, cap-10 LIST_FULL); FRIEND =
// read-only ranked Top-10. Titles/hours are joined from the collection cache for the SELF read (the
// /me/lists items carry no title — manifest A2); the FRIEND entries already carry title/card.
//
// walk-6 — READ-mode rank accents (OWNER RULING 2026-07-17): #1 = GOLD · #2/#3 = bright SILVER ·
// #4–10 = orange accent. This AMENDS the board's deliberate orange-#1: the board's divergence from the
// catalog's gold `RankChip/first` specimen was pending owner ratification, and the owner has now ruled
// GOLD #1 — restoring the catalog specimen. The silver is a NEW accent value with no existing theme
// token (checked src/theme — only gold/cream/navy/accent families exist): defined below as RANK_SILVER,
// flagged TOKEN-CANDIDATE for the design-spec ripple (the decision-0078 pass). Rank numerals/chips
// ONLY — the cards themselves are untouched; ARRANGE mode keeps its neutral numerals.
//
// P10 walk-1 (the F-15 in-scroll-overlay class): the CardPicker sheet must NOT render inside this
// component — SelfTopView is mounted INSIDE collection.tsx's ScrollView, and a PulledSheet inside a
// scroll subtree anchors its absolute-fill to the scroll CONTENT (top-pinned, wrong size, results
// clipped — the owner-walk bug). Per the PulledSheet contract ("mount at the SCREEN ROOT, a sibling of
// the scroll") and the shipped pattern (game/[id].tsx CardDetailSheet/AdoptCardSheet · store.tsx
// ItemSheet/C2), the picker is exported as the standalone `TopTenCardPicker` which collection.tsx
// mounts OUTSIDE its ScrollView; SelfTopView only signals `onOpenPicker`.

const TOP_CAP = 10;
// walk-3 — the ARRANGE drag-slot height: the row's natural height (thumb card 67 + padding/borders
// ≈ 77) + the house md(8) gap. Fixed-slot math (indexFromDrag) keys on THIS value.
const ARRANGE_ROW_H = 88;

// walk-6 (owner ruling 2026-07-17) — a bright cool silver for the #2/#3 rank chips. TOKEN-CANDIDATE:
// no silver/bright-grey exists in src/theme (palettes carry gold/cream/navy/accent families only) —
// promote to a named theme token in the design-spec ripple (decision-0078 pass).
const RANK_SILVER = '#cfd8e3';

/** walk-6 — the read-mode rank-accent classifier (pure, tested): 1 → gold · 2/3 → silver · 4+ → accent. */
export function rankAccentFor(rank: number): 'gold' | 'silver' | 'accent' {
  return rank === 1 ? 'gold' : rank <= 3 ? 'silver' : 'accent';
}

/** One normalized rank row the scaffold renders (self-joined or friend-native). */
type TopRow = { gameId: string; rank: number; title: string; card: EntryCardData; sub?: string };

// ── the shared read presentation: #1 headliner over the 2–10 grid ─────────────────────────────────────
function TopScaffold({
  rows,
  subLine,
  focusGameId,
  onOpenGame,
  emptyNode,
}: {
  rows: TopRow[];
  subLine: string;
  focusGameId?: string;
  onOpenGame: (gameId: string) => void;
  emptyNode: React.ReactNode;
}) {
  const styles = useStyles();
  if (rows.length === 0) return <>{emptyNode}</>;
  const [headliner, ...rest] = rows;
  return (
    <View style={styles.wrap}>
      <Text style={styles.sub}>{subLine}</Text>
      {/* #1 headliner */}
      <Pressable
        style={[styles.hero, focusGameId === headliner!.gameId && styles.focus]}
        accessibilityRole="button"
        accessibilityLabel={`#1 ${headliner!.title}`}
        onPress={() => onOpenGame(headliner!.gameId)}
      >
        <View style={styles.heroCard}>
          <EntryCard title={headliner!.title} card={headliner!.card} size="grid" width={120} height={168} />
          {/* walk-6 — #1 is GOLD (the catalog RankChip/first specimen, owner-restored 2026-07-17) */}
          <View style={[styles.rankBadgeFirst, styles.rankGold]}><Text style={[styles.rankBadgeFirstText, styles.rankGoldText]}>1</Text></View>
        </View>
        <View style={styles.heroMeta}>
          <Text style={styles.heroEyebrow}>YOUR #1</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{headliner!.title.toUpperCase()}</Text>
          {headliner!.sub ? <Text style={styles.heroSub}>{headliner!.sub}</Text> : null}
        </View>
      </Pressable>
      {/* 2–10 grid */}
      <View style={styles.grid}>
        {rest.map((r) => (
          <Pressable
            key={r.gameId}
            style={[styles.cell, focusGameId === r.gameId && styles.focus]}
            accessibilityRole="button"
            accessibilityLabel={`#${r.rank} ${r.title}`}
            onPress={() => onOpenGame(r.gameId)}
          >
            <View style={styles.cellCard}>
              <EntryCard title={r.title} card={r.card} size="cell" />
              {/* walk-6 — #2/#3 silver · #4–10 orange (rank chips only, owner ruling 2026-07-17) */}
              <View style={[styles.rankBadge, rankAccentFor(r.rank) === 'silver' ? styles.rankSilver : styles.rankAccent]}>
                <Text style={[styles.rankBadgeText, rankAccentFor(r.rank) === 'silver' ? styles.rankSilverText : styles.rankAccentText]}>{r.rank}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── SELF (read + ARRANGE) ──────────────────────────────────────────────────────────────────────────────
export function SelfTopView({
  collectionItems,
  arranging,
  onOpenPicker,
  focusGameId,
  onOpenGame,
}: {
  collectionItems: CollectionItem[];
  arranging: boolean;
  /** Raise the CardPicker — the sheet itself (TopTenCardPicker) is mounted by the SCREEN at its root,
   *  never here (this component lives inside the Collection ScrollView; PulledSheet contract / F-15). */
  onOpenPicker: () => void;
  focusGameId?: string;
  onOpenGame: (gameId: string) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const { data: lists, isLoading } = useGetListsQuery();
  const [rerank] = useRerankListMutation();
  const [removeItem] = useRemoveListItemMutation();

  // the game→collection-item map (title/hours/status) for the title join (A2).
  const byGame = useMemo(() => {
    const m = new Map<string, CollectionItem>();
    for (const i of collectionItems) m.set(i.gameId, i);
    return m;
  }, [collectionItems]);

  const top = lists?.find((l) => l.id === TOP10_LIST_ID) ?? lists?.[0];

  const rows: TopRow[] = useMemo(() => {
    const items = [...(top?.items ?? [])].sort((a, b) => a.rank - b.rank);
    return items.map((it) => {
      const ci = byGame.get(it.gameId);
      return {
        gameId: it.gameId,
        rank: it.rank,
        title: ci?.title ?? 'Game',
        card: it.card, // the list's own card rider (owner render OK)
        sub: ci ? `${ci.hours} HRS · ${STATUS_LABEL[ci.status]}` : undefined,
      };
    });
  }, [top, byGame]);

  if (isLoading) {
    return (
      <View style={styles.center}><ActivityIndicator color={t.scr.accent} /></View>
    );
  }

  // ARRANGE mode — the drag rank list + the picker + DONE bar.
  if (arranging) {
    const onReorder = (from: number, to: number) => {
      const ids = reorder(rows.map((r) => r.gameId), from, to);
      void rerank({ orderedGameIds: ids });
    };
    return (
      <View style={styles.wrap}>
        <Text style={styles.sub}>ARRANGING — drag a card to re-rank; tap a + seat to add from your collection.</Text>
        {rows.length > 0 ? (
          // walk-3 — slot height must exceed the row's natural height (thumb 67 + padding/borders ≈ 77)
          // + the house gap, or fixed slots overlap ("practically overlapping", owner walk).
          <DragRankList
            data={rows}
            keyOf={(r) => r.gameId}
            rowHeight={ARRANGE_ROW_H}
            onReorder={onReorder}
            renderRow={(r) => (
              <View style={styles.arrangeRow}>
                <Grip />
                <Text style={styles.arrangeRank}>{r.rank}</Text>
                <EntryCard title={r.title} card={r.card} size="thumb" />
                <View style={styles.arrangeMeta}>
                  <Text style={styles.arrangeTitle} numberOfLines={1}>{r.title.toUpperCase()}</Text>
                  {r.sub ? <Text style={styles.arrangeSub}>{r.sub}</Text> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${r.title}`} hitSlop={8} onPress={() => void removeItem({ gameId: r.gameId })}>
                  <Text style={styles.remove}>REMOVE</Text>
                </Pressable>
              </View>
            )}
          />
        ) : null}
        {/* + ADD seat (absent when full — the LIST_FULL state). The sheet it raises is mounted by the
            SCREEN outside the ScrollView (TopTenCardPicker — F-15 / PulledSheet contract).
            walk-5b — a STANDARD ScreenButton orange /primary (0069: prominent non-acquisitive; TOP is
            non-commerce so orange, NOT gold) — the one-off dashed affordance is retired. */}
        {rows.length < TOP_CAP ? (
          <ScreenButton
            label={`+ Add from collection · seat ${rows.length + 1}`}
            variant="primary"
            block
            onPress={onOpenPicker}
          />
        ) : (
          <Text style={styles.full}>Top 10 is full — remove one to add another.</Text>
        )}
        {/* walk-5c (owner placement ruling) — the tv-bar is a PURE status readout; the one DONE lives
            on the tools bar (the ARRANGE ↔ DONE keycap, collection.tsx). */}
        <View style={styles.doneBar}>
          <Text style={styles.seated}>{rows.length} / {TOP_CAP} SEATED</Text>
        </View>
      </View>
    );
  }

  // READ mode.
  return (
    <TopScaffold
      rows={rows}
      subLine="YOUR TOP 10 — the curated showcase (it headlines your Profile). Tap ARRANGE to re-rank or change members."
      focusGameId={focusGameId}
      onOpenGame={onOpenGame}
      emptyNode={<EmptyTop />}
    />
  );
}

// ── FRIEND (read-only) ─────────────────────────────────────────────────────────────────────────────────
export function FriendTopView({
  entries,
  username,
  friendItems,
  focusGameId,
  onOpenGame,
}: {
  entries: FriendTopTenEntry[];
  username: string;
  /** the friend collection map for the hours·status headliner sub (optional; absent → title only). */
  friendItems?: { gameId: string; hours: number; status: string }[];
  focusGameId?: string;
  onOpenGame: (gameId: string) => void;
}) {
  const styles = useStyles();
  const byGame = useMemo(() => {
    const m = new Map<string, { hours: number; status: string }>();
    for (const i of friendItems ?? []) m.set(i.gameId, i);
    return m;
  }, [friendItems]);
  const rows: TopRow[] = useMemo(
    () =>
      [...entries]
        .sort((a, b) => a.rank - b.rank)
        .map((e) => {
          const ci = byGame.get(e.gameId);
          return {
            gameId: e.gameId,
            rank: e.rank,
            title: e.title,
            card: { imageUrl: e.card.imageUrl }, // friend cards are flattened-only (never composition)
            sub: ci ? `${ci.hours} HRS · ${(STATUS_LABEL[ci.status as keyof typeof STATUS_LABEL] ?? ci.status).toUpperCase()}` : undefined,
          };
        }),
    [entries, byGame],
  );
  return (
    <View style={styles.wrap}>
      <TopScaffold
        rows={rows}
        subLine={`${username.toUpperCase()}'S TOP 10 · read-only. Tap a card to open the game.`}
        focusGameId={focusGameId}
        onOpenGame={onOpenGame}
        emptyNode={<Text style={styles.friendEmpty}>{username} hasn&apos;t curated a Top 10 yet.</Text>}
      />
      {rows.length > 0 ? (
        <View style={styles.roBar}>
          <Text style={styles.roText}>READ-ONLY · {username.toUpperCase()}&apos;S CURATED TOP 10</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── the CardPicker sheet (membership — search your collection · ✓ add/remove) ─────────────────────────
// EXPORTED + SELF-CONTAINED (walk-1 fix): the SCREEN mounts this OUTSIDE its ScrollView (a screen-root
// sibling — the PulledSheet contract; the game/[id] CardDetailSheet / store ItemSheet pattern, F-15). It
// owns its own lists read (seated ids off the same RTK cache) + the add/remove writes + the LIST_FULL
// refusal state, so SelfTopView (inside the scroll) only signals open/close.
export function TopTenCardPicker({
  visible,
  onClose,
  collectionItems,
}: {
  visible: boolean;
  onClose: () => void;
  collectionItems: CollectionItem[];
}) {
  const styles = useStyles();
  const [q, setQ] = useState('');
  const [capError, setCapError] = useState(false);
  const { data: lists } = useGetListsQuery();
  const [addItem, addState] = useAddListItemMutation();
  const [removeItem] = useRemoveListItemMutation();
  const top = lists?.find((l) => l.id === TOP10_LIST_ID) ?? lists?.[0];
  const seated = useMemo(() => new Set((top?.items ?? []).map((i) => i.gameId)), [top]);
  const seatNumber = Math.min((top?.items.length ?? 0) + 1, TOP_CAP);
  const adding = addState.isLoading;

  async function onAdd(gameId: string) {
    try {
      await addItem({ gameId }).unwrap();
      setCapError(false);
    } catch (e) {
      // cap-10 → 409 LIST_FULL (the reachable refusal). 422 not_in_collection can't happen via the
      // picker (it sources your collection, A3) but is swept up by the same quiet error.
      const code = (e as { data?: { error?: { code?: string } } })?.data?.error?.code;
      if (code === 'LIST_FULL') setCapError(true);
    }
  }
  const onRemove = (gameId: string) => void removeItem({ gameId });
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return collectionItems.filter((i) => (needle ? i.title.toLowerCase().includes(needle) : true));
  }, [collectionItems, q]);

  return (
    <PulledSheet visible={visible} onClose={onClose} title={`Add to Top · Seat ${seatNumber}`}>
      {capError ? <Text style={styles.capError}>Top 10 is full — remove one first.</Text> : null}
      <SearchField value={q} onChangeText={setQ} placeholder="Search your collection…" />
      <View style={styles.pickerGrid}>
        {results.map((i) => {
          const picked = seated.has(i.gameId);
          return (
            <Pressable
              key={i.gameId}
              style={styles.pcell}
              accessibilityRole="button"
              accessibilityState={{ selected: picked }}
              accessibilityLabel={`${picked ? 'Remove' : 'Add'} ${i.title}`}
              disabled={adding}
              onPress={() => (picked ? onRemove(i.gameId) : onAdd(i.gameId))}
            >
              {picked ? <View style={styles.picked}><Text style={styles.pickedMark}>✓</Text></View> : null}
              <EntryCard title={i.title} card={i.card} size="cell" />
            </Pressable>
          );
        })}
      </View>
      {results.length === 0 ? <Text style={styles.pickerEmpty}>No games match.</Text> : null}
    </PulledSheet>
  );
}

// the empty TOP (ghost headliner + seats + nudge) — decision 0050.
function EmptyTop() {
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <View style={styles.ghostHero} />
      <Text style={styles.emptyTitle}>RANK YOUR FAVOURITES</Text>
      <Text style={styles.emptySub}>Your curated Top 10 headlines your Profile. Tap ARRANGE to seat your first pick.</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { gap: t.space.lg },
  center: { alignItems: 'center', paddingVertical: t.space.xxl },
  sub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.3, lineHeight: 14 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline, padding: t.space.lg },
  heroCard: { position: 'relative' },
  heroMeta: { flex: 1, gap: 3 },
  heroEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 2 },
  heroTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  heroSub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  focus: { borderColor: t.scr.accent },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg, justifyContent: 'flex-start' },
  cell: { position: 'relative' },
  cellCard: { position: 'relative' },
  rankBadge: { position: 'absolute', top: 4, left: 4, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontFamily: t.font.screenBold, fontSize: t.type.micro },
  rankBadgeFirst: { position: 'absolute', top: 4, left: 4, minWidth: 18, height: 18, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  rankBadgeFirstText: { fontFamily: t.font.screenBold, fontSize: t.type.body },
  // walk-6 rank accents (owner ruling 2026-07-17): #1 gold (catalog RankChip/first restored) · #2/#3
  // bright silver (RANK_SILVER, TOKEN-CANDIDATE) · #4–10 orange accent. Chips only, never the cards.
  rankGold: { backgroundColor: t.brand.gold },
  rankGoldText: { color: t.brand.goldInk },
  rankSilver: { backgroundColor: RANK_SILVER },
  rankSilverText: { color: t.brand.navy },
  rankAccent: { backgroundColor: t.scr.accent },
  rankAccentText: { color: t.scr.accentInk },

  // ARRANGE
  // walk-3 — marginBottom carves the house md(8) gap INSIDE the fixed ARRANGE_ROW_H slot (rows were
  // "practically overlapping": the natural row height exceeded the old 64px slot).
  arrangeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.space.md, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline, paddingHorizontal: t.space.md, paddingVertical: t.space.sm, marginBottom: t.space.md },
  arrangeRank: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, width: 16, textAlign: 'center' },
  arrangeMeta: { flex: 1, gap: 1, minWidth: 0 },
  arrangeTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  arrangeSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  remove: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
  full: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, textAlign: 'center', paddingVertical: t.space.md },
  doneBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: t.scr.hairline, paddingTop: t.space.md },
  seated: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },

  // friend read-only bar
  roBar: { borderTopWidth: 1, borderTopColor: t.scr.hairline, paddingTop: t.space.md, alignItems: 'center' },
  roText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },
  friendEmpty: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint, textAlign: 'center', paddingVertical: t.space.xl },

  // picker
  capError: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5, marginBottom: t.space.sm },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md, marginTop: t.space.md },
  pcell: { position: 'relative' },
  picked: { position: 'absolute', top: 3, right: 3, zIndex: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: t.scr.accent, alignItems: 'center', justifyContent: 'center' },
  pickedMark: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk },
  pickerEmpty: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint, textAlign: 'center', paddingVertical: t.space.lg },

  // empty
  empty: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.xl },
  ghostHero: { width: 120, height: 168, backgroundColor: t.scr.panel, borderWidth: 2, borderColor: t.scr.faint, borderStyle: 'dashed' },
  emptyTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  emptySub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 15, maxWidth: 280 },
}));
