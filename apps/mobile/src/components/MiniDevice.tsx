import { View, StyleSheet } from 'react-native';
import { theme, useTheme } from '../theme';
import {
  SHELL_PALETTES,
  SCREEN_THEMES,
  resolveShellId,
  resolveScreenThemeId,
  type ShellId,
  type ScreenThemeId,
} from '../theme/palettes';

// MiniDevice (component-map §5.1) — a small device THUMBNAIL (~42×92), the mockup `.mini-dev`: the
// plastic body, the inset screen, and a mini nav row (one gold key). The Profile's "MY DEVICE" preview
// cell + the Device editor's before→after shell-switch pair (D2). By default it wears the LIVE shell +
// screen theme (the current device); pass `shellId`/`themeId` to render a SPECIFIC colourway/theme (the
// WAS/NOW minis · the shell ItemTile swatches) — an unknown/absent id resolves to the default (DEV-03).
export function MiniDevice({
  shellId,
  themeId,
}: {
  shellId?: ShellId | string;
  themeId?: ScreenThemeId | string;
}) {
  const live = useTheme();
  // Overrides read the palette tables directly; no override → the live layers (current device).
  const shell = shellId !== undefined ? SHELL_PALETTES[resolveShellId(shellId)] : live.shell;
  const scr = themeId !== undefined ? SCREEN_THEMES[resolveScreenThemeId(themeId)] : live.scr;
  return (
    <View style={[styles.body, { backgroundColor: shell.plastic }]} accessibilityLabel="device preview">
      <View
        style={[styles.screen, { backgroundColor: scr.bg, borderColor: shell.bezel }]}
      />
      <View style={styles.nav}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === 0 ? theme.brand.gold : shell.silk }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    width: 42,
    height: 92,
    borderRadius: 7,
    padding: 3,
  },
  screen: {
    flex: 1,
    marginHorizontal: 2,
    marginTop: 5,
    marginBottom: 3,
    borderRadius: 3,
    borderWidth: 2,
  },
  nav: {
    height: 9,
    flexDirection: 'row',
    gap: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 4, height: 4, borderRadius: 1.5 },
});
