import { Image, View, type ViewStyle } from 'react-native';
import { GameCard, type GameCardSize } from '../GameCard';
import { themedStyles } from '../../theme';
import { resolveMediaUrl } from '../../store/mediaUrl';

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
  size = 'cell',
  width,
  height,
  style,
}: {
  title: string;
  /** The flattened published render (relative `/media/…` or absolute). Null → the default placeholder. */
  imageUrl: string | null | undefined;
  size?: GameCardSize;
  width?: number;
  height?: number;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const w = width ?? SIZE_DIMS[size].w;
  const h = height ?? SIZE_DIMS[size].h;
  const uri = resolveMediaUrl(imageUrl);

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
