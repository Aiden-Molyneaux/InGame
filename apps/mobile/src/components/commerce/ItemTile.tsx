import type { ReactNode } from 'react';
import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { PriceChip } from './PriceChip';
import { OwnedTag, LockedTag } from './Tags';

// ItemTile (component-map §7 · board P1 grid) — a browse-grid cosmetic tile: a preview (reuse the M4
// editors' cosmetic rendering, never invented art) · name · type · and its state chip — a PriceChip, or
// OwnedTag (the price never returns), or a LockedTag (a drop date, never a price). At M5
// `/store.premiumCosmetics` is `[]`, so the grid this fills renders empty-graceful; the tile is built +
// tested for the P4 roster.
export function ItemTile({
  name,
  type,
  price,
  owned = false,
  lockedLabel,
  preview,
  onPress,
}: {
  name: string;
  type: string;
  price?: number;
  owned?: boolean;
  lockedLabel?: string;
  preview?: ReactNode;
  onPress?: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      style={styles.tile}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${type}`}
      onPress={onPress}
    >
      <View style={styles.previewSlot}>{preview}</View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.type} numberOfLines={1}>
        {type}
      </Text>
      {owned ? (
        <OwnedTag />
      ) : lockedLabel ? (
        <LockedTag label={lockedLabel} />
      ) : price != null ? (
        <PriceChip pixels={price} />
      ) : null}
    </Pressable>
  );
}

const useStyles = themedStyles((t) => ({
  tile: {
    width: '31.5%',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.md,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  previewSlot: { alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5, textAlign: 'center' },
  type: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1, textAlign: 'center' },
}));
