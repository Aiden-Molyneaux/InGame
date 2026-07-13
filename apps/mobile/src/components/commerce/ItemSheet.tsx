import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import type { StorePack } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { TertiaryLink } from '../TertiaryLink';
import { PriceChip } from './PriceChip';
import { BuyBar } from './BuyBar';
import { PreviewStage } from './PreviewStage';
import { PackTile } from './PackTile';

// ItemSheet (component-map §7 infra · board P2/P2b/P5) — the premium-item detail as a PulledSheet:
// PreviewStage (the item live on your own stuff) · title row + PriceChip/big · the BuyBar (the OQ-046
// launch gate). When a BUY returns INSUFFICIENT_BALANCE {shortBy}, the sheet grows the P5 bridge (the
// short-strip + the cheapest covering PackTile minis) and the BuyBar sleeps until a pack lands.
//
// M5 posture: no premium item is acquirable (the roster re-tag is P4), so the screen doesn't open this
// live yet — it is the built seam P4 content drops into, and the home of the in-context BuyBar gate.
export interface StoreItem {
  id: string;
  name: string;
  type: string; // e.g. "FINISH · CATALOG"
  price: number;
}

export function ItemSheet({
  visible,
  item,
  balance,
  onClose,
  onBuy,
  buyNote,
  preview,
  previewLabel = 'Previewed on your card — live',
  shortBy = null,
  bridgePacks = [],
  onBuyPack,
  onAllPacks,
}: {
  visible: boolean;
  item: StoreItem | null;
  balance: number;
  onClose: () => void;
  onBuy: () => void;
  buyNote?: string;
  preview?: ReactNode;
  previewLabel?: string;
  /** the PX still needed (from a 409 INSUFFICIENT_BALANCE {shortBy}); non-null = the P5 bridge shows. */
  shortBy?: number | null;
  bridgePacks?: StorePack[];
  onBuyPack?: (pack: StorePack) => void;
  onAllPacks?: () => void;
}) {
  const styles = useStyles();
  if (!item) return null;
  const short = shortBy != null && shortBy > 0;
  return (
    <PulledSheet visible={visible} onClose={onClose}>
      <PreviewStage label={previewLabel}>{preview}</PreviewStage>

      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.type} numberOfLines={1}>
          {item.type}
        </Text>
        <View style={styles.spacer} />
        <PriceChip pixels={item.price} big />
      </View>

      {short ? (
        <>
          <View style={styles.shortStrip}>
            <Text style={styles.shortText}>
              ⚠ SHORT {shortBy} PIXELS — YOU HAVE {balance}
            </Text>
          </View>
          <View style={styles.bridgeHead}>
            <Text style={styles.bridgeTitle}>TOP UP RIGHT HERE</Text>
            {onAllPacks ? <TertiaryLink label="All packs ›" onPress={onAllPacks} /> : null}
          </View>
          <View style={styles.bridgeGrid}>
            {bridgePacks.map((p) => (
              <PackTile key={p.productId} pack={p} onBuy={() => onBuyPack?.(p)} />
            ))}
          </View>
        </>
      ) : null}

      <BuyBar price={item.price} balance={balance} onBuy={onBuy} disabled={short} note={buyNote} />
    </PulledSheet>
  );
}

const useStyles = themedStyles((t) => ({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  type: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  spacer: { flex: 1 },
  shortStrip: {
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: 'rgba(227,65,78,0.1)',
    borderWidth: 1,
    borderColor: t.brand.alert,
  },
  shortText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.alert, letterSpacing: 1 },
  bridgeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bridgeTitle: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  bridgeGrid: { flexDirection: 'row', gap: t.space.md },
}));
