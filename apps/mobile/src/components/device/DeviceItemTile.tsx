import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { themedStyles, useTheme } from '../../theme';

// ItemTile (component-map §5.3) for the Device editor's SHELL + THEME trays. A swatch (a MiniDevice for
// shell · stacked colour bars for theme, passed as `children`) over an all-caps name. Selected = the
// accent ring (the board's `.tile.sel`). At M4 every item is FREE (decision 0068) — no price-chip, no
// EQUIPPED-vs-owned distinction beyond selection.
export function DeviceItemTile({
  name,
  selected,
  onPress,
  children,
}: {
  name: string;
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.tileSel, pressed && styles.pressed]}
    >
      <View style={styles.swatch}>{children}</View>
      <Text style={[styles.name, selected && { color: t.scr.accent }]}>{name}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((t) => ({
  tile: {
    alignItems: 'center',
    gap: t.space.sm,
    padding: t.space.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: t.corner.screen, // F-07 square
    backgroundColor: t.scr.panel,
  },
  tileSel: { borderColor: t.scr.accent, backgroundColor: t.scr.panelHi },
  pressed: { opacity: 0.82 },
  swatch: { alignItems: 'center', justifyContent: 'center' },
  name: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.dim,
    letterSpacing: 0.5,
  },
}));
