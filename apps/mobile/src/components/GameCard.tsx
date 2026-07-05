import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { theme } from '../theme';
import { steppedRectPath } from '../theme/steppedPath';

// GameCard (component-map §5.2) — the universal game handle. F-01: NEVER cropped — the full face at
// the fixed 63:88 ratio, only scaled. F-02: the signature TL+BR pixel-STEP silhouette is now REAL
// (decision 0041 / OQ-127) — the face + plate are drawn as `steppedRectPath` SVG polygons (RN has no
// clip-path), the same shared helper the ADD button + StateMark use. `.plate` is an F-06-bound (≥9px)
// UI label; /mini + /thumb DROP the plate (title named below). The face here is the CARD-18 DEFAULT
// face (a themed placeholder) — the real vector-composition + skia render is M4.

export type GameCardSize = 'hero' | 'grid' | 'cell' | 'mini' | 'thumb';

const SIZES: Record<GameCardSize, { w: number; h: number; plate: number | null; step: number }> = {
  hero: { w: 224, h: 313, plate: 11, step: theme.step },
  grid: { w: 161, h: 225, plate: 11, step: theme.step },
  cell: { w: 96, h: 134, plate: 10, step: theme.step }, // /cell plate at the 10px floor (decision 0047)
  mini: { w: 64, h: 89, plate: null, step: theme.step / 2 }, // half-step keeps the notch proportionate
  thumb: { w: 48, h: 67, plate: null, step: theme.step / 2 },
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
  const { w, h, step: u } = dims;
  const hue = faceHue(title);
  const showPlate = dims.plate !== null;
  const plateH = showPlate ? (dims.plate as number) + 8 : 0; // text + vertical padding; > 2u so the BR notch fits

  const faceFill = `hsl(${hue}, 42%, 26%)`;
  const bevelStroke = `hsl(${hue}, 55%, 44%)`;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${title} card`}
      style={[{ width: w, height: h }, style]}
    >
      {/* F-02 silhouette (decision 0041): the face fill + a hairline stepped border, the plate strip
          (BR notch only), and an inset stepped bevel — all one shared steppedRectPath helper. */}
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Path d={steppedRectPath(w, h, u)} fill={faceFill} stroke={theme.scr.hairline} strokeWidth={1} />
        <Path
          d={steppedRectPath(w - 8, h - 8, u)}
          transform="translate(4 4)"
          fill="none"
          stroke={bevelStroke}
          strokeWidth={1}
          opacity={0.6}
        />
        {showPlate ? (
          <>
            <Path
              d={steppedRectPath(w, plateH, u, { br: true })}
              transform={`translate(0 ${h - plateH})`}
              fill={theme.scr.bg}
            />
            <Line x1={0} y1={h - plateH} x2={w} y2={h - plateH} stroke={theme.scr.hairline} strokeWidth={1} />
          </>
        ) : null}
      </Svg>

      {foil ? <View style={[styles.foil, { left: 2 * u }]} accessibilityLabel="premium card" /> : null}
      {nowPlaying ? (
        <View style={styles.nowTag}>
          <Text style={styles.nowText}>▶ NOW</Text>
        </View>
      ) : null}
      {/* C7/decision 0047 — /mini + /thumb carry NO in-face title (it would wrap sub-9px, F-06);
          the host names the game BESIDE the card (LIST/TOP rows do). a11y keeps the label. */}
      {showPlate ? (
        <View style={[styles.plate, { height: plateH }]}>
          <Text style={[styles.plateText, { fontSize: dims.plate ?? 9 }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  foil: {
    position: 'absolute',
    top: 4,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: theme.space.sm,
  },
  plateText: {
    fontFamily: theme.font.screenSemi,
    color: theme.scr.ink,
    letterSpacing: 0.3,
  },
});
