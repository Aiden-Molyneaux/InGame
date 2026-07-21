import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { GalleryCardView, GallerySort } from '@ingame/shared';
import { GALLERY_PAGE } from '@ingame/shared';
import { GalleryCell } from '../../../src/components/game/CommunityGallery';
import { AdoptCardSheet, type AdoptOutcome } from '../../../src/components/game/AdoptCardSheet';
import { SectionSwitch } from '../../../src/components/SectionSwitch';
import { TertiaryLink } from '../../../src/components/TertiaryLink';
import { ScreenButton } from '../../../src/components/ScreenButton';
import { Skeleton } from '../../../src/components/lifecycle/Skeleton';
import { LoadError } from '../../../src/components/lifecycle/LoadError';
import { useContributorPaging } from '../../../src/components/contributor/useContributorPaging';
import { useGetWalletQuery } from '../../../src/store/api';
import {
  useGetGameGalleryQuery,
  useLazyGetGameGalleryQuery,
  useAdoptCardMutation,
} from '../../../src/store/communityApi';
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
const keyOf = (c: GalleryCardView) => c.id;

export default function GameCardsList() {
  const { id, adopt } = useLocalSearchParams<{ id: string; adopt?: string }>();
  const router = useRouter();
  const styles = useStyles();
  const gameId = id ?? '';
  const canAdopt = adopt === '1';

  // Hooks ALL unconditional (F-16) — the lifecycle returns sit below every hook.
  const [sort, setSort] = useState<GallerySort>('top');
  const { data, isLoading, isError, refetch } = useGetGameGalleryQuery(
    { gameId, sort, limit: GALLERY_PAGE },
    { skip: !gameId },
  );
  const [trigger, moreState] = useLazyGetGameGalleryQuery();
  const { data: wallet } = useGetWalletQuery();
  const [adoptCard, adoptState] = useAdoptCardMutation();
  const [inspectCard, setInspectCard] = useState<GalleryCardView | null>(null);

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
  const paging = useContributorPaging<GalleryCardView>(page1, fetchMore, keyOf);
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
      if (code === 'ALREADY_ADOPTED') return { ok: false, code: 'ALREADY_ADOPTED' };
      if (code === 'NOT_PUBLISHED') return { ok: false, code: 'NOT_PUBLISHED' };
      return { ok: false, code: 'ERROR' };
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
        onClose={() => setInspectCard(null)}
        onAdopt={onAdopt}
        adopting={adoptState.isLoading}
        onAdopted={() => {}}
        onTopUp={() => {
          setInspectCard(null);
          router.push('/store?view=topup');
        }}
        onShare={() => {}}
        onBlock={() => setInspectCard(null)}
        onViewContributor={(userId) => {
          setInspectCard(null);
          router.push(`/contributor/${userId}`);
        }}
      />
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
