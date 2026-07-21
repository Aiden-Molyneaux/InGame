import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { GalleryCardView, GallerySort } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { PriceChip } from '../commerce/PriceChip';
import { Skeleton } from '../lifecycle/Skeleton';
import { LoadError } from '../lifecycle/LoadError';
import { SectionEmpty } from '../lifecycle/SectionEmpty';
import { TertiaryLink } from '../TertiaryLink';
import { FlatCardImage } from './FlatCardImage';
import { useGetGameGalleryQuery } from '../../store/communityApi';

// CommunityGallery (component-map §9) — the game page CARDS-tab community roster: OTHER users' PUBLISHED
// cards for this game (GET /games/:gameId/cards), rendered as flattened thumbs (OQ-138, never skia).
// Each cell carries the designer credit, an AdoptCount, and the caller's PERSONALIZED price (decision
// 0072: `priceForYou` = the missing-components sum, FREE at 0). Tapping a cell opens the inspect/adopt
// sheet (the container mounts `AdoptCardSheet` at the screen root). This is a SECTION inside a populated
// screen, so its lifecycle states stay inline — the switcher above is never replaced.
//
// 0.81 (owner walk m6) — the inline gallery is a TOP-N STRIP now, per the drawn game-page mockups
// (game-page-states.html "COMMUNITY CARDS — 41 · SORT ›" / "SEE ALL ›"): `top` caps the fetch
// server-side (sort=top&limit=N — closing the unbounded-gallery load cliff), `sortToggle` renders the
// head's SORT link (TOP ↔ NEW re-reads server-side), and `onSeeAll` renders the "SEE ALL {N} ›" door
// to the full paged list (/game/[id]/cards). All props optional — a bare mount keeps the pre-0.81
// full-set read (the add-game fork passes `top` without the toggle; the game pages pass all three).
export function CommunityGallery({
  gameId,
  onInspect,
  onDesignACard,
  onViewDesigner,
  canAdopt = true,
  top,
  sortToggle = false,
  onSeeAll,
}: {
  gameId: string;
  onInspect: (card: GalleryCardView) => void;
  /** The contributor-hook empty door — routes to the Styler for this game. */
  onDesignACard: () => void;
  /** P13 (E8a) — tapping the DESIGNED-BY credit routes to that contributor's profile. */
  onViewDesigner: (userId: string) => void;
  /**
   * W-D1 Q4 (AS-5, the load-bearing guard) — BROWSE-ONLY when false: the CATALOG posture cannot adopt a
   * card for a game you don't own (adoption routes through Add-Game). The cell's inspect/adopt press is
   * suppressed STRUCTURALLY (no `onInspect` wired → the AdoptCardSheet is never mountable here), so a
   * careless reuse can't slip an adopt path into CATALOG. Faces + counts + the designer credit still
   * render (browsing is allowed); only the adopt affordance is gone.
   */
  canAdopt?: boolean;
  /** Cap the strip at the server-ranked top N (sort=top&limit=N). Absent → the full-set read. */
  top?: number;
  /** Render the head's SORT link (TOP ↔ NEW; the mockups' "SORT ›"). Only meaningful with `top`. */
  sortToggle?: boolean;
  /** Render the "SEE ALL {N} ›" door (shown when the gallery holds more than the strip). */
  onSeeAll?: () => void;
}) {
  const styles = useStyles();
  const [sort, setSort] = useState<GallerySort>('top');
  const { data, isLoading, isError, refetch } = useGetGameGalleryQuery(
    top != null ? { gameId, sort: sortToggle ? sort : 'top', limit: top } : { gameId },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? items.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.headTitle}>
          COMMUNITY CARDS{total > 0 ? ` — ${total}` : ''}
        </Text>
        {sortToggle && items.length > 0 ? (
          <TertiaryLink
            label={`Sort: ${sort === 'top' ? 'top' : 'new'}`}
            onPress={() => setSort((s) => (s === 'top' ? 'new' : 'top'))}
          />
        ) : null}
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
        <>
          <View style={styles.grid}>
            {items.map((card) => (
              <GalleryCell
                key={card.id}
                card={card}
                onPress={canAdopt ? () => onInspect(card) : undefined}
                onViewDesigner={() => onViewDesigner(card.designer.userId)}
              />
            ))}
          </View>
          {onSeeAll && total > items.length ? (
            <View style={styles.seeAll}>
              <TertiaryLink label={`See all ${total}`} onPress={onSeeAll} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

// One gallery cell — flattened thumb + BY «designer» + a foot: price (or FREE / a provenance tag) +
// AdoptCount. F-13 E4 (owner round-2): the caller's OWN published cards read "BY YOU", and cards the
// caller has already ADOPTED wear an "ADOPTED" tag in place of a price (they already hold the grant).
// EXPORTED (0.81) so the full-list route (/game/[id]/cards) renders the same cell grammar.
export function GalleryCell({
  card,
  onPress,
  onViewDesigner,
}: {
  card: GalleryCardView;
  /** The inspect/adopt press — UNDEFINED in browse-only mode (CATALOG, Q4): the art + foot render as
      plain Views, so there is no adopt path at all (the sheet is never reachable). */
  onPress?: () => void;
  onViewDesigner: () => void;
}) {
  const styles = useStyles();
  const free = card.priceForYou <= 0;
  const a11y = !onPress
    ? `${card.name} by ${card.byViewer ? 'you' : card.designer.username}, adopted ${card.adoptionCount} times`
    : card.byViewer
      ? `${card.name} by you, adopted ${card.adoptionCount} times`
      : `${card.name} by ${card.designer.username}, ${card.adopted ? 'already adopted' : free ? 'free' : `${card.priceForYou} pixels`} to adopt, adopted ${card.adoptionCount} times`;
  // P13 (E8a) / parvati F3 — the cell is a plain View of SIBLING Pressables, never a Pressable inside a
  // Pressable: RN-web routes a nested press to the OUTER responder (the credit tap opened the adopt
  // sheet; jest couldn't catch it — fireEvent targets the inner node in isolation). The art (and the
  // foot, kept tappable) inspect; the credit line routes to the contributor profile. No nesting = no
  // responder-order subtleties on either platform.
  // W-D1 Q4 — with no `onPress` (CATALOG browse-only) the art + foot are plain Views: no adopt affordance.
  return (
    <View style={styles.cell}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}>
          <FlatCardImage title={card.name} imageUrl={card.imageUrl} thumbUrl={card.thumbUrl} size="cell" />
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={a11y}>
          <FlatCardImage title={card.name} imageUrl={card.imageUrl} thumbUrl={card.thumbUrl} size="cell" />
        </View>
      )}
      {/* the DESIGNED-BY credit → the contributor profile; "BY YOU" routes to your own. */}
      <Pressable
        onPress={onViewDesigner}
        accessibilityRole="button"
        accessibilityLabel={`View ${card.byViewer ? 'your' : `${card.designer.username}'s`} contributions`}
        hitSlop={4}
      >
        <Text style={styles.credit} numberOfLines={1}>
          {card.byViewer ? (
            <Text style={styles.creditYou}>BY YOU</Text>
          ) : (
            <>
              BY <Text style={styles.creditName}>{card.designer.username.toUpperCase()}</Text>
            </>
          )}
        </Text>
      </Pressable>
      {/* the foot — an inspect surface when adopt-capable (its own sibling Pressable, hidden from the SR:
          the art already carries the full a11y sentence). In browse-only mode (no onPress) it is a plain
          View — the price/count still read, but there is no adopt tap. */}
      {onPress ? (
        <Pressable onPress={onPress} accessible={false} style={styles.foot}>
          <GalleryFoot card={card} free={free} />
        </Pressable>
      ) : (
        <View style={styles.foot}>
          <GalleryFoot card={card} free={free} />
        </View>
      )}
    </View>
  );
}

// The gallery cell's foot content — provenance wins over price: an already-adopted card (or your own)
// never shows a buy price. Shared by the adopt-capable + browse-only feet so the two can't drift.
function GalleryFoot({ card, free }: { card: GalleryCardView; free: boolean }) {
  const styles = useStyles();
  return (
    <>
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
    </>
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
  // 0.81 — the SEE ALL {N} › door under the top-N strip (the mockups' full-list hook).
  seeAll: { alignItems: 'center', marginTop: t.space.sm },
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
