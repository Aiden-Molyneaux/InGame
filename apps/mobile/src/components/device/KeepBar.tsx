import { View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { BuyBar } from '../commerce/BuyBar';
import { PixelsMark } from '../commerce/PixelsMark';

// KeepBar (component-map §5 device · board D7/D7b/D7c) — the Device premium CART. Applying an unowned
// premium shell/theme previews it LIVE on the handheld but does NOT persist; the KeepBar collects the
// previewed unowned premium, shows the running PX total, and KEEP acquires them all (acquire-batch) then
// commits the facets. CANCEL reverts the preview to the saved device. FUNDED = the BuyBar hold-to-buy
// (+ OQ-046 non-hold alt); SHORT = the shortfall + a TOP UP door (never a bare spend, ECON-01). A pinned
// bar so it rides above the section rail while a preview is live. Themed-token native (0070).

export interface KeepBarItem {
  cosmeticId: string;
  name: string;
  price: number;
}

export function KeepBar({
  items,
  total,
  balance,
  busy = false,
  onKeep,
  onCancel,
  onTopUp,
}: {
  items: KeepBarItem[];
  total: number;
  balance: number;
  busy?: boolean;
  onKeep: () => void;
  onCancel: () => void;
  onTopUp: () => void;
}) {
  const styles = useStyles();
  if (items.length === 0) return null;
  const short = balance < total;
  const shortBy = Math.max(0, total - balance);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>PREVIEWING PREMIUM</Text>
        <View style={styles.spacer} />
        <Text style={styles.total}>{total}</Text>
        <PixelsMark size={11} />
        <Text style={styles.tail}>TO KEEP</Text>
      </View>
      {/* D7 — per-item PX prices ride the economy GOLD (F-02 t.brand.gold); the name stays dim. */}
      <Text style={styles.items} numberOfLines={1}>
        {items.map((i, idx) => (
          <Text key={i.cosmeticId}>
            {idx > 0 ? '   ·   ' : ''}
            {i.name}{' '}
            <Text style={styles.itemPrice}>{i.price} PX</Text>
          </Text>
        ))}
      </Text>
      {short ? (
        <View style={styles.shortRow}>
          <Text style={styles.shortLine}>{shortBy} PX short — top up to keep {items.length === 1 ? 'it' : 'them'}.</Text>
          {/* D7 — the short-state TOP UP door carries the PIXELS glyph (it's a wallet door, not a spend). */}
          <ScreenButton label="Top up ▸" variant="add" size="mini" icon={<PixelsMark size={11} />} onPress={onTopUp} disabled={busy} />
          <ScreenButton label="Cancel" variant="secondary" size="mini" onPress={onCancel} disabled={busy} />
        </View>
      ) : (
        <View style={styles.fundedRow}>
          <View style={styles.buyFill}>
            <BuyBar
              price={total}
              balance={balance}
              onBuy={onKeep}
              disabled={busy}
              note={busy ? 'acquiring…' : `keep all ${items.length} · applied to your device`}
            />
          </View>
          <ScreenButton label="Cancel" variant="secondary" size="mini" onPress={onCancel} disabled={busy} />
        </View>
      )}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
    backgroundColor: t.scr.bg,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    gap: t.space.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  spacer: { flex: 1 },
  total: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.gold, letterSpacing: 0.5 },
  tail: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1, marginLeft: 2 },
  items: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  // D7 — the economy gold token (F-02) on the per-item price.
  itemPrice: { fontFamily: t.font.screenBold, color: t.brand.gold },
  // D7 — the descriptive line grows so the Buy/Cancel action pair right-aligns to the bar edge.
  shortRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, flexWrap: 'wrap' },
  shortLine: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, flex: 1, minWidth: 140 },
  fundedRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  buyFill: { flex: 1 },
}));
