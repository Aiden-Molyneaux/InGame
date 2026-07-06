import type { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CardFace } from '../CardFace';
import { StateMark } from '../StateMark';
import { theme } from '../../theme';
import type { CardComposition } from '../../render/composition';

// AttributeSection (component-map §8a / the board attr-rail) — one closed-attribute page: a
// horizontal rail of tiles, each a SMALL LIVE PREVIEW of the current draft wearing JUST that option
// (browsing IS editing — the pick redraws the hero; no apply step). Selected = accent border +
// StateMark pip on a flat tile (F-09). M4 = the 0063 FREE roster only; price-chips/PREVIEW ride M5.

export interface AttributeOption {
  id: string;
  name: string;
  /** The draft with this option applied — the tile preview (only the active page mounts). */
  preview: CardComposition;
}

export function AttributeSection({
  heading,
  options,
  selectedId,
  onSelect,
  previewW = 64,
  previewH = 89,
  children,
}: {
  heading: string;
  options: AttributeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Tile preview dims — PLATE/TITLE pass cell size (96×134) so the renderer draws the plate. */
  previewW?: number;
  previewH?: number;
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
              <CardFace title={o.name} composition={o.preview} width={previewW} height={previewH} />
              <Text style={[styles.name, sel && styles.nameSel]} numberOfLines={1}>
                {o.name}
              </Text>
              <Text style={styles.free}>FREE</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: theme.space.md },
  heading: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 2 },
  rail: { gap: theme.space.md, paddingVertical: theme.space.sm, paddingHorizontal: 2 },
  tile: {
    alignItems: 'center',
    gap: theme.space.sm,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panel,
    borderRadius: theme.corner.screen, // F-07 square, flat tile (F-09)
  },
  tileSel: { borderColor: theme.scr.accent, backgroundColor: 'rgba(255,159,67,0.08)' },
  pip: { position: 'absolute', top: 4, right: 4, zIndex: 2 },
  name: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5, maxWidth: 76 },
  nameSel: { color: theme.scr.ink },
  free: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 1 },
});
