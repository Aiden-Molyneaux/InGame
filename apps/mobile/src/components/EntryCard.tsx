import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { CardFace, parseComposition, SIZE_DIMS } from './CardFace';
import { pickFlatSource } from './game/FlatCardImage';
import type { GameCardSize } from './GameCard';

// EntryCard — the ONE way to render a card that came from an ENTRY/ROW (a collection item, a switcher
// row, a profile seat), i.e. a card whose provenance the caller does NOT control. Such a card is one
// of exactly two things and the renderer must handle BOTH:
//   • OWN composition  → the owner renders it LIVE (skia) from `composition` (0066 §2).
//   • ADOPTED/flattened → a cross-user card carries NO composition, only a flattened `imageUrl`
//                         (OQ-122 / CARD-15) — it must draw the image, or it falls back to the DEFAULT
//                         placeholder and "shows wrong".
//
// This wrapper exists to KILL a recurring bug class (F-8 · F-12 · F-19): every time a call site wrote
// `<CardFace composition={parse(x.card.composition)} />` and FORGOT `imageUrl`, adopted cards silently
// rendered the default face. EntryCard takes the whole `card` OBJECT (which carries both fields), so a
// caller can no longer drop one — the branch is owned HERE, internally, on top of CardFace's own
// composition-vs-imageUrl logic. There is no behaviour change vs. a correctly-threaded CardFace call;
// this is pure consolidation.
//
// walk2 W-A2 extends the same kill to the SECOND flattened choice: thumb-vs-full. `full.png` bakes
// the nameplate in; `thumb.png` is plateless — and call sites pre-picking one url (`thumbUrl ??
// imageUrl` and friends) recreated the plate inconsistency the live renderer's PLATE_MIN_W gate
// prevents (feed thumbs plated, list rows mixed). So the card object carries BOTH urls and the
// wrapper picks by its rendered width via `pickFlatSource` — a caller can no longer choose wrong.
//
// WHY not everything routes through here — OWN-COMPOSITION-ONLY surfaces stay a DIRECT `<CardFace>`:
//   • Styler / Canvas / Proof / PrintRitual / BaseRail / KeepBeat — the editor is drawing the user's
//     OWN in-progress design; there is no "adopted" case (and no `imageUrl`) to handle, and the live
//     draft `composition` is the only input. Forcing them through EntryCard would add a meaningless
//     imageUrl branch. CardSwitcher stays direct too: its `Row` is a discriminated union (OwnedRow has
//     `composition`, AdoptedRow has `imageUrl`) that STRUCTURALLY can't drop a field — it already has
//     the guarantee EntryCard provides, via the type system. CommunityGallery stays on FlatCardImage:
//     a `GalleryCardView` is flattened-ONLY by contract (no composition field ever), so there is no
//     both-cases branch to get wrong.

/**
 * The minimal shape an entry/row card carries. `composition` is the RAW wire rider (unknown → parsed
 * here) — or an already-parsed comp (idempotent re-parse); `imageUrl`/`thumbUrl` are the flattened
 * renders. All are optional because a given card has exactly one family, but taking the whole object
 * is what makes it impossible to render an entry card while forgetting the flattened branch.
 */
export type EntryCardData = {
  composition?: unknown;
  imageUrl?: string | null;
  thumbUrl?: string | null;
};

export function EntryCard({
  card,
  title,
  size,
  width,
  height,
  nowPlaying,
  animate,
  style,
}: {
  card: EntryCardData;
  title: string;
  size?: GameCardSize;
  /** Explicit pixel size (overrides `size` dims). */
  width?: number;
  height?: number;
  nowPlaying?: boolean;
  /** Opt into the live motion overlay (0068) — hero/detail/inspect surfaces only. */
  animate?: boolean;
  style?: ViewStyle;
}) {
  // Memoized on the raw rider identity so the skia canvas' composition prop stays stable across parent
  // re-renders (the FlipCard round-4 lesson — a fresh parse per render forced a canvas re-encode).
  const composition = useMemo(() => parseComposition(card.composition), [card.composition]);
  // W-A2 — the wrapper picks thumb-vs-full by the rendered width (explicit `width` wins, else the
  // size's intrinsic width), mirroring the live plate gate. Only the flattened branch reads it.
  const renderedWidth = width ?? SIZE_DIMS[size ?? 'grid'].w;
  return (
    <CardFace
      title={title}
      composition={composition}
      imageUrl={pickFlatSource(renderedWidth, card.imageUrl, card.thumbUrl)}
      size={size}
      width={width}
      height={height}
      nowPlaying={nowPlaying}
      animate={animate}
      style={style}
    />
  );
}
