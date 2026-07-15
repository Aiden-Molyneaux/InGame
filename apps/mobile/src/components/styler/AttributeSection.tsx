import { Suspense, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LazyCompositionStrip } from '../canvas/lazySkia';
import { SkiaErrorBoundary } from '../SkiaErrorBoundary';
import { StateMark } from '../StateMark';
import { PriceChip } from '../commerce/PriceChip';
import { theme, themedStyles, useTheme } from '../../theme';
import type { CardComposition } from '../../render/composition';
import { FONT_FAMILY, previewFontSize, platePath } from '../../render/previewPrimitives';

// CARD-13 (M5 P7) — per-tile premium badging. A key present in `badges` marks that roster id premium:
//   • owned      → a compact ✓ (the price is gone — COSM-03)
//   • selected + unowned → a PREVIEW flag (applied-but-unowned; the card wears it as a preview)
//   • unowned    → a PriceChip (the PX to make it yours)
export interface TileBadge {
  owned: boolean;
  price: number;
}

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

// FONT_FAMILY · previewFontSize · platePath are shared with the Store's CosmeticSwatch — see
// render/previewPrimitives.ts (M5 F-6: one source of truth for the non-Skia cosmetic previews).

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
  badges,
  children,
}: {
  heading: string;
  options: AttributeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  previewKind?: PreviewKind;
  /** CARD-13 premium badging by roster id (present = premium; see TileBadge). */
  badges?: Record<string, TileBadge>;
  /** Section extras under the rail (the EFFECT IntensitySlider, the TITLE ink row). */
  children?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.page}>
      <Text style={styles.heading}>{heading}</Text>
      {previewKind === 'card' ? (
        <CardRail options={options} selectedId={selectedId} onSelect={onSelect} badges={badges} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {options.map((o) => {
            const sel = o.id === selectedId;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityLabel={badgeLabel(o.name, badges?.[o.id], sel)}
                accessibilityState={{ selected: sel }}
                onPress={() => onSelect(o.id)}
                style={[styles.tile, sel && styles.tileSel]}
              >
                {sel ? <StateMark size={8} style={styles.pip} /> : null}
                <Badge badge={badges?.[o.id]} selected={sel} />
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

/** The premium tile badge (CARD-13) — placed top-left so it never collides with the selection pip. */
function Badge({ badge, selected }: { badge?: TileBadge; selected: boolean }) {
  const styles = useStyles();
  if (!badge) return null;
  return (
    <View style={styles.badge} pointerEvents="none">
      {badge.owned ? (
        <View style={styles.ownedMini}>
          <Text style={styles.ownedMiniText}>✓</Text>
        </View>
      ) : selected ? (
        <View style={styles.previewTag}>
          <Text style={styles.previewText}>PREVIEW</Text>
        </View>
      ) : (
        <PriceChip pixels={badge.price} />
      )}
    </View>
  );
}

function badgeLabel(name: string, badge: TileBadge | undefined, selected: boolean): string {
  if (!badge) return name;
  if (badge.owned) return `${name}, owned`;
  if (selected) return `${name}, premium preview — ${badge.price} pixels`;
  return `${name}, premium — ${badge.price} pixels`;
}

// The FRAME/EFFECT/FINISH rail — one strip canvas (display-only) behind transparent Pressable tiles.
// The card renders into each tile's card zone; the Pressable carries the panel/border/name/tap; the
// selection pip rides over the strip so a card never occludes it (decision 0068 — the WebGL-ceiling fix).
function CardRail({
  options,
  selectedId,
  onSelect,
  badges,
}: {
  options: AttributeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  badges?: Record<string, TileBadge>;
}) {
  const styles = useStyles();
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
              accessibilityLabel={badgeLabel(o.name, badges?.[o.id], sel)}
              accessibilityState={{ selected: sel }}
              onPress={() => onSelect(o.id)}
              style={[styles.cardTile, { left: i * TILE_STRIDE, width: TILE_W, height: TILE_H }, sel && styles.tileSel]}
            >
              <Badge badge={badges?.[o.id]} selected={sel} />
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
  const t = useTheme();
  const np = comp.nameplate;
  const shape = (np?.shape ?? 'slab') === 'none' ? 'slab' : (np?.shape ?? 'slab');
  const W = 96;
  const H = 30;
  const d = platePath(shape, W, H);
  const plateFill = shape === 'brass' ? '#e8c14a' : (np?.plate ?? '#141026');
  return (
    <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={d} fill={plateFill} stroke={t.scr.hairline} strokeWidth={1} />
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

const useStyles = themedStyles((t) => ({
  page: { gap: t.space.md },
  heading: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  rail: { gap: t.space.md, paddingVertical: t.space.sm, paddingHorizontal: 2 },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space.sm,
    padding: t.space.md,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panel,
    borderRadius: t.corner.screen, // F-07 square, flat tile (F-09)
  },
  tileSel: { borderColor: t.scr.accent, backgroundColor: 'rgba(255,159,67,0.08)' },
  pip: { position: 'absolute', top: 4, right: 4, zIndex: 2 },
  badge: { position: 'absolute', top: 3, left: 3, zIndex: 3 },
  ownedMini: {
    backgroundColor: t.brand.cream,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedMiniText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.navy },
  previewTag: {
    borderWidth: 1,
    borderColor: t.scr.accent,
    backgroundColor: t.scr.bg,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  previewText: { fontFamily: t.font.screenBold, fontSize: 8, color: t.scr.accent, letterSpacing: 0.5 },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, maxWidth: 110 },
  nameSel: { color: t.scr.ink },
  cardRail: { paddingVertical: t.space.sm, paddingHorizontal: 2 },
  cardTile: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    paddingTop: TILE_PAD,
    paddingHorizontal: TILE_PAD,
    gap: t.space.sm,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panel,
    borderRadius: t.corner.screen, // F-07 square, flat tile (F-09)
  },
  stripLayer: { position: 'absolute' },
}));
