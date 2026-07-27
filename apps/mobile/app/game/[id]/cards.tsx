import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CreateReportRequest, GalleryCardView, GallerySort } from '@ingame/shared';
import { GALLERY_PAGE } from '@ingame/shared';
import { GalleryCell } from '../../../src/components/game/CommunityGallery';
import { AdoptCardSheet, type AdoptOutcome } from '../../../src/components/game/AdoptCardSheet';
import { ReportSheet, type ReportTarget, type ReportActionOutcome } from '../../../src/components/report/ReportSheet';
import { ConfirmSheet } from '../../../src/components/ConfirmSheet';
import { SectionSwitch } from '../../../src/components/SectionSwitch';
import { TertiaryLink } from '../../../src/components/TertiaryLink';
import { ScreenButton } from '../../../src/components/ScreenButton';
import { Skeleton } from '../../../src/components/lifecycle/Skeleton';
import { LoadError } from '../../../src/components/lifecycle/LoadError';
import { Toast } from '../../../src/components/lifecycle/Toast';
import { useContributorPaging } from '../../../src/components/contributor/useContributorPaging';
import { useGetWalletQuery, useUpdateEntryMutation } from '../../../src/store/api';
import {
  useGetGameGalleryQuery,
  useLazyGetGameGalleryQuery,
  useAdoptCardMutation,
  useBlockUserMutation,
} from '../../../src/store/communityApi';
import { useSubmitReportMutation } from '../../../src/store/reportApi';
import { useShareCard } from '../../../src/components/game/useShareCard';
import { themedStyles } from '../../../src/theme';
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../../../src/components/ScreenHead';

// The COMMUNITY CARDS full list (api-contract 0.81; the drawn "SEE ALL ›" door, game-page-states
// :620 — built at the m6 owner walk). Reached from BOTH the add-game fork's SEE ALL and the game
// page's inline-gallery SEE ALL. The contributor VIEW-ALL pattern (/contributor/[id]/cards): cursor
// pages of GALLERY_PAGE (24) accumulated by useContributorPaging over a page-1 subscription, with a
// REAL sort switch — TOP (adoption, SQL-ranked server-side) default · NEW (recency). Cells are the
// gallery's own GalleryCell grammar (flattened thumbs — OQ-122, never composition).
//
// Adopt capability rides `?adopt=1` (a DISPLAY affordance only — the server is the enforcement
// boundary for adoption; CARD-04/ECON-03): the OWN/FRIEND galleries + the add-game fork pass it, the
// CATALOG posture (browse-only, W-D1 Q4) does not — its cells render as plain Views, no adopt path.
//
// WALK-4 P2 — the ADD-FLOW context. `?entryId=` arrives ONLY from the add-game fork's SEE-ALL door and
// means "this list is the add flow's WHAT FACE question": an adopt here chains the COL-06 equip onto
// that entry and the sheet's Done DISMISSES THE WHOLE ADD STACK to the Collection, so the fork is never
// revisited (the W3-J lying "keep the default for now" becomes unreachable). Without it — the game-page
// door — the surface behaves exactly as before.
const keyOf = (c: GalleryCardView) => c.id;

