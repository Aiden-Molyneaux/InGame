import { Suspense, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LazyCompositionStrip } from '../canvas/lazySkia';
import { SkiaErrorBoundary } from '../SkiaErrorBoundary';
import { StateMark } from '../StateMark';
import { theme } from '../../theme';
import type { CardComposition } from '../../render/composition';

// AttributeSection (component-map §8a / the board attr-rail) — one closed-attribute page: a
// horizontal rail of tiles. FRAME/EFFECT/FINISH preview as SMALL LIVE CARDS (browsing IS editing);
// PLATE previews the PLATE ITSELF (the bottom-of-card polygon, title centred — legible at tile
// size) and TITLE previews the game title RENDERED IN THE FONT (owner gate-5 D.21). No FREE tags —
// free is the default; a PRICE overlays a tile's top-left when priced cosmetics arrive (M5, 0062).
// Selected = accent border + StateMark pip on a flat tile (F-09).

export interface AttributeOption {
  id: string;
  name: string;
  /** The draft with this option applied — every preview kind derives from it. */
  preview: CardComposition;
}

export type PreviewKind = 'card' | 'plate' | 'font';

/** RN-registered families for the roster font ids (loaded app-wide in the root layout, _layout.tsx). */
const FONT_FAMILY: Record<string, string> = {
  'clean-sans': 'ChakraPetch_700Bold',
  'bold-display': 'PaytoneOne_400Regular',
  // decision 0068 — the FontPreview <Text> needs the RN family; the skia hero uses the typeface map.
  'press-start': 'PressStart2P_400Regular',
  bitter: 'Bitter_700Bold',
  'space-mono': 'SpaceMono_700Bold',
  pacifico: 'Pacifico_400Regular',
  stencil: 'AllertaStencil_400Regular',
};

/** Optical size correction, mirroring the renderer's FONT_SCALE (PIXEL draws huge at a given em). */
const FONT_SIZE_SCALE: Record<string, number> = { 'press-start': 0.6 };
const previewFontSize = (base: number, fontId?: string) => base * (FONT_SIZE_SCALE[fontId ?? ''] ?? 1);

// The card-preview rail geometry (decision 0068 — ONE strip canvas + transparent Pressable overlays,
// so a 16-tile FRAME rail is 1 WebGL context, not 16). The strip draws each card into its tile's card
// zone; the Pressables carry the bg/border/name/tap; a single pip rides over the selected tile.
const CARD_W = 64;
const CARD_H = 89;
const TILE_PAD = theme.space.md; // 8 — card inset inside its tile
const RAIL_GAP = theme.space.md; // 8 — between tiles
const TILE_W = CARD_W + TILE_PAD * 2; // 80
const TILE_STRIDE = TILE_W + RAIL_GAP; // 88
const NAME_H = 20;
const TILE_H = TILE_PAD + CARD_H + theme.space.sm + NAME_H;

