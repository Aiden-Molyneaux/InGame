import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '../theme';

// GameCard (component-map §5.2) — the universal game handle. F-01: NEVER cropped — the full face at
// the fixed 63:88 ratio, only scaled. `size`: hero · grid(161×225) · cell(96×134) · mini(64×89) ·
// thumb. `.plate` is an F-06-bound (≥9px) UI label; /mini + /thumb DROP the plate (title named below).
// F-07: square on screen. The face here is the CARD-18 DEFAULT face (a themed placeholder) — the real
// vector-composition + skia render is M4.

export type GameCardSize = 'hero' | 'grid' | 'cell' | 'mini' | 'thumb';

const SIZES: Record<GameCardSize, { w: number; h: number; plate: number | null }> = {
  hero: { w: 224, h: 313, plate: 11 },
  grid: { w: 161, h: 225, plate: 11 },
  cell: { w: 96, h: 134, plate: 10 }, // /cell plate at the 10px floor (decision 0047)
  mini: { w: 64, h: 89, plate: null }, // drops the plate (F-06)
  thumb: { w: 48, h: 67, plate: null },
};

/** A stable, distinct face colour derived from the title (until the M4 custom render lands). */
function faceHue(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return h;
}

export function GameCard({
  title,
  size = 'grid',
  nowPlaying = false,
  foil = false,
  style,
}: {
  title: string;
  size?: GameCardSize;
  nowPlaying?: boolean;
  foil?: boolean;
  style?: ViewStyle;
}) {
  const dims = SIZES[size];
  const hue = faceHue(title);
  const showPlate = dims.plate !== null;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${title} card`}
      style={[{ width: dims.w, height: dims.h }, styles.card, style]}
    >
      <View style={[styles.face, { backgroundColor: `hsl(${hue}, 42%, 26%)` }]}>
        <View style={[styles.faceBevel, { borderColor: `hsl(${hue}, 55%, 44%)` }]} />
        {foil ? <View style={styles.foil} accessibilityLabel="premium card" /> : null}
        {nowPlaying ? (
          <View style={styles.nowTag}>
            <Text style={styles.nowText}>▶ NOW</Text>
          </View>
        ) : null}
        {/* C7/decision 0047 — /mini + /thumb carry NO in-face title (it would wrap sub-9px, F-06);
            the host names the game BESIDE the card (LIST/TOP rows do). a11y keeps the label. */}
      </View>
      {showPlate ? (
        <View style={styles.plate}>
          <Text style={[styles.plateText, { fontSize: dims.plate ?? 9 }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.corner.screen, // F-07 square
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.scr.hairline,
  },
  face: { flex: 1, padding: theme.space.sm, justifyContent: 'flex-end' },
  faceBevel: {
    ...StyleSheet.absoluteFillObject,
    margin: 4,
    borderWidth: 1,
    opacity: 0.6,
  },
  foil: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: theme.brand.gold,
    opacity: 0.85,
  },
  nowTag: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.scr.accent,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  nowText: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro,
    color: theme.scr.accentInk,
    letterSpacing: 0.5,
  },
  plate: {
    backgroundColor: theme.scr.bg,
    borderTopWidth: 1,
    borderTopColor: theme.scr.hairline,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
  },
  plateText: {
    fontFamily: theme.font.screenSemi,
    color: theme.scr.ink,
    letterSpacing: 0.3,
  },
});
