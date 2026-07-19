import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ContributorGame } from '@ingame/shared';
import { ContributorViewAll } from '../../../src/components/contributor/ContributorViewAll';
import { useContributorPaging } from '../../../src/components/contributor/useContributorPaging';
import {
  useGetContributionsGamesQuery,
  useLazyGetContributionsGamesQuery,
} from '../../../src/store/contributorApi';
import { themedStyles } from '../../../src/theme';

// CAT-07/CAT-09 VIEW ALL — the full GAMES ADDED list (W-1). Reached from the contributor screen's GAMES
// ADDED → VIEW ALL. Cursor-paginated over GET /users/:id/contributions/games?cursor= (friend-only,
// PROF-03 → 403). Each row is the title + "IN N COLLECTIONS" grammar (the contributor board's GameRow —
// no thumb, matching the on-screen grammar; the sub-route's optional `card` thumb is left unused, as the
// parent teaser rows are thumbless). A row tap opens the Game page (CARD-23 NAVIGATE).
const keyOf = (g: ContributorGame) => g.gameId;

export default function ContributorGamesList() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useStyles();
  const userId = id ?? '';

  const { data, isLoading, isError, error, refetch } = useGetContributionsGamesQuery(
    { userId },
    { skip: !userId },
  );
  const [trigger, moreState] = useLazyGetContributionsGamesQuery();
  const paging = useContributorPaging<ContributorGame>(data, (cursor) => trigger({ userId, cursor }), keyOf);

  return (
    <ContributorViewAll
      title="Games added"
      onBack={() => router.back()}
      isLoading={isLoading || !userId}
      isError={isError}
      errorStatus={(error as { status?: unknown } | undefined)?.status}
      onRetry={() => void refetch()}
      isEmpty={paging.items.length === 0}
      emptyMessage="No games yet."
      hasMore={paging.hasMore}
      moreError={paging.moreError}
      loadingMore={moreState.isFetching}
      onLoadMore={() => void paging.loadMore()}
    >
      <View style={styles.rows}>
        {paging.items.map((g) => (
          <Pressable
            key={g.gameId}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${g.title}, in ${g.collectionsCount} collections`}
            onPress={() => router.push(`/game/${g.gameId}`)}
          >
            <View style={styles.meta}>
              <Text style={styles.title} numberOfLines={1}>
                {g.title.toUpperCase()}
              </Text>
              <Text style={styles.reach}>IN {g.collectionsCount.toLocaleString('en-US')} COLLECTIONS</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        ))}
      </View>
    </ContributorViewAll>
  );
}

const useStyles = themedStyles((t) => ({
  rows: { backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.lg,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
  },
  rowPressed: { backgroundColor: t.scr.panelHi },
  meta: { flex: 1, gap: t.space.xs },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  reach: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  chev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },
}));
