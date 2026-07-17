import { View, Text, Pressable } from 'react-native';
import type { GalleryCardView } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { PriceChip } from '../commerce/PriceChip';
import { Skeleton } from '../lifecycle/Skeleton';
import { LoadError } from '../lifecycle/LoadError';
import { SectionEmpty } from '../lifecycle/SectionEmpty';
import { FlatCardImage } from './FlatCardImage';
import { useGetGameGalleryQuery } from '../../store/communityApi';

// CommunityGallery (component-map §9) — the game page CARDS-tab community roster: OTHER users' PUBLISHED
// cards for this game (GET /games/:gameId/cards), rendered as flattened thumbs (OQ-138, never skia).
// Each cell carries the designer credit, an AdoptCount, and the caller's PERSONALIZED price (decision
// 0072: `priceForYou` = the missing-components sum, FREE at 0). Tapping a cell opens the inspect/adopt
// sheet (the container mounts `AdoptCardSheet` at the screen root). This is a SECTION inside a populated
// screen, so its lifecycle states stay inline — the switcher above is never replaced.
export function CommunityGallery({
  gameId,
  onInspect,
  onDesignACard,
}: {
  gameId: string;
  onInspect: (card: GalleryCardView) => void;
  /** The contributor-hook empty door — routes to the Styler for this game. */
  onDesignACard: () => void;
}) {
  const styles = useStyles();
  const { data, isLoading, isError, refetch } = useGetGameGalleryQuery(gameId);
  const items = data?.items ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.headTitle}>
          COMMUNITY CARDS{items.length > 0 ? ` — ${items.length}` : ''}
        </Text>
      </View>

      {isLoading ? (
        <Skeleton variant="tile-row" count={3} />
      ) : isError ? (
        <View style={styles.errWrap}>
          <LoadError
            title="Couldn't load the community cards"
            message="This section didn't answer — your own cards above are unaffected. Try again."
            onRetry={() => void refetch()}
          />
        </View>
      ) : items.length === 0 ? (
        <SectionEmpty variant="contributor-hook" onAction={onDesignACard} />
      ) : (
        <View style={styles.grid}>
          {items.map((card) => (
            <GalleryCell key={card.id} card={card} onPress={() => onInspect(card)} />
          ))}
        </View>
      )}
    </View>
  );
}

// One gallery cell — flattened thumb + BY «designer» + a foot: price (or FREE / a provenance tag) +
// AdoptCount. F-13 E4 (owner round-2): the caller's OWN published cards read "BY YOU", and cards the
// caller has already ADOPTED wear an "ADOPTED" tag in place of a price (they already hold the grant).
function GalleryCell({ card, onPress }: { card: GalleryCardView; onPress: () => void }) {
  const styles = useStyles();
  const free = card.priceForYou <= 0;
  const a11y = card.byViewer
    ? `${card.name} by you, adopted ${card.adoptionCount} times`
    : `${card.name} by ${card.designer.username}, ${card.adopted ? 'already adopted' : free ? 'free' : `${card.priceForYou} pixels`} to adopt, adopted ${card.adoptionCount} times`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={styles.cell}
    >
      <FlatCardImage title={card.name} imageUrl={card.thumbUrl ?? card.imageUrl} size="cell" />
      <Text style={styles.credit} numberOfLines={1}>
        {card.byViewer ? (
          <Text style={styles.creditYou}>BY YOU</Text>
        ) : (
          <>
            BY <Text style={styles.creditName}>{card.designer.username.toUpperCase()}</Text>
          </>
        )}
      </Text>
      <View style={styles.foot}>
        {/* provenance wins over price: an already-adopted card (or your own) never shows a buy price. */}
        {card.byViewer || card.adopted ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{card.byViewer ? 'YOURS' : 'ADOPTED'}</Text>
          </View>
        ) : free ? (
          <View style={styles.freeChip}>
            <Text style={styles.freeChipText}>FREE</Text>
          </View>
        ) : (
          <PriceChip pixels={card.priceForYou} />
        )}
        <AdoptCount count={card.adoptionCount} />
      </View>
    </Pressable>
  );
}

// AdoptCount (component-map §9) — the "N×" adoption clout tally (public by design, decision 0024/OQ-100).
export function AdoptCount({ count }: { count: number }) {
  const styles = useStyles();
  return (
    <Text style={styles.count} accessibilityLabel={`adopted ${count} times`}>
      {count}×
    </Text>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { gap: t.space.md, marginTop: t.space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 2 },
  errWrap: { paddingVertical: t.space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg },
  cell: { width: 96, gap: 3 },
  credit: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, marginTop: 3 },
  creditName: { fontFamily: t.font.screenBold, color: t.scr.ink },
  // F-13 E4 — "BY YOU" reads in the gold economy/authorship voice so it's unmistakably the caller's card.
  creditYou: { fontFamily: t.font.screenBold, color: t.brand.gold, letterSpacing: 1 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  freeChip: { backgroundColor: t.scr.panelHi, paddingHorizontal: 5, paddingVertical: 3, borderWidth: 1, borderColor: t.scr.hairline },
  freeChipText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5 },
  // F-13 E4 — the YOURS/ADOPTED provenance tag: a gold-OUTLINE chip (COSM-04 grammar — never a fill, so
  // it can't read as a price), distinct from the cream OwnedTag and the gold-fill PriceChip.
  tag: { borderWidth: 1, borderColor: t.brand.gold, paddingHorizontal: 5, paddingVertical: 2.5 },
  tagText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 0.8 },
  count: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
}));
