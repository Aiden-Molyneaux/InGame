import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { PixelsMark } from './PixelsMark';

// StoreEntries (M6 owner-walk) — the two store-bottom entry points, drawn in THE INDEX row grammar (the
// glyph · label · trailing gold action recipe the PIXELS → TOP UP door used to wear inside AisleIndex).
// The owner walk moved the Pixel Top-Up door OUT of The Index to sit here, at the foot of the store,
// alongside an explicit WALLET door. These are NAVIGATION entry points only — no economy semantics: TOP
// UP opens the pack ladder view, WALLET opens the balance + ledger view (both in-screen sub-views of
// /store, the FlowTakeover precedent). Full-width stacked rows so each reads as a deliberate store exit.
export function StoreEntries({ onTopUp, onWallet }: { onTopUp: () => void; onWallet: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.stack}>
      <Pressable
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel="Pixel top-up"
        onPress={onTopUp}
      >
        <PixelsMark size={13} />
        <Text style={styles.label} numberOfLines={1}>
          PIXEL TOP-UP
        </Text>
        <Text style={styles.action}>TOP UP ›</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel="Wallet"
        onPress={onWallet}
      >
        <Text style={styles.glyph}>▤</Text>
        <Text style={styles.label} numberOfLines={1}>
          WALLET
        </Text>
        <Text style={styles.action}>OPEN ›</Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  stack: { gap: 5 },
  // mirrors AisleIndex.row (the reference grammar) — full width, panel bg, hairline border, touch-comfy pad.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.md,
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
  // the trailing door action wears the gold economy voice (F-02), matching the retired Index TOP UP door.
  action: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.value, letterSpacing: 0.5 },
}));
