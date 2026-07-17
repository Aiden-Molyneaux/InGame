import Svg, { Path, Rect } from 'react-native-svg';
import { theme } from '../../theme';

// PixelsMark (component-map §7) — the PIXELS currency glyph: a stepped pixel-cut gem, gold with blue
// glint pixels (the mark v3 from store-states.html `#ic-pix`, transcribed to react-native-svg). F-02
// gold = value/economy. The mark is theme-INVARIANT (currency reads the same under every screen theme),
// so it uses the static brand tokens, not the live `scr.*` layer. Sized by `size` (px); default 14 (the
// header/inline size). The glint pixels are literal store-mark colours (not tokens) — they are part of
// the fixed pixel-art artwork, like the LED red.
export function PixelsMark({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* the four stepped-gem facets */}
      <Path d="M20 5 L18 5 L18 9 L14 9 L14 13 L10 13 L10 17 L6 17 L6 20 L20 20 Z" fill="#ffe9a3" />
      <Path d="M20 5 L22 5 L22 9 L26 9 L26 13 L30 13 L30 17 L34 17 L34 20 L20 20 Z" fill={theme.brand.gold} />
      <Path d="M6 20 L6 23 L10 23 L10 27 L14 27 L14 31 L18 31 L18 35 L20 35 L20 20 Z" fill="#f0bf32" />
      <Path d="M34 20 L34 23 L30 23 L30 27 L26 27 L26 31 L22 31 L22 35 L20 35 L20 20 Z" fill="#c8922a" />
      {/* the glint pixels (fixed pixel-art artwork colours) */}
      <Rect x="15" y="11" width="3.5" height="3.5" fill="#fff" />
      <Rect x="23" y="13" width="4" height="4" fill="#58e0ff" />
      <Rect x="27" y="17" width="4" height="4" fill="#4a90ff" />
      <Rect x="14" y="24" width="3.5" height="3.5" fill="#4a90ff" />
      {/* the opaque ink outline */}
      <Path
        d="M18 5 L22 5 L22 9 L26 9 L26 13 L30 13 L30 17 L34 17 L34 23 L30 23 L30 27 L26 27 L26 31 L22 31 L22 35 L18 35 L18 31 L14 31 L14 27 L10 27 L10 23 L6 23 L6 17 L10 17 L10 13 L14 13 L14 9 L18 9 Z"
        fill="none"
        stroke={theme.brand.goldInk}
        strokeWidth={2.2}
      />
    </Svg>
  );
}
