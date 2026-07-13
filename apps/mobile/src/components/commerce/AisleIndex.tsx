import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { PixelsMark } from './PixelsMark';

// AisleIndex (component-map §7) — THE INDEX: the COSM-01 aisle taxonomy that closes the browse page.
// Each row taps into its category page; the final PIXELS row is the TOP-UP door. Per the manifest, the
// per-aisle COUNTS have no source at M5 (no `GET /cosmetics`), so rows show a plain chevron — the count
// slot is EXPECTED(P10 store-front listing). The free baseline is not stocked here (COSM-02).

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
  onTopUp,
}: {
  onAisle: (aisle: { key: string; label: string }) => void;
  onTopUp: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {AISLES.map((a) => (
        <Pressable
          key={a.key}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={() => onAisle({ key: a.key, label: a.label })}
        >
          <Text style={styles.glyph}>{a.glyph}</Text>
          <Text style={styles.label} numberOfLines={1}>
            {a.label}
          </Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}
      <Pressable
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel="Pixels — top up"
        onPress={onTopUp}
      >
        <PixelsMark size={12} />
        <Text style={styles.label} numberOfLines={1}>
          PIXELS
        </Text>
        <Text style={styles.topup}>TOP UP ›</Text>
      </Pressable>
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
    paddingVertical: 5,
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
  topup: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },
}));
