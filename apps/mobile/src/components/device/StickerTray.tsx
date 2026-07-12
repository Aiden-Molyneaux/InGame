import { Pressable, Text, View } from 'react-native';
import { themedStyles, useTheme } from '../../theme';
import { STICKER_ASSETS, StickerGlyph, stickerColor } from './deviceStickers';

// StickerTray (device-manifest D4) — the 8 glyph tiles (ROCKET · STAR · HEART · BOLT · CASSETTE ·
// SATURN · NEON CAT · RAINBOW). Tap → place in the forehead zone (device.tsx). All FREE at M4 (0068) —
// no price chips. When the zone is at its cap the tiles dim + go inert and a quiet cap note shows.
export function StickerTray({
  onPick,
  atCap,
}: {
  onPick: (assetId: string) => void;
  atCap: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View>
      <View style={styles.tray}>
        {STICKER_ASSETS.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            accessibilityLabel={a.name}
            accessibilityState={{ disabled: atCap }}
            disabled={atCap}
            onPress={() => onPick(a.id)}
            style={({ pressed }) => [styles.tile, atCap && styles.dim, pressed && !atCap && styles.pressed]}
          >
            <View style={styles.swatch}>
              <StickerGlyph assetId={a.id} size={28} color={stickerColor(a.id)} />
            </View>
            <Text style={styles.name}>{a.name}</Text>
          </Pressable>
        ))}
      </View>
      {atCap ? (
        <Text style={[styles.capNote, { color: t.scr.faint }]}>THIS BAND IS FULL — REMOVE A DECAL TO ADD ANOTHER</Text>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingTop: t.space.sm },
  tile: {
    width: 62,
    alignItems: 'center',
    gap: t.space.xs,
    paddingVertical: t.space.sm,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    borderRadius: t.corner.screen, // F-07 square
    backgroundColor: t.scr.panel,
  },
  dim: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
  swatch: { height: 30, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  capNote: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, letterSpacing: 0.5, paddingTop: t.space.sm },
}));
