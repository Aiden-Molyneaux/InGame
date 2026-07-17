import { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import type { CollectionItem, FriendTopTenEntry } from '@ingame/shared';
import { EntryCard, type EntryCardData } from '../EntryCard';
import { RankChip } from '../RankChip';
import { ScreenButton } from '../ScreenButton';
import { PulledSheet } from '../PulledSheet';
import { SearchField } from '../SearchField';
import { TertiaryLink } from '../TertiaryLink';
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
// read-only ranked Top-10. The #1 marker is scr.accent ORANGE, never gold (C6/F-02). Titles/hours are
// joined from the collection cache for the SELF read (the /me/lists items carry no title — manifest A2);
// the FRIEND entries already carry title/card (friendTopTenEntry).
//
// P10 walk-1 (the F-15 in-scroll-overlay class): the CardPicker sheet must NOT render inside this
// component — SelfTopView is mounted INSIDE collection.tsx's ScrollView, and a PulledSheet inside a
// scroll subtree anchors its absolute-fill to the scroll CONTENT (top-pinned, wrong size, results
// clipped — the owner-walk bug). Per the PulledSheet contract ("mount at the SCREEN ROOT, a sibling of
// the scroll") and the shipped pattern (game/[id].tsx CardDetailSheet/AdoptCardSheet · store.tsx
// ItemSheet/C2), the picker is exported as the standalone `TopTenCardPicker` which collection.tsx
// mounts OUTSIDE its ScrollView; SelfTopView only signals `onOpenPicker`.

const TOP_CAP = 10;

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
          <View style={styles.rankBadgeFirst}><Text style={styles.rankBadgeFirstText}>1</Text></View>
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
              <View style={styles.rankBadge}><Text style={styles.rankBadgeText}>{r.rank}</Text></View>
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
  onExitArrange,
  onOpenPicker,
  focusGameId,
  onOpenGame,
}: {
  collectionItems: CollectionItem[];
  arranging: boolean;
  onExitArrange: () => void;
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
          <DragRankList
            data={rows}
            keyOf={(r) => r.gameId}
            rowHeight={64}
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
            SCREEN outside the ScrollView (TopTenCardPicker — F-15 / PulledSheet contract). */}
        {rows.length < TOP_CAP ? (
          <Pressable style={styles.addSeat} accessibilityRole="button" accessibilityLabel="Add to Top 10" onPress={onOpenPicker}>
            <Text style={styles.addSeatPlus}>+</Text>
            <Text style={styles.addSeatLabel}>ADD FROM YOUR COLLECTION · SEAT {rows.length + 1}</Text>
          </Pressable>
        ) : (
          <Text style={styles.full}>Top 10 is full — remove one to add another.</Text>
        )}
        <View style={styles.doneBar}>
          <Text style={styles.seated}>{rows.length} / {TOP_CAP} SEATED</Text>
          <View style={styles.spacer} />
          <ScreenButton label="Done" variant="action-alt" onPress={onExitArrange} />
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
  rankBadge: { position: 'absolute', top: 4, left: 4, minWidth: 16, height: 16, paddingHorizontal: 3, backgroundColor: t.scr.faint, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.bg },
  rankBadgeFirst: { position: 'absolute', top: 4, left: 4, minWidth: 18, height: 18, paddingHorizontal: 3, backgroundColor: t.scr.accent, alignItems: 'center', justifyContent: 'center' },
  rankBadgeFirstText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.accentInk },

  // ARRANGE
  arrangeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.space.md, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline, paddingHorizontal: t.space.md, paddingVertical: t.space.sm },
  arrangeRank: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, width: 16, textAlign: 'center' },
  arrangeMeta: { flex: 1, gap: 1, minWidth: 0 },
  arrangeTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  arrangeSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  remove: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
  addSeat: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, borderWidth: 1, borderColor: t.scr.faint, borderStyle: 'dashed', paddingHorizontal: t.space.lg, paddingVertical: t.space.md },
  addSeatPlus: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },
  addSeatLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  full: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, textAlign: 'center', paddingVertical: t.space.md },
  doneBar: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, borderTopWidth: 1, borderTopColor: t.scr.hairline, paddingTop: t.space.md },
  seated: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  spacer: { flex: 1 },

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
