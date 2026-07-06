import type { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CardFace } from '../CardFace';
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

/** RN-registered families for the 0063 font ids (loaded app-wide in the root layout). */
const FONT_FAMILY: Record<string, string> = {
  'clean-sans': 'ChakraPetch_700Bold',
  'bold-display': 'PaytoneOne_400Regular',
};

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
              {previewKind === 'plate' ? (
                <PlatePreview comp={o.preview} />
              ) : previewKind === 'font' ? (
                <FontPreview comp={o.preview} />
              ) : (
                <CardFace title={o.name} composition={o.preview} width={64} height={89} />
              )}
              <Text style={[styles.name, sel && styles.nameSel]} numberOfLines={1}>
                {o.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {children}
    </View>
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
  } else {
    d = `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`;
  }
  return (
    <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={d} fill={np?.plate ?? '#141026'} stroke={theme.scr.hairline} strokeWidth={1} />
      </Svg>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: FONT_FAMILY[np?.fontId ?? 'clean-sans'] ?? FONT_FAMILY['clean-sans'],
          fontSize: theme.type.body,
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
          fontSize: theme.type.title,
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
});
