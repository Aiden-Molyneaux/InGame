import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ContributorCard } from '@ingame/shared';
import { EntryCard } from '../../../src/components/EntryCard';
import { ContributorViewAll } from '../../../src/components/contributor/ContributorViewAll';
import { useContributorPaging } from '../../../src/components/contributor/useContributorPaging';
import {
  useGetContributionsCardsQuery,
  useLazyGetContributionsCardsQuery,
} from '../../../src/store/contributorApi';
import { themedStyles } from '../../../src/theme';

// CAT-07 VIEW ALL — the full CARDS DESIGNED list (W-1). Reached from the contributor screen's CARDS
// DESIGNED → VIEW ALL. Cursor-paginated over GET /users/:id/contributions/cards?cursor= (friend-only,
// PROF-03 → 403). Each row is the /cell EntryCard face + the adoption line (the contributor board's
// full-grid grammar). A card tap opens the Game page (CARD-23 NAVIGATE). FLATTENED-ONLY (OQ-122).
const keyOf = (c: ContributorCard) => c.cardId;

export default function ContributorCardsList() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useStyles();
  const userId = id ?? '';

  const { data, isLoading, isError, error, refetch } = useGetContributionsCardsQuery(
    { userId },
    { skip: !userId },
  );
  const [trigger, moreState] = useLazyGetContributionsCardsQuery();
  const paging = useContributorPaging<ContributorCard>(data, (cursor) => trigger({ userId, cursor }), keyOf);

  return (
    <ContributorViewAll
      title="Cards designed"
      onBack={() => router.back()}
      isLoading={isLoading || !userId}
      isError={isError}
      errorStatus={(error as { status?: unknown } | undefined)?.status}
      onRetry={() => void refetch()}
      isEmpty={paging.items.length === 0}
      emptyMessage="No cards yet."
      hasMore={paging.hasMore}
      moreError={paging.moreError}
      loadingMore={moreState.isFetching}
      onLoadMore={() => void paging.loadMore()}
    >
      <View style={styles.grid}>
        {paging.items.map((c) => (
          <Pressable
            key={c.cardId}
            style={styles.cell}
            accessibilityRole="button"
            accessibilityLabel={`View ${c.gameTitle} card, ${c.adoptionCount} adoptions`}
            onPress={() => router.push(`/game/${c.gameId}`)}
          >
            <EntryCard title={c.gameTitle} card={{ imageUrl: c.card.imageUrl, thumbUrl: c.card.thumbUrl }} size="cell" />
            <Text style={styles.adoptLine}>
              <Text style={styles.adoptB}>{c.adoptionCount.toLocaleString('en-US')}</Text> ADOPTIONS
            </Text>
          </Pressable>
        ))}
      </View>
    </ContributorViewAll>
  );
}

const useStyles = themedStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg, justifyContent: 'space-between' },
  cell: { alignItems: 'center', gap: t.space.sm },
  adoptLine: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  adoptB: { fontFamily: t.font.screenBold, color: t.scr.accent },
}));
