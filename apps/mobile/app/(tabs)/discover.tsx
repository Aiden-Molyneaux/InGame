import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import type { CollectionItem } from '@ingame/shared';
import { ScreenHead } from '../../src/components/ScreenHead';
import { ScreenButton } from '../../src/components/ScreenButton';
import { SectionSwitch } from '../../src/components/SectionSwitch';
import { PulledSheet } from '../../src/components/PulledSheet';
import { TextField } from '../../src/components/TextField';
import { SearchField } from '../../src/components/SearchField';
import { EntryCard } from '../../src/components/EntryCard';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { QueueRow, RecRow, TrendRow, NowPlayingPin } from '../../src/components/wtp/rows';
import { DragRankList } from '../../src/components/wtp/DragRankList';
import { reorder } from '../../src/components/wtp/reorder';
import { theme, themedStyles } from '../../src/theme';
import {
  useGetQueueQuery,
  useAddQueueItemMutation,
  useReorderQueueMutation,
  useDeleteQueueItemMutation,
} from '../../src/store/queueApi';
import { useGetRecommendationsQuery, useDismissRecommendationMutation } from '../../src/store/recommendationApi';
import { useGetTrendingCardsQuery } from '../../src/store/communityApi';
import { useGetCollectionQuery, useUpdateEntryMutation, useSetNowPlayingMutation } from '../../src/store/api';

// P10 — the Discover screen (§0.8 slice · discover-states.html "Two rooms"). The DISCOVER nav keycap goes
// LIVE this packet (ShellNav/_layout — the 5th routable tab; design-spec §2.7). Two rooms under a bottom-
// docked SegmentedKeycap/pair (SectionSwitch): UP NEXT (full — the WTP-01/02/03 queue + recs) ↔ DISCOVER
// (browse slice — trending live; upcoming EXPECTED, endpoint 404; NO notify-me toggle, M7). Non-commerce:
// counts, never PIXELS — the one blessed gold is ADD FROM COLLECTION (the 2026-06-23 audit carve-out).

type Room = 'upnext' | 'discover';

