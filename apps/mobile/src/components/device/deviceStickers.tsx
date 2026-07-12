import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, G } from 'react-native-svg';
import { STICKER_BASE_HALF, type Sticker } from '@ingame/shared';
import { theme } from '../../theme';
import { ICON_PATHS, ICON_VIEWBOX } from '../../render/icons';

// The device-sticker glyph registry (device-manifest D4 · ARCH 2 · decision 0063 §5 / 0068). The 8
// board decals as react-native-svg — the plastic is RN Views, not skia. Three (STAR · BOLT · HEART)
// reuse the Essentials `icons.ts` path data where the glyph overlaps; the other five (ROCKET ·
// CASSETTE · SATURN · NEON CAT · RAINBOW) are drawn here — simple, bold, SINGLE-TONE with the board's
// colour hints. Everything ships `tier:'basic'` (0068 all-basic posture) — no price chips anywhere.

export type StickerTone = 'cream' | 'gold' | 'accent';

export interface StickerAsset {
  id: string;
  name: string; // all-caps display copy (F-06 sized by the tile)
  tier: 'basic';
  tone: StickerTone; // the board's per-decal colour hint (cream/gold/pink)
}

// Board order (device-states.html :507–514).
export const STICKER_ASSETS: StickerAsset[] = [
  { id: 'rocket', name: 'ROCKET', tier: 'basic', tone: 'cream' },
  { id: 'star', name: 'STAR', tier: 'basic', tone: 'gold' },
  { id: 'heart', name: 'HEART', tier: 'basic', tone: 'accent' },
  { id: 'bolt', name: 'BOLT', tier: 'basic', tone: 'gold' },
  { id: 'cassette', name: 'CASSETTE', tier: 'basic', tone: 'cream' },
  { id: 'saturn', name: 'SATURN', tier: 'basic', tone: 'cream' },
  { id: 'cat', name: 'NEON CAT', tier: 'basic', tone: 'accent' },
  { id: 'rainbow', name: 'RAINBOW', tier: 'basic', tone: 'gold' },
];

export const STICKER_ASSET_BY_ID: Record<string, StickerAsset> = Object.fromEntries(
  STICKER_ASSETS.map((a) => [a.id, a]),
);

const TONE_HEX: Record<StickerTone, string> = {
  cream: theme.brand.cream,
  gold: theme.brand.gold,
  accent: theme.brand.accent,
};

/** Resolve a placed sticker's single-tone colour from its asset hint (unknown asset → cream). */
export function stickerColor(assetId: string): string {
  return TONE_HEX[STICKER_ASSET_BY_ID[assetId]?.tone ?? 'cream'];
}

// ── the five drawn glyphs (24×24) — bold single-tone outlines/fills ──────────────────────────────────
function drawn(id: string, color: string): ReactNode | null {
  switch (id) {
    case 'rocket':
      return (
        <G>
          <Path
            d="M12 2C15.5 5 16.5 9.5 16.5 13.5V16.5H7.5V13.5C7.5 9.5 8.5 5 12 2Z"
            fill="none"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Path d="M7.5 13.5L4.5 18.5L7.5 16.8" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M16.5 13.5L19.5 18.5L16.5 16.8" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
          <Circle cx={12} cy={9} r={2} fill="none" stroke={color} strokeWidth={1.8} />
          <Path d="M10 17.5L12 21.5L14 17.5" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        </G>
      );
    case 'cassette':
      return (
        <G>
          <Rect x={2.5} y={6} width={19} height={12} rx={2.5} fill="none" stroke={color} strokeWidth={1.8} />
          <Circle cx={8.5} cy={12} r={2.2} fill="none" stroke={color} strokeWidth={1.8} />
          <Circle cx={15.5} cy={12} r={2.2} fill="none" stroke={color} strokeWidth={1.8} />
          <Path d="M7 15.5H17" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </G>
      );
    case 'saturn':
      return (
        <G>
          <Circle cx={12} cy={12} r={5} fill="none" stroke={color} strokeWidth={1.8} />
          <G rotation={-22} origin="12, 12">
            <Ellipse cx={12} cy={12} rx={9.5} ry={3.2} fill="none" stroke={color} strokeWidth={1.8} />
          </G>
        </G>
      );
    case 'cat':
      return (
        <G>
          <Path
            d="M6 6L6 10.5C6 14.5 8.7 17 12 17C15.3 17 18 14.5 18 10.5L18 6L14.5 9H9.5L6 6Z"
            fill="none"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Circle cx={9.6} cy={11.5} r={1} fill={color} />
          <Circle cx={14.4} cy={11.5} r={1} fill={color} />
          <Path d="M4 12H8M16 12H20" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        </G>
      );
    case 'rainbow':
      return (
        <G>
          <Path d="M4 18A8 8 0 0 1 20 18" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M7 18A5 5 0 0 1 17 18" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M10 18A2 2 0 0 1 14 18" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </G>
      );
    default:
      return null;
  }
}

/** One sticker glyph rendered in a `size`×`size` box, single-tone (`color`). STAR/BOLT/HEART reuse the
 *  Essentials path data (20-viewBox filled); the other five are drawn (24-viewBox). Unknown → nothing. */
export function StickerGlyph({ assetId, size, color }: { assetId: string; size: number; color: string }) {
  const iconPath = ICON_PATHS[assetId];
  if (assetId === 'star' || assetId === 'bolt' || assetId === 'heart') {
    if (!iconPath) return null;
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}>
        <Path d={iconPath} fill={color} />
      </Svg>
    );
  }
  const body = drawn(assetId, color);
  if (!body) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}

/**
 * A placed sticker rendered on a zone band (device-manifest ARCH 2). Positioned by its normalized
 * (x,y) within the measured zone rect, sized from `scale` (a square whose half-side is
 * `STICKER_BASE_HALF` of the zone HEIGHT), rotated by `rotation`. Non-interactive by default — the
 * app-wide passive layer and the editor's live layer both render THIS; the editor overlays the
 * TransformBox separately.
 */
export function PlacedSticker({
  sticker,
  rectW,
  rectH,
  ghost = false,
}: {
  sticker: Sticker;
  rectW: number;
  rectH: number;
  /** the DEV-03 refusal state — the decal dims while a drag hovers a no-go area. */
  ghost?: boolean;
}) {
  const side = 2 * sticker.scale * STICKER_BASE_HALF * rectH;
  const left = sticker.x * rectW - side / 2;
  const top = sticker.y * rectH - side / 2;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.placed,
        {
          left,
          top,
          width: side,
          height: side,
          transform: [{ rotate: `${sticker.rotation}deg` }],
          opacity: ghost ? 0.4 : 1,
        },
      ]}
    >
      <StickerGlyph assetId={sticker.assetId} size={side} color={stickerColor(sticker.assetId)} />
    </View>
  );
}

const styles = StyleSheet.create({
  placed: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
