import { useId, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Path, Rect, Defs, ClipPath } from 'react-native-svg';
import { themedStyles, useTheme } from '../theme';
import { cardStepUnit, steppedRectPath } from '../theme/steppedPath';
import { PLATE_H_RATIO } from '../render/buildCard';

// GameCard (component-map §5.2) — the universal game handle. F-01: NEVER cropped — the full face at
// the fixed 63:88 ratio, only scaled. F-02: the signature TL+BR pixel-STEP silhouette is now REAL
// (decision 0041 / OQ-127) — the face + plate are drawn as `steppedRectPath` SVG polygons (RN has no
// clip-path), the same shared helper the ADD button + StateMark use. `.plate` is an F-06-bound (≥9px)
// UI label; /mini + /thumb DROP the plate (title named below). The face here is the CARD-18 DEFAULT
// face (a themed placeholder) — the real vector-composition + skia render is M4.

export type GameCardSize = 'hero' | 'pick' | 'grid' | 'cell' | 'mini' | 'thumb';

// The F-02 pixel-step is no longer per-size here — it scales with the drawn box via `cardStepUnit`
// (F-18) so the default face matches the composed/flattened card silhouette at every size.
const SIZES: Record<GameCardSize, { w: number; h: number; plate: number | null }> = {
  hero: { w: 224, h: 313, plate: 11 },
  pick: { w: 138, h: 193, plate: 11 }, // the board `.gcard.pick` — dual-face hero + CardDetail enlarge (M4 Game page)
  grid: { w: 161, h: 225, plate: 11 },
  cell: { w: 96, h: 134, plate: 10 }, // /cell plate at the 10px floor (decision 0047)
  mini: { w: 64, h: 89, plate: null },
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
  const t = useTheme();
  const styles = useStyles();
  const dims = SIZES[size];
  const { w, h } = dims;
  const hue = faceHue(title);
  const showPlate = dims.plate !== null;

  const faceFill = `hsl(${hue}, 42%, 26%)`;
  const bevelStroke = `hsl(${hue}, 55%, 44%)`;

  // The face is drawn as an SVG polygon (RN has no clip-path), so it MUST track the card's ACTUAL
  // laid-out box — callers resize via `style` (Collection `heroCard` 138×193, `fluidCard`
  // 100%/aspectRatio, Profile's favourite), and drawing at the fixed SIZES w/h made the SVG overflow
  // (or underflow) the resized container — the "card breaks its container" bug (regression from the
  // OQ-127 SVG-face change). Measure via onLayout and draw to the measured box; the intrinsic w/h is
  // just the first-frame fallback (mirrors ScreenButton's stepped `add`).
  const [box, setBox] = useState<{ w: number; h: number }>({ w, h });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setBox((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
    }
  };
  const bw = box.w;
  const bh = box.h;
  // F-18 — the pixel-step scales with the drawn box so the default face matches the composed/flattened
  // silhouette at every size (was the fixed `dims.step`, which drifted from the proportional card render).
  const u = cardStepUnit(bw);
  // walk2 W-A3/A3b (CARD-18) — the default face's plate composes EXACTLY like buildCard's designed
  // plate: band height = PLATE_H_RATIO of the drawn height, LIFTED off the bottom edge by the same
  // formula ("a couple pixels", plateGroup), and CLIPPED to the stepped silhouette so the notched
  // corners stay intact. The old render was a screen-bg-coloured strip pinned to the very bottom —
  // against the screen background it read as an EXTERNAL title band hanging below the card, covering
  // the frame's bottom edge + step (the owner's Hades screenshot). Same-hue dark fill so the band
  // reads as part of the card, never a hole.
  const plateH = showPlate ? Math.round(bh * PLATE_H_RATIO) : 0;
  const plateLift = showPlate ? Math.max(2, Math.round(bh * 0.012)) : 0;
  // Unique per instance — many cards render per screen and RN-svg-web emits REAL svg defs; a shared
  // id would cross-reference another card's differently-sized clip.
  const clipId = useId();

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${title} card`}
      style={[{ width: w, height: h }, style]}
      onLayout={onLayout}
      // display-only — the react-native-svg face must not claim touches from a wrapping Pressable
      // (owner gate-5 A.3/C.12; mirrors CardFace's composed branch)
      pointerEvents="none"
    >
      {/* F-02 silhouette (decision 0041): the face fill + a hairline stepped border, the plate strip
          (BR notch only), and an inset stepped bevel — all one shared steppedRectPath helper, drawn to
          the MEASURED box (bw×bh) so it fills the container at any size. */}
      <Svg width={bw} height={bh} style={StyleSheet.absoluteFill}>
        {/* border inset by half the stroke — an edge-centred stroke loses its outer half to the
            Svg clip, which read as "no bottom border" on resized faces (owner gate-5 A.2) */}
        <Path
          d={steppedRectPath(bw - 1, bh - 1, u)}
          transform="translate(0.5 0.5)"
          fill={faceFill}
          stroke={t.scr.hairline}
          strokeWidth={1}
        />
        <Path
          d={steppedRectPath(bw - 8, bh - 8, u)}
          transform="translate(4 4)"
          fill="none"
          stroke={bevelStroke}
          strokeWidth={1}
          opacity={0.6}
        />
        {showPlate ? (
          // A3b — the buildCard plate geometry: a full-width opaque band INSIDE the silhouette
          // (clipped to the stepped outline, so the BR notch cuts the band exactly like the designed
          // draw's Group clip), lifted `plateLift` off the bottom edge — never a strip pinned outside.
          <>
            <Defs>
              <ClipPath id={clipId}>
                <Path d={steppedRectPath(bw, bh, u)} />
              </ClipPath>
            </Defs>
            <Rect
              x={0}
              y={bh - plateH - plateLift}
              width={bw}
              height={plateH}
              fill={`hsl(${hue}, 45%, 15%)`}
              clipPath={`url(#${clipId})`}
            />
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
        // A3b — the label sits INSIDE the lifted band (bottom = plateLift, height = plateH), with the
        // buildCard slab text inset (8% of W) so default and designed titles align.
        <View style={[styles.plate, { height: plateH, bottom: plateLift, left: Math.round(bw * 0.08) }]}>
          <Text style={[styles.plateText, { fontSize: dims.plate ?? 9 }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  foil: {
    position: 'absolute',
    top: 4,
    right: 4,
    height: 3,
    backgroundColor: t.brand.gold,
    opacity: 0.85,
  },
  nowTag: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: t.scr.accent,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  nowText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.accentInk,
    letterSpacing: 0.5,
  },
  plate: {
    position: 'absolute',
    right: t.space.sm,
    justifyContent: 'center',
    // left/bottom/height are computed inline (A3b — the buildCard band geometry: inset text, lifted band)
  },
  plateText: {
    fontFamily: t.font.screenSemi,
    color: t.scr.ink,
    letterSpacing: 0.3,
  },
}));
