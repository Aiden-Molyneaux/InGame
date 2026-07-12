import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Sticker } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { STICKER_ASSET_BY_ID, StickerGlyph, stickerColor } from './deviceStickers';

// StickerRail (device-manifest D4 · owner gate-5 2026-07-12) — the placed-decal manager: the "slips"
// equivalent of the Canvas LayerRack, one tile per sticker ON the shell. TAP a tile to select that
// decal (its TransformBox + the steppers then act on it) — this is the visible, screen-reader-reachable
// selection path (it replaced the transparent per-decal a11y select-targets). Selected = accent ring.
// Sighted users can still tap the decal on the band directly; this rail is the always-legible route.
export function StickerRail({
  stickers,
  selectedId,
  onSelect,
}: {
  stickers: Sticker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const styles = useStyles();
  if (stickers.length === 0) {
    return <Text style={styles.empty}>NO DECALS YET — TAP ONE ABOVE TO PLACE IT</Text>;
  }
  return (
    <View>
      <Text style={styles.head}>ON THE SHELL — {stickers.length}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {stickers.map((s) => {
          const name = STICKER_ASSET_BY_ID[s.assetId]?.name ?? 'DECAL';
          const active = s.id === selectedId;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`${name} decal${active ? ', selected' : ''}`}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(s.id)}
              style={[styles.tile, active && styles.tileActive]}
            >
              <StickerGlyph assetId={s.assetId} size={26} color={stickerColor(s.assetId)} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  head: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.dim,
    letterSpacing: 1.5,
    marginBottom: t.space.sm,
  },
  rail: { flexDirection: 'row', gap: t.space.sm, paddingBottom: t.space.xs },
  tile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.scr.hairline,
    borderRadius: t.corner.screen, // F-07 square
    backgroundColor: t.scr.panel,
  },
  tileActive: { borderColor: t.scr.accent, backgroundColor: 'rgba(255,159,67,0.10)' },
  empty: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.faint,
    letterSpacing: 0.5,
    paddingVertical: t.space.sm,
  },
}));
