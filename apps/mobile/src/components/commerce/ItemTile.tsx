import type { ReactNode } from 'react';
import type { CosmeticTier } from '@ingame/shared';
import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { PriceChip } from './PriceChip';
import { OwnedTag, LockedTag } from './Tags';
import { UltimateChip } from './UltimateChip';
import { HueStrip } from './HueStrip';

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
  tier,
  colorCustomizable = false,
  preview,
  onPress,
}: {
  name: string;
  type: string;
  price?: number;
  owned?: boolean;
  lockedLabel?: string;
  /** COSM-05 — the item's price tier; `'ultimate'` earns the inverted-gold ULTIMATE chip (decision 0080 r3). */
  tier?: CosmeticTier;
  /** COSM-05 — a colour-customizable (Ultimate) design wears the hue-strip tell in the badge corner. */
  colorCustomizable?: boolean;
  preview?: ReactNode;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const ultimate = tier === 'ultimate';
  // colour-customizability rides the FLAT label (Murr W-5 LOW) — the nested HueStrip's own label is
  // unreachable to VoiceOver inside this labelled Pressable.
  const label = `${name}, ${type}${ultimate ? ', Ultimate' : ''}${colorCustomizable ? ', colour-customizable' : ''}`;
  return (
    <Pressable
      style={styles.tile}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
    >
      <View style={styles.previewSlot}>{preview}</View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.type} numberOfLines={1}>
        {type}
      </Text>
      {/* the tier/colour tells sit above the state chip: the ULTIMATE chip (decision 0080 r3) + the
          hue-strip glyph on a colour-customizable design (draft §4.1). Both ride the existing badge
          grammar — the chip where a tier badge would sit, the glyph beside it. */}
      {ultimate || colorCustomizable ? (
        <View style={styles.tierRow}>
          {ultimate ? <UltimateChip /> : null}
          {colorCustomizable ? <HueStrip /> : null}
        </View>
      ) : null}
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
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5, textAlign: 'center' },
  type: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1, textAlign: 'center' },
}));