export default function Discover() {
  const router = useRouter();
  const styles = useStyles();
  const [room, setRoom] = useState<Room>('upnext');
  const [arranging, setArranging] = useState(false);
  const [logHoursId, setLogHoursId] = useState<string | null>(null);
  const [overflowId, setOverflowId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [capError, setCapError] = useState(false);

  const { data: queue, isLoading: qLoading } = useGetQueueQuery();
  const { data: collection } = useGetCollectionQuery();
  const { data: recs } = useGetRecommendationsQuery();
  const { data: trending } = useGetTrendingCardsQuery();
  const [addQueue, addState] = useAddQueueItemMutation();
  const [reorderQueue] = useReorderQueueMutation();
  const [deleteQueue] = useDeleteQueueItemMutation();
  const [dismissRec] = useDismissRecommendationMutation();
  const [setNowPlaying] = useSetNowPlayingMutation();

  const items = useMemo(() => queue?.items ?? [], [queue]);
  const collectionItems = useMemo(() => collection?.items ?? [], [collection]);
  const nowPlaying = collectionItems.find((i) => i.nowPlaying) ?? null;
  const queuedGameIds = useMemo(() => new Set(items.map((i) => i.gameId)), [items]);
  const logHoursItem = logHoursId ? collectionItems.find((i) => i.entryId === logHoursId) ?? null : null;
  const overflowItem = overflowId ? items.find((i) => i.itemId === overflowId) ?? null : null;

  async function onAddFromCollection(gameId: string) {
    try {
      await addQueue({ gameId, source: 'collection' }).unwrap();
    } catch (e) {
      const code = (e as { data?: { error?: { code?: string } } })?.data?.error?.code;
      if (code === 'LIST_FULL') setCapError(true);
    }
  }
  const onReorder = (from: number, to: number) => {
    const ids = reorder(items.map((i) => i.itemId), from, to);
    void reorderQueue({ orderedItemIds: ids });
  };

  const recsNode =
    (recs?.recommendations.length ?? 0) > 0 ? (
      <View style={styles.section}>
        <View style={styles.secHead}><Text style={styles.secTitle}>FROM FRIENDS</Text><Text style={styles.secCount}>{recs!.recommendations.length} NEW</Text></View>
        <View style={styles.rows}>
          {recs!.recommendations.map((rec) => (
            <RecRow
              key={rec.recId}
              rec={rec}
              busy={addState.isLoading}
              onQueue={async () => {
                try {
                  await addQueue({ gameId: rec.game.id, source: 'friend_rec', fromRecId: rec.recId }).unwrap();
                } catch (e) {
                  const code = (e as { data?: { error?: { code?: string } } })?.data?.error?.code;
                  if (code === 'LIST_FULL') setCapError(true);
                }
              }}
              onDismiss={() => void dismissRec(rec.recId)}
              onPress={() => router.push(`/game/${rec.game.id}`)}
            />
          ))}
        </View>
      </View>
    ) : null;

  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        <ScreenHead title={room === 'upnext' ? 'Up Next' : 'Discover'} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {room === 'upnext' ? (
          <>
            {/* NOW PLAYING pin (WTP-03) */}
            <View style={styles.section}>
              <Text style={styles.secTitle}>NOW PLAYING</Text>
              {nowPlaying ? (
                <NowPlayingPin
                  item={nowPlaying}
                  onLogHours={() => setLogHoursId(nowPlaying.entryId)}
                  onPress={() => router.push(`/game/${nowPlaying.gameId}`)}
                />
              ) : (
                <Text style={styles.quiet}>Pin a Now Playing from your Collection.</Text>
              )}
            </View>

            {capError ? <Text style={styles.capError}>Your queue is full (50) — remove one to add another.</Text> : null}

            {/* QUEUE (WTP-01/02) */}
            {qLoading ? (
              <ActivityIndicator color={theme.brand.accent} />
            ) : items.length === 0 ? (
              <EmptyQueue onAdd={() => { setCapError(false); setPickerOpen(true); }} />
            ) : (
              <View style={styles.section}>
                <View style={styles.secHead}>
                  <Text style={styles.secTitle}>QUEUE · {items.length}{arranging ? ' — REORDERING' : ' — DRAG TO REORDER'}</Text>
                  <TertiaryLink label={arranging ? 'Done' : 'Reorder'} chevron="none" onPress={() => setArranging((v) => !v)} dim />
                </View>
                {arranging ? (
                  <DragRankList
                    data={items}
                    keyOf={(i) => i.itemId}
                    rowHeight={60}
                    onReorder={onReorder}
                    renderRow={(item, index) => <QueueRow item={item} rank={index + 1} arranging />}
                  />
                ) : (
                  <View style={styles.rows}>
                    {items.map((item, index) => (
                      <QueueRow
                        key={item.itemId}
                        item={item}
                        rank={index + 1}
                        onPress={() => router.push(`/game/${item.gameId}`)}
                        onOverflow={() => setOverflowId(item.itemId)}
                      />
                    ))}
                  </View>
                )}
                <View style={styles.addFrom}>
                  {/* the one blessed gold — ADD FROM COLLECTION (the owner's "you control it by adding") */}
                  <ScreenButton label="+ Add from collection" variant="add" block onPress={() => { setCapError(false); setPickerOpen(true); }} />
                </View>
              </View>
            )}

            {recsNode}
          </>
        ) : (
          <>
            {/* UPCOMING (DISC-01/CAT-11) — endpoint /catalog/upcoming is NOT live (404): honest EXPECTED-empty,
                NEVER faked. NO notify-me toggle (M7, §0.8). */}
            <View style={styles.section}>
              <Text style={styles.secTitle}>UPCOMING</Text>
              <View style={styles.expected}>
                <Text style={styles.expectedText}>
                  Upcoming releases arrive with the M7 discovery batch — the browse-and-notify rail lands when
                  the catalog upcoming feed is live.
                </Text>
              </View>
            </View>

            {recsNode}

            {/* TRENDING CARDS (DISC-04) — live since M5. NON-COMMERCE: adoption counts, never prices. */}
            <View style={styles.section}>
              <View style={styles.secHead}><Text style={styles.secTitle}>TRENDING CARDS</Text></View>
              {(trending?.items.length ?? 0) > 0 ? (
                <View style={styles.rows}>
                  {trending!.items.map((tc) => (
                    <TrendRow key={tc.card.id} item={tc} onPress={() => router.push(`/game/${tc.game.id}`)} />
                  ))}
                </View>
              ) : (
                <Text style={styles.quiet}>Trending is still warming up — adopt a community card to get it going.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* the bottom-docked SegmentedKeycap/pair (UP NEXT ↔ DISCOVER) — design-spec §2.7 */}
      <View style={styles.segFoot}>
        <SectionSwitch<Room>
          options={[{ value: 'upnext', label: 'Up Next' }, { value: 'discover', label: 'Discover' }]}
          value={room}
          onChange={(r) => { setRoom(r); setArranging(false); }}
        />
      </View>

      <LogHoursSheet item={logHoursItem} onClose={() => setLogHoursId(null)} />
      <QueueOverflowSheet
        item={overflowItem}
        onClose={() => setOverflowId(null)}
        onPin={async () => {
          if (overflowItem) await setNowPlaying({ gameId: overflowItem.gameId }).unwrap().catch(() => {});
          setOverflowId(null);
        }}
        onRemove={async () => {
          if (overflowItem) await deleteQueue(overflowItem.itemId).unwrap().catch(() => {});
          setOverflowId(null);
        }}
      />
      <AddFromCollectionSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        collectionItems={collectionItems}
        queuedGameIds={queuedGameIds}
        adding={addState.isLoading}
        onPick={onAddFromCollection}
      />
    </View>
  );
}

// the inviting first-run empty queue (board P3).
function EmptyQueue({ onAdd }: { onAdd: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.invite}>
      <View style={styles.inviteCard}><Text style={styles.invitePlus}>+</Text></View>
      <Text style={styles.inviteEyebrow}>NOTHING QUEUED</Text>
      <Text style={styles.inviteTitle}>QUEUE&apos;S EMPTY</Text>
      <Text style={styles.inviteSub}>Line up what to play next — pull a few games straight from your collection.</Text>
      <ScreenButton label="+ Add from collection" variant="add" onPress={onAdd} />
    </View>
  );
}

// the minimal log-hours sheet (WTP-03 pin action — reuses the collection's update-entry path).
function LogHoursSheet({ item, onClose }: { item: CollectionItem | null; onClose: () => void }) {
  const styles = useStyles();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updateEntry, state] = useUpdateEntryMutation();

  useEffect(() => {
    if (item) { setValue(String(item.hours)); setError(null); }
  }, [item?.entryId, item?.hours]); // eslint-disable-line react-hooks/exhaustive-deps -- value-driven seed (mirrors collection.tsx)

  async function save() {
    if (!item) return;
    if (value.trim() === '') { setError('Enter your total hours.'); return; }
    const hours = Number(value);
    if (!Number.isInteger(hours) || hours < 0) { setError('Whole hours only.'); return; }
    try {
      await updateEntry({ entryId: item.entryId, hours }).unwrap();
      onClose();
    } catch {
      setError('Couldn’t save. Try again.');
    }
  }

  return (
    <PulledSheet visible={item !== null} onClose={onClose} title="Log Hours">
      <Text style={styles.sheetHead}>{(item?.title ?? '').toUpperCase()}</Text>
      <TextField label="Total hours" value={value} onChangeText={setValue} placeholder={item ? String(item.hours) : '0'} keyboardType="number-pad" error={error} />
      <ScreenButton label={state.isLoading ? '…' : 'Save'} onPress={save} disabled={state.isLoading} block />
    </PulledSheet>
  );
}

// the queue-row overflow: PIN AS NOW PLAYING (WTP-03 hand-off) · REMOVE.
function QueueOverflowSheet({
  item,
  onClose,
  onPin,
  onRemove,
}: {
  item: { itemId: string; title: string } | null;
  onClose: () => void;
  onPin: () => void;
  onRemove: () => void;
}) {
  const styles = useStyles();
  return (
    <PulledSheet visible={item !== null} onClose={onClose} title={item?.title ?? ''}>
      <Pressable style={styles.action} accessibilityRole="button" onPress={onPin}>
        <Text style={styles.actionText}>PIN AS NOW PLAYING</Text>
      </Pressable>
      <Pressable style={styles.action} accessibilityRole="button" onPress={onRemove}>
        <Text style={styles.actionTextDanger}>REMOVE FROM QUEUE</Text>
      </Pressable>
    </PulledSheet>
  );
}

// ADD FROM COLLECTION — search your shelf, tap a game to queue it (source:'collection'). Already-queued
// games are badged.
function AddFromCollectionSheet({
  visible,
  onClose,
  collectionItems,
  queuedGameIds,
  adding,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  collectionItems: CollectionItem[];
  queuedGameIds: Set<string>;
  adding: boolean;
  onPick: (gameId: string) => void;
}) {
  const styles = useStyles();
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return collectionItems.filter((i) => (needle ? i.title.toLowerCase().includes(needle) : true));
  }, [collectionItems, q]);
  return (
    <PulledSheet visible={visible} onClose={onClose} title="Add from your collection">
      <SearchField value={q} onChangeText={setQ} placeholder="Search your collection…" />
      <View style={styles.pickerGrid}>
        {results.map((i) => {
          const queued = queuedGameIds.has(i.gameId);
          return (
            <Pressable
              key={i.gameId}
              style={styles.pcell}
              accessibilityRole="button"
              accessibilityState={{ disabled: queued }}
              accessibilityLabel={queued ? `${i.title} already queued` : `Queue ${i.title}`}
              disabled={queued || adding}
              onPress={() => onPick(i.gameId)}
            >
              {queued ? <View style={styles.queued}><Text style={styles.queuedMark}>✓</Text></View> : null}
              <EntryCard title={i.title} card={i.card} size="cell" />
            </Pressable>
          );
        })}
      </View>
      {results.length === 0 ? <Text style={styles.quiet}>No games match.</Text> : null}
    </PulledSheet>
  );
}

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  pad: { paddingHorizontal: t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.md },
  scroll: { flex: 1 },
  body: { padding: t.space.lg, gap: t.space.xl, paddingBottom: t.space.xxl },

  section: { gap: t.space.md },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 1.5 },
  secCount: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },
  rows: { gap: t.space.sm },
  quiet: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint, letterSpacing: 0.3 },

  capError: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },

  addFrom: { marginTop: t.space.sm },

  expected: { borderWidth: 1, borderColor: t.scr.hairline, backgroundColor: t.scr.panel, padding: t.space.lg },
  expectedText: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.3, lineHeight: 14 },

  // seg-foot (bottom dock)
  segFoot: { flexDirection: 'row', justifyContent: 'center', paddingVertical: t.space.md, borderTopWidth: 1, borderTopColor: t.scr.hairline, backgroundColor: t.scr.bg },

  // empty queue invite
  invite: { alignItems: 'center', gap: t.space.md, paddingVertical: t.space.xl },
  inviteCard: { width: 96, height: 134, backgroundColor: t.scr.panel, borderWidth: 2, borderColor: t.scr.faint, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  invitePlus: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.faint },
  inviteEyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  inviteTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  inviteSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 15, maxWidth: 280 },

  // sheets
  sheetHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5, marginBottom: t.space.sm },
  action: { paddingVertical: t.space.md, borderTopWidth: 1, borderTopColor: t.scr.hairline },
  actionText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 1 },
  actionTextDanger: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.accent, letterSpacing: 1 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md, marginTop: t.space.md },
  pcell: { position: 'relative' },
  queued: { position: 'absolute', top: 3, right: 3, zIndex: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: t.scr.accent, alignItems: 'center', justifyContent: 'center' },
  queuedMark: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk },
}));
