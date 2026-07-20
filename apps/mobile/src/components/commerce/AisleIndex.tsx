import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';

// AisleIndex (component-map §7) — THE INDEX: the COSM-01 aisle taxonomy that closes the browse page.
// Each row taps into its category page. Per-aisle COUNTS render when the caller supplies them from
// `GET /cosmetics` (P10 store-front listing; owner-walk polish 2026-07-13) — absent counts fall back to
// the plain chevron, so the row never blocks on the library query. The free baseline is not stocked here
// (COSM-02). The PIXELS → TOP UP door moved OUT of The Index to the store-bottom entry points (M6
// owner-walk — see StoreEntries) so the Index is now aisles-only.

// The COSM-01 taxonomy (product-spec) — key = the cosmetic `type`, label = the aisle name.
export const AISLES: { key: string; label: string; glyph: string }[] = [
  { key: 'shell_sticker_pack', label: 'STICKER PACKS', glyph: '◆' },
  { key: 'effect', label: 'EFFECTS', glyph: '✦' },
  { key: 'finish', label: 'FINISHES', glyph: '◖' },
  { key: 'frame', label: 'FRAMES', glyph: '▢' },
  { key: 'nameplate', label: 'NAMEPLATES', glyph: '▬' },
  { key: 'font', label: 'FONTS', glyph: 'A' },
  { key: 'device_shell', label: 'DEVICE SHELLS', glyph: '▮' },
  { key: 'screen_theme', label: 'SCREEN THEMES', glyph: '◨' },
];

export function AisleIndex({
  onAisle,
  counts,
}: {
  onAisle: (aisle: { key: string; label: string }) => void;
  /** Per-aisle item counts keyed by cosmetic `type` (from GET /cosmetics). Absent → plain chevron. */
  counts?: Record<string, number>;
}) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {AISLES.map((a) => {
        const n = counts?.[a.key];
        return (
          <Pressable
            key={a.key}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={n != null ? `${a.label}, ${n} items` : a.label}
            onPress={() => onAisle({ key: a.key, label: a.label })}
          >
            <Text style={styles.glyph}>{a.glyph}</Text>
            <Text style={styles.label} numberOfLines={1}>
              {a.label}
            </Text>
            <Text style={styles.chev}>{n != null ? `${n} ›` : '›'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48.5%',
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.md, // F-1 fix 2 — modest lift for touch comfort (was 5), F-06 type unchanged
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  glyph: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.accent, width: 14, textAlign: 'center' },
  label: {
    flex: 1,
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 1,
  },
  chev: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint },
}));