export function AttributeSection({
  heading,
  options,
  selectedId,
  onSelect,
  previewKind = 'card',
  children,
}: {
  heading: string;
  options: AttributeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  previewKind?: PreviewKind;
  /** Section extras under the rail (the EFFECT IntensitySlider, the TITLE ink row). */
  children?: ReactNode;
}) {
  return (
    <View style={styles.page}>
      <Text style={styles.heading}>{heading}</Text>
      {previewKind === 'card' ? (
        <CardRail options={options} selectedId={selectedId} onSelect={onSelect} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {options.map((o) => {
            const sel = o.id === selectedId;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityLabel={o.name}
                accessibilityState={{ selected: sel }}
                onPress={() => onSelect(o.id)}
                style={[styles.tile, sel && styles.tileSel]}
              >
                {sel ? <StateMark size={8} style={styles.pip} /> : null}
                {previewKind === 'plate' ? <PlatePreview comp={o.preview} /> : <FontPreview comp={o.preview} />}
                <Text style={[styles.name, sel && styles.nameSel]} numberOfLines={1}>
                  {o.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {children}
    </View>
  );
}

// The FRAME/EFFECT/FINISH rail — one strip canvas (display-only) behind transparent Pressable tiles.
// The card renders into each tile's card zone; the Pressable carries the panel/border/name/tap; the
// selection pip rides over the strip so a card never occludes it (decision 0068 — the WebGL-ceiling fix).
function CardRail({
  options,
  selectedId,
  onSelect,
}: {
  options: AttributeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const comps = options.map((o) => o.preview);
  const stripW = options.length * TILE_STRIDE;
  const selIdx = options.findIndex((o) => o.id === selectedId);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRail}>
      <View style={{ width: stripW, height: TILE_H }}>
        {options.map((o, i) => {
          const sel = o.id === selectedId;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityLabel={o.name}
              accessibilityState={{ selected: sel }}
              onPress={() => onSelect(o.id)}
              style={[styles.cardTile, { left: i * TILE_STRIDE, width: TILE_W, height: TILE_H }, sel && styles.tileSel]}
            >
              <View style={{ height: CARD_H, width: CARD_W }} />
              <Text style={[styles.name, sel && styles.nameSel]} numberOfLines={1}>
                {o.name}
              </Text>
            </Pressable>
          );
        })}
        <View pointerEvents="none" style={[styles.stripLayer, { left: TILE_PAD, top: TILE_PAD }]}>
          <SkiaErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <LazyCompositionStrip comps={comps} cellW={CARD_W} cellH={CARD_H} strideX={TILE_STRIDE} width={stripW} height={CARD_H} />
            </Suspense>
          </SkiaErrorBoundary>
        </View>
        {selIdx >= 0 ? <StateMark size={8} style={{ position: 'absolute', top: 3, left: selIdx * TILE_STRIDE + TILE_W - 12, zIndex: 2 }} /> : null}
      </View>
    </ScrollView>
  );
}

// The plate as it draws on the card foot (buildCard's slab/ribbon/bevel geometry), title centred —
// what a plate pick actually changes, shown legibly instead of a whole 64px card (gate-5 D.21).
function PlatePreview({ comp }: { comp: CardComposition }) {
  const np = comp.nameplate;
  const raw = np?.shape ?? 'slab';
  const shape = raw === 'none' ? 'slab' : raw;
  const W = 96;
  const H = 30;
  let d: string;
  if (shape === 'ribbon') {
    const nx = W * 0.06;
    d = `M ${nx} 0 L ${W - nx} 0 L ${W} ${H / 2} L ${W - nx} ${H} L ${nx} ${H} L 0 ${H / 2} Z`;
  } else if (shape === 'bevel') {
    const ch = H * 0.35;
    d = `M ${ch} 0 L ${W - ch} 0 L ${W} ${ch} L ${W} ${H} L 0 ${H} L 0 ${ch} Z`;
  } else if (shape === 'dogtag') {
    const ch = H * 0.5;
    d = `M ${ch} 0 L ${W - ch} 0 L ${W} ${H / 2} L ${W - ch} ${H} L ${ch} ${H} L 0 ${H / 2} Z`;
  } else if (shape === 'arch') {
    const r = Math.min(H * 0.7, W / 2);
    d = `M 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 L ${W - r} 0 A ${r} ${r} 0 0 1 ${W} ${r} L ${W} ${H} L 0 ${H} Z`;
  } else if (shape === 'capsule') {
    const r = H / 2;
    d = `M ${r} 0 L ${W - r} 0 A ${r} ${r} 0 0 1 ${W - r} ${H} L ${r} ${H} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  } else if (shape === 'tab') {
    const th = H * 0.28;
    const t0 = W * 0.06;
    const t1 = W * 0.42;
    d = `M 0 ${th} L ${t0} ${th} L ${t0} 0 L ${t1} 0 L ${t1} ${th} L ${W} ${th} L ${W} ${H} L 0 ${H} Z`;
  } else {
    d = `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`; // slab · brass (brass tints gold)
  }
  const plateFill = shape === 'brass' ? '#e8c14a' : (np?.plate ?? '#141026');
  return (
    <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={d} fill={plateFill} stroke={theme.scr.hairline} strokeWidth={1} />
      </Svg>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: FONT_FAMILY[np?.fontId ?? 'clean-sans'] ?? FONT_FAMILY['clean-sans'],
          fontSize: previewFontSize(theme.type.body, np?.fontId),
          color: np?.ink ?? theme.brand.cream,
          maxWidth: W - 14,
        }}
      >
        {np?.title ?? ''}
      </Text>
    </View>
  );
}

// The game title rendered IN the font (+ the current ink) — what a font pick actually changes.
function FontPreview({ comp }: { comp: CardComposition }) {
  const np = comp.nameplate;
  return (
    <View style={{ height: 30, justifyContent: 'center', maxWidth: 120 }}>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: FONT_FAMILY[np?.fontId ?? 'clean-sans'] ?? FONT_FAMILY['clean-sans'],
          fontSize: previewFontSize(theme.type.title, np?.fontId),
          color: np?.ink ?? theme.brand.cream,
        }}
      >
        {np?.title ?? ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: theme.space.md },
  heading: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 2 },
  rail: { gap: theme.space.md, paddingVertical: theme.space.sm, paddingHorizontal: 2 },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panel,
    borderRadius: theme.corner.screen, // F-07 square, flat tile (F-09)
  },
  tileSel: { borderColor: theme.scr.accent, backgroundColor: 'rgba(255,159,67,0.08)' },
  pip: { position: 'absolute', top: 4, right: 4, zIndex: 2 },
  name: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5, maxWidth: 110 },
  nameSel: { color: theme.scr.ink },
  cardRail: { paddingVertical: theme.space.sm, paddingHorizontal: 2 },
  cardTile: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    paddingTop: TILE_PAD,
    paddingHorizontal: TILE_PAD,
    gap: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panel,
    borderRadius: theme.corner.screen, // F-07 square, flat tile (F-09)
  },
  stripLayer: { position: 'absolute' },
});