export default function GameCardsList() {
  const { id, adopt, entryId } = useLocalSearchParams<{ id: string; adopt?: string; entryId?: string }>();
  const router = useRouter();
  const styles = useStyles();
  const gameId = id ?? '';
  const canAdopt = adopt === '1';
  const addFlowEntryId = entryId && entryId.length > 0 ? entryId : null;

  // Hooks ALL unconditional (F-16) — the lifecycle returns sit below every hook.
  const [sort, setSort] = useState<GallerySort>('top');
  const { data, isLoading, isError, refetch } = useGetGameGalleryQuery(
    { gameId, sort, limit: GALLERY_PAGE },
    { skip: !gameId },
  );
  const [trigger, moreState] = useLazyGetGameGalleryQuery();
  const { data: wallet } = useGetWalletQuery();
  const [adoptCard, adoptState] = useAdoptCardMutation();
  const [updateEntry] = useUpdateEntryMutation(); // P2 — the chained COL-06 equip (add-flow only)
  const [blockUser, blockState] = useBlockUserMutation();
  const [submitReport, reportState] = useSubmitReportMutation();
  const [inspectCard, setInspectCard] = useState<GalleryCardView | null>(null);
  const [blockCard, setBlockCard] = useState<GalleryCardView | null>(null); // the SOC-09-light confirm
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null); // MOD-01
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [settleNote, setSettleNote] = useState<string | undefined>(undefined);
  const [adoptedInFlow, setAdoptedInFlow] = useState(false); // P2 — the sheet's Done ends the add flow
  // Walk-4 P4-d — the preview drawer's SHARE is a real affordance now, so this surface must actually
  // share (it passed a no-op before, which the conformed treatment would have turned into a lying key).
  const { shareBusy, shareCard } = useShareCard((message) => setToast({ tone: 'error', message }));

  // Adapt the 0.81 envelope (optional nextCursor) to the paging hook's Page shape — memoized so the
  // hook's page-1 identity reset only fires on a REAL new payload, never a render.
  const page1 = useMemo(
    () => (data ? { items: data.items, nextCursor: data.nextCursor ?? null } : undefined),
    [data],
  );
  const fetchMore = useCallback(
    (cursor: string) => ({
      unwrap: async () => {
        const p = await trigger({ gameId, sort, limit: GALLERY_PAGE, cursor }).unwrap();
        return { items: p.items, nextCursor: p.nextCursor ?? null };
      },
    }),
    [trigger, gameId, sort],
  );
  // W3-I (P2/OC-1) — the resetKey names the list. `adoptCard` invalidates the CommunityCards tag, so
  // the page-1 subscription refetches under the SAME key; without this the whole accumulated tail
  // collapsed and a deep-scrolled reader was thrown back to page 1 the moment they adopted. A real key
  // change (sort flip / different game) still resets.
  const paging = useContributorPaging<GalleryCardView>(page1, fetchMore, keyOf, `${gameId}:${sort}`);
  const total = data?.total ?? paging.items.length;

  // The game-page adopt mapping (0072/0073) — the container owns the mutation, the sheet the UX.
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
      if (code === 'ALREADY_ADOPTED') {
        // Walk-4 Murr fix — in the ADD FLOW an existing grant IS a face answer: chain the same
        // best-effort equip (onAdopted) so the flow still ends wearing it instead of dead-ending.
        if (addFlowEntryId && inspectCard) void onAdopted(undefined, inspectCard);
        return { ok: false, code: 'ALREADY_ADOPTED' };
      }
      if (code === 'NOT_PUBLISHED') return { ok: false, code: 'NOT_PUBLISHED' };
      return { ok: false, code: 'ERROR' };
    }
  }

  // P2-a — in the ADD FLOW the adopt chains the COL-06 equip onto the entry the flow just created, then
  // the sheet's Done ends the flow. Best-effort: a refused equip only re-words the settle (the grant is
  // held, the card waits in the switcher) — it never traps the user mid-flow. Outside the add flow this
  // is a no-op and the sheet keeps its standing "it's in your switcher" settle.
  async function onAdopted(_result: unknown, card: GalleryCardView) {
    if (!addFlowEntryId) return;
    setAdoptedInFlow(true);
    setSettleNote('It’s on your shelf — this game wears it now.');
    try {
      await updateEntry({ entryId: addFlowEntryId, activeCardDesignId: card.id }).unwrap();
    } catch {
      setSettleNote('It’s in your switcher — equip it on this game whenever you like.');
    }
  }

  // The sheet's ✕/Done. In the add flow a SUCCESSFUL adopt ends the whole flow (dismiss the add stack
  // → the Collection, carrying the one-shot justAdded); anything else just closes the drawer.
  function closeSheet() {
    setInspectCard(null);
    if (addFlowEntryId && adoptedInFlow) {
      router.dismissTo({ pathname: '/(tabs)/collection', params: { justAdded: addFlowEntryId } });
    }
  }

  // SOC-09-light — block the designer (the game page's wiring, mirrored: this surface shipped a ⋯ that
  // closed the sheet and blocked nobody).
  async function doBlock() {
    if (!blockCard) return;
    const designer = blockCard.designer.username;
    try {
      await blockUser(blockCard.designer.userId).unwrap();
      setToast({ tone: 'success', message: `${designer}'s cards are hidden from your community views.` });
      setInspectCard(null); // the gallery refetches (CommunityCards invalidated) — their cards vanish
    } catch {
      setToast({ tone: 'error', message: `Couldn't block ${designer} right now. Please try again.` });
    }
    setBlockCard(null);
  }

  // MOD-01 — the report submit mapping (the game page's, verbatim: offline vs a genuine failure).
  async function onSubmitReport(req: CreateReportRequest): Promise<ReportActionOutcome> {
    try {
      await submitReport(req).unwrap();
      return 'ok';
    } catch (e) {
      const err = e as { status?: unknown };
      if (err?.status === 'FETCH_ERROR' || err?.status === 'TIMEOUT_ERROR') return 'offline';
      return 'error';
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Text style={styles.headTitle} accessibilityRole="header" numberOfLines={1}>
            COMMUNITY CARDS
          </Text>
        </View>
        <View style={styles.retlink}>
          <TertiaryLink label="Return" chevron="leading-back" onPress={() => router.back()} />
        </View>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {isLoading || !gameId ? (
            <Skeleton variant="card-cell" count={4} />
          ) : isError ? (
            <LoadError
              message="Couldn't load the community cards. Check your connection and try again."
              onRetry={() => void refetch()}
            />
          ) : (
            <>
              {/* the sort switch (TOP = adoption · NEW = recency; the drawn "SORT ›") + the honest count */}
              <View style={styles.sortRow}>
                <SectionSwitch<GallerySort>
                  options={[
                    { value: 'top', label: 'Top' },
                    { value: 'new', label: 'New' },
                  ]}
                  value={sort}
                  onChange={setSort}
                />
                <Text style={styles.countLine}>
                  {total} {total === 1 ? 'CARD' : 'CARDS'}
                </Text>
              </View>

              {paging.items.length === 0 ? (
                <Text style={styles.empty}>No community cards for this game yet.</Text>
              ) : (
                <>
                  <View style={styles.grid}>
                    {paging.items.map((card) => (
                      <GalleryCell
                        key={card.id}
                        card={card}
                        onPress={canAdopt ? () => setInspectCard(card) : undefined}
                        onViewDesigner={() => router.push(`/contributor/${card.designer.userId}`)}
                      />
                    ))}
                  </View>
                  {paging.hasMore ? (
                    <View style={styles.loadMore}>
                      {paging.moreError ? (
                        <Text style={styles.moreErr}>Couldn&apos;t load more — try again.</Text>
                      ) : null}
                      <ScreenButton
                        label={moreState.isFetching ? 'Loading…' : 'Load more'}
                        variant="secondary"
                        onPress={() => void paging.loadMore()}
                        disabled={moreState.isFetching}
                      />
                    </View>
                  ) : (
                    <Text style={styles.end}>That&apos;s everything.</Text>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* the adopt sheet — screen-root sibling (PulledSheet contract); unreachable without ?adopt=1 */}
      <AdoptCardSheet
        card={inspectCard}
        visible={inspectCard !== null}
        balance={wallet?.balance ?? 0}
        onClose={closeSheet}
        onAdopt={onAdopt}
        adopting={adoptState.isLoading}
        onAdopted={(result, card) => void onAdopted(result, card)}
        settleNote={settleNote}
        onTopUp={() => {
          setInspectCard(null);
          router.push('/store?view=topup');
        }}
        onShare={() => {
          if (inspectCard) void shareCard(inspectCard.id, inspectCard.name);
        }}
        shareBusy={shareBusy}
        // walk-4 P2 (the folded-in extra) — REAL block/report, the game page's wiring mirrored. This
        // surface used to pass `onBlock={() => setInspectCard(null)}`: a ⋯ that closed the drawer and
        // blocked nobody, with no report row at all.
        onBlock={() => {
          if (inspectCard) setBlockCard(inspectCard);
        }}
        onReport={() => {
          if (inspectCard) {
            const c = inspectCard;
            setInspectCard(null); // one drawer at a time — close before raising the report sheet
            setReportTarget({ type: 'card', id: c.id, name: c.name });
          }
        }}
        onViewContributor={(userId) => {
          setInspectCard(null);
          router.push(`/contributor/${userId}`);
        }}
      />

      {/* SOC-09-light — the destructive block confirm at the screen root (decision 0073 §0.6) */}
      <ConfirmSheet
        visible={blockCard !== null}
        title={`Block ${blockCard?.designer.username ?? ''}?`}
        message="Their cards leave your community views. This doesn't remove a card you already adopted — your copy stays."
        confirmLabel="Block"
        busy={blockState.isLoading}
        onConfirm={() => void doBlock()}
        onClose={() => setBlockCard(null)}
      />

      {/* MOD-01 — the report drawer (card targets only on this surface) */}
      <ReportSheet
        visible={reportTarget !== null}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={onSubmitReport}
        submitting={reportState.isLoading}
        onError={(message) => setToast({ tone: 'error', message })}
      />

      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: { ...SCREEN_HEADER_PAD },
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countLine: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg },
  empty: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint, textAlign: 'center', paddingVertical: t.space.xl },

  loadMore: { alignItems: 'center', gap: t.space.md, marginTop: t.space.md },
  moreErr: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, textAlign: 'center', letterSpacing: 0.5 },
  end: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, textAlign: 'center', letterSpacing: 0.5, marginTop: t.space.md },
}));
