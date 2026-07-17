import { View, StyleSheet } from 'react-native';
import { SCREEN_THEMES, resolveScreenThemeId, type ScreenThemeId } from '../../theme/palettes';

// The THEME ItemTile swatch (D3) — a mini screen-field (scr.bg) carrying three stacked colour bars
// (panel · accent · panelHi) so a theme reads at a glance: the well, the StateMark accent, the tool tone.
// Resolves an unknown/absent id to the default (DEV-03).
export function ThemeSwatch({ themeId }: { themeId: ScreenThemeId | string }) {
  const scr = SCREEN_THEMES[resolveScreenThemeId(themeId)];
  return (
    <View style={[styles.field, { backgroundColor: scr.bg }]}>
      <View style={[styles.bar, { backgroundColor: scr.panel }]} />
      <View style={[styles.bar, { backgroundColor: scr.accent }]} />
      <View style={[styles.bar, { backgroundColor: scr.panelHi }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    width: 46,
    height: 58,
    borderRadius: 3,
    padding: 6,
    justifyContent: 'center',
    gap: 5,
  },
  bar: { height: 8, borderRadius: 1.5 },
});
