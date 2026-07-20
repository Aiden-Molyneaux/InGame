import type { CosmeticType, CosmeticTier } from '@ingame/shared';
import { View, Text } from 'react-native';
import { PulledSheet } from '../PulledSheet';
import { ScreenButton } from '../ScreenButton';
import { BuyBar } from './BuyBar';
import { PriceChip } from './PriceChip';
import { PixelsMark } from './PixelsMark';
import { CosmeticSwatch } from './CosmeticSwatch';
import { UltimateChip } from './UltimateChip';
import { themedStyles } from '../../theme';

// ReconcileSheet (component-map §7 · CARD-13 · styler-states P6 · canvas PRESS reconcile) — the ACQUIRE
// ALL bridge. A KEEP / PUBLISH / apply that carries premium components the owner doesn't own opens this:
// it lists the unowned premium, their PX prices, and the summed total. Two fragments (decision 0072):
//   • FUNDED (balance ≥ total) — the BuyBar hold-to-buy (+ its OQ-046 non-hold a11y alt) confirms →
//     acquire-batch (atomic all-or-nothing), then the caller's KEEP/PUBLISH proceeds.
//   • SHORT (balance < total) — the shortfall + a TOP UP door to the Store (never a bare spend, ECON-01).
// Never destructive-red; the currency voice is gold (F-02). Themed-token native (0070).

export interface ReconcileItem {
  cosmeticId: string;
  name: string;
  /** COSM-01 type — drives the G4 CosmeticSwatch (M5 F-9): the shopper sees what they're buying. */
  type: CosmeticType;
  price: number;
  /** COSM-05 (decision 0080 r3) — the component's tier; `'ultimate'` wears the compact ULTIMATE chip,
   *  the same marking the store + adopt surfaces use (consistency across the cost-stack anatomy). */
  tier?: CosmeticTier;
}

export function ReconcileSheet({
  visible,
  onClose,
  items,
  total,
  balance,
  busy = false,
  context = 'keep',
  onAcquireAll,
  onTopUp,
}: {
  visible: boolean;
  onClose: () => void;
  items: ReconcileItem[];
  total: number;
  balance: number;
  busy?: boolean;
  /** flavors the lead line — what proceeds once the components are acquired. */
  context?: 'keep' | 'publish' | 'apply';
  onAcquireAll: () => void;
  onTopUp: () => void;
}) {
  const styles = useStyles();
  const short = balance < total;
  const shortBy = Math.max(0, total - balance);
  const proceedWord =
    context === 'publish' ? 'publish this card' : context === 'apply' ? 'apply this look' : 'equip this card';

  return (
    <PulledSheet visible={visible} onClose={onClose} title="Premium components">
      <Text style={styles.lead}>
        This design uses {items.length} premium component{items.length === 1 ? '' : 's'} you don’t own yet.
        Acquire {items.length === 1 ? 'it' : 'them all'} to {proceedWord} — they’re yours account-wide after.
      </Text>

      <View style={styles.list}>
        {items.map((it) => (
          <View key={it.cosmeticId} style={styles.row}>
            {/* G4 — every buy-list row carries the item's swatch, so the shopper isn't buying a name. */}
            <View style={styles.rowThumb}>
              <CosmeticSwatch type={it.type} id={it.cosmeticId} size="row" />
            </View>
            <Text style={styles.itemName} numberOfLines={1}>
              {it.name}
            </Text>
            <View style={styles.spacer} />
            {/* decision 0080 r3 — an ULTIMATE component wears the same compact chip as the store/adopt
                rows; the 10-PX price still rides the PriceChip beside it (the cost-stack is unchanged). */}
            {it.tier === 'ultimate' ? <UltimateChip compact /> : null}
            <PriceChip pixels={it.price} />
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <View style={styles.spacer} />
        <Text style={styles.totalValue}>{total}</Text>
        <PixelsMark size={12} />
      </View>

      {short ? (
        <View style={styles.shortWrap}>
          <Text style={styles.shortLine}>
            You have {balance} PX — {shortBy} PX short. Top up to acquire {items.length === 1 ? 'it' : 'them'}.
          </Text>
          {/* D3 (F-11) — the top-up door wears the PIXELS glyph (a wallet door, not a spend) + a
              draft-safe reassurance so leaving to top up never reads as losing the edit. */}
          <ScreenButton
            label="Top up pixels ▸"
            variant="add"
            icon={<PixelsMark size={13} />}
            onPress={onTopUp}
            disabled={busy}
            block
          />
          <Text style={styles.draftSafe}>Your draft is saved on this card.</Text>
          <ScreenButton label="Not now" variant="secondary" onPress={onClose} disabled={busy} block />
        </View>
      ) : (
        <BuyBar
          price={total}
          balance={balance}
          onBuy={onAcquireAll}
          disabled={busy}
          note={busy ? 'acquiring…' : `acquire all ${items.length} · yours to keep`}
        />
      )}
    </PulledSheet>
  );
}

const useStyles = themedStyles((t) => ({
  lead: {
    fontFamily: t.font.screen,
    fontSize: t.type.body,
    color: t.scr.dim,
    lineHeight: 16,
    paddingBottom: t.space.sm,
  },
  list: { gap: t.space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  // clip the swatch SVG to its slot so it can never bleed over the name/price (the P9 AisleRow precedent).
  rowThumb: { width: 46, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  itemName: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5, flexShrink: 1 },
  spacer: { flex: 1 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: t.space.md,
  },
  totalLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  totalValue: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.gold, letterSpacing: 0.5 },
  shortWrap: { gap: t.space.md },
  shortLine: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5, lineHeight: 15 },
  // D3 — the draft-safe reassurance, tucked under the top-up door (F-06 micro).
  draftSafe: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, textAlign: 'center', marginTop: -t.space.sm },
}));
