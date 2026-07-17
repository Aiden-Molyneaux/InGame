import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { themedStyles, useTheme } from '../../theme';

// ItemTile (component-map §5.3) for the Device editor's SHELL + THEME trays. A swatch (a MiniDevice for
// shell · stacked colour bars for theme, passed as `children`) over an all-caps name. Selected = the
// accent ring (the board's `.tile.sel`). M5 P7 (D7/D9): a premium item carries a `badge` (PriceChip /
// ✓ owned / 🔒 offline-locked) top-left; `dimmed` softens a locked tile.
export function DeviceItemTile({
  name,
  selected,
  onPress,
  children,
  badge,
  dimmed = false,
}: {
  name: string;
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
  /** the premium badge (PriceChip / owned / locked) — top-left, M5 P7. */
  badge?: ReactNode;
  /** a locked-offline tile softens (D9 — writes gated). */
  dimmed?: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.tileSel, dimmed && styles.dimmed, pressed && styles.pressed]}
    >
      {badge ? (
        <View style={styles.badge} pointerEvents="none">
          {badge}
        </View>
      ) : null}
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
  dimmed: { opacity: 0.5 },
  badge: { position: 'absolute', top: 4, left: 4, zIndex: 3 },
  swatch: { alignItems: 'center', justifyContent: 'center' },
  name: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.dim,
    letterSpacing: 0.5,
  },
}));
