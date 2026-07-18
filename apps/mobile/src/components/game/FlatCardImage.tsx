import { Image, View, type ViewStyle } from 'react-native';
import { GameCard, type GameCardSize } from '../GameCard';
import { themedStyles } from '../../theme';
import { resolveMediaUrl } from '../../store/mediaUrl';
import { PLATE_MIN_W } from '../../render/buildCard';

/**
 * Pick the flattened image for a given rendered width (walk2 W-A2 — the nameplate-inconsistency
 * class, killed at the wrapper): `full.png` carries the BAKED nameplate; `thumb.png` is PLATELESS.
 * The live renderer plates at `W >= PLATE_MIN_W` and drops the plate below it — the flattened source
 * must mirror the same gate or flattened cards render plated at sizes where live-composed siblings
 * are plateless (the feed-thumb / mixed-list symptom). Small → thumb (plateless); at/above the gate
 * → full (plated); either missing → graceful fallback to the other. Call sites pass BOTH urls and
 * never pre-pick — the wrapper (EntryCard / this component) owns the choice.
 */
export function pickFlatSource(
  renderedWidth: number,
  imageUrl?: string | null,
  thumbUrl?: string | null,
): string | null | undefined {
  return renderedWidth < PLATE_MIN_W ? (thumbUrl ?? imageUrl) : (imageUrl ?? thumbUrl);
}

// FlatCardImage (P8 infra) — the CROSS-USER card renderer. A community/gallery card carries NO
// composition on the wire (OQ-138 / CARD-15 / 0066 §2): viewers get the FLATTENED image, never live
// skia. So this draws the published `imageUrl`/`thumbUrl` through a plain RN <Image> — the live-canvas
// budget is editors-only (0073 §0.10). A null/missing url (a published card should always have one —
// publish flattens) degrades to the `GameCard` default placeholder so nothing renders broken.
const SIZE_DIMS: Record<GameCardSize, { w: number; h: number }> = {
  hero: { w: 224, h: 313 },
  pick: { w: 138, h: 193 },
  grid: { w: 161, h: 225 },
  cell: { w: 96, h: 134 },
  mini: { w: 64, h: 89 },
  thumb: { w: 48, h: 67 },
};

export function FlatCardImage({
  title,
  imageUrl,
  thumbUrl,
  size = 'cell',
  width,
  height,
  style,
}: {
  title: string;
  /** The flattened published render (relative `/media/…` or absolute). Null → the default placeholder. */
  imageUrl: string | null | undefined;
  /**
   * The PLATELESS thumb render (walk2 W-A2). When provided, this component picks thumb-vs-full by
   * its rendered width against the shared PLATE_MIN_W gate (the same choice EntryCard makes) — call
   * sites pass BOTH urls and stop pre-picking. Omitted → `imageUrl` renders as before.
   */
  thumbUrl?: string | null;
  size?: GameCardSize;
  width?: number;
  height?: number;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const w = width ?? SIZE_DIMS[size].w;
  const h = height ?? SIZE_DIMS[size].h;
  const uri = resolveMediaUrl(thumbUrl !== undefined ? pickFlatSource(w, imageUrl, thumbUrl) : imageUrl);

  if (!uri) {
    return <GameCard title={title} size={size} style={{ width: w, height: h, ...style }} />;
  }
  return (
    <View style={[{ width: w, height: h }, style]} pointerEvents="none">
      <Image
        source={{ uri }}
        resizeMode="cover"
        accessibilityRole="image"
        accessibilityLabel={`${title} card`}
        style={[styles.img, { width: w, height: h }]}
      />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  img: { backgroundColor: t.scr.panel },
}));
