import { View, Text } from 'react-native';
import { themedStyles, useTheme } from '../../theme';

// ThemePreviewScreen (M5 F-10 live inspect, decision 0076) — a compact mock of "your screen in this
// theme," rendered entirely from the LIVE `scr.*` tokens. The store's screen-theme item-sheet wraps this
// in <ThemePreview themeId={id}> so every token below resolves to the PREVIEWED palette — the field
// (bg), a raised card (panel), a tool tile (panelHi), the heading (ink), secondary copy (dim), the
// selection chip (accent/accentInk) and the gold value (value) all repaint to e.g. BERRY. That is the
// "not previewing live" gap the owner flagged: the swatch showed the theme in a thumbnail, but the
// stage stayed in the current theme; now the stage itself adopts it. Legibility floor held (F3): the
// deepened light-theme inks make this readable on the paper/mint/lilac fields too.
export function ThemePreviewScreen() {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.screen} accessibilityLabel="Theme preview">
      <View style={styles.headRow}>
        <Text style={styles.heading}>YOUR SCREEN</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.ink}>Hollow Knight</Text>
        <Text style={styles.dim}>142 hrs · Playing</Text>
      </View>

      <View style={styles.toolRow}>
        <View style={styles.chip}>
          <Text style={styles.chipTxt}>SELECTED</Text>
        </View>
        <View style={styles.tile} />
        <View style={styles.tile} />
        {t.scr.isLight ? <View style={[styles.key, styles.keyBorder]} /> : <View style={styles.key} />}
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  screen: {
    alignSelf: 'stretch',
    backgroundColor: t.scr.bg,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    padding: t.space.lg,
    gap: t.space.md,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  panel: {
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    padding: t.space.md,
    gap: t.space.xs,
  },
  ink: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.ink },
  dim: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  chip: { backgroundColor: t.scr.accent, paddingHorizontal: t.space.md, paddingVertical: t.space.xs },
  chipTxt: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk, letterSpacing: 1 },
  tile: { width: 24, height: 16, backgroundColor: t.scr.panelHi, borderWidth: 1, borderColor: t.scr.hairline },
  key: { width: 24, height: 16, backgroundColor: t.scr.key },
  keyBorder: { borderWidth: 1, borderColor: t.scr.dim },
}));
