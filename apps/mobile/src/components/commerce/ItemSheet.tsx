import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, Text } from 'react-native';
import type { StorePack } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { TertiaryLink } from '../TertiaryLink';
import { PriceChip } from './PriceChip';
import { OwnedTag } from './Tags';
import { BuyBar } from './BuyBar';
import { AcquireBeat } from './AcquireBeat';
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
  owned = false,
  ownedNote = 'In your editor',
  onClose,
  onBuy,
  buyNote,
  preview,
  previewLabel = 'Previewed on your card — live',
  previewSwapLabel,
  onPreviewSwap,
  freePack = false,
  shortBy = null,
  bridgePacks = [],
  onBuyPack,
  onAllPacks,
  onTopUp,
  celebrate = false,
}: {
  visible: boolean;
  item: StoreItem | null;
  balance: number;
  /** true = the caller already owns this (P9 grammar): NO BuyBar, an OWNED row instead — the price is gone. */
  owned?: boolean;
  ownedNote?: string;
  onClose: () => void;
  onBuy: () => void;
  buyNote?: string;
  preview?: ReactNode;
  previewLabel?: string;
  previewSwapLabel?: string;
  onPreviewSwap?: () => void;
  /** a FREE item (the one sticker pack, P2b): no PriceChip, no BuyBar — an owned-style acquire row. */
  freePack?: boolean;
  /** the PX still needed (from a 409 INSUFFICIENT_BALANCE {shortBy}); non-null = the P5 bridge shows. */
  shortBy?: number | null;
  bridgePacks?: StorePack[];
  onBuyPack?: (pack: StorePack) => void;
  onAllPacks?: () => void;
  /** G3 (M5 F-9) — the top-up destination; lets the BuyBar render its pre-emptive NOT-ENOUGH state. */
  onTopUp?: () => void;
  /** G6 (M5 F-9) — true right after a fresh buy → the AcquireBeat celebration plays over the owned flip. */
  celebrate?: boolean;
}) {
  const styles = useStyles();
  // G6 — fire the acquire celebration once when `celebrate` rises (the just-bought owned flip).
  const [beat, setBeat] = useState(false);
  const wasCelebrating = useRef(false);
  useEffect(() => {
    if (celebrate && !wasCelebrating.current) setBeat(true);
    wasCelebrating.current = celebrate;
  }, [celebrate]);
  if (!item) return null;
  const short = shortBy != null && shortBy > 0;
  const free = freePack || item.price <= 0;
  return (
    <PulledSheet visible={visible} onClose={onClose}>
      {/* F-15 fix 3 — the item IDENTITY leads: name · type · PriceChip sit at the TOP of the sheet (right
          under the grab handle), ABOVE the preview, so you know WHAT you're looking at before the live
          preview loads. General to every ItemSheet (card cosmetics too), not just themes/shells. */}
      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.type} numberOfLines={1}>
          {item.type}
        </Text>
        <View style={styles.spacer} />
        {owned ? <OwnedTag /> : free ? null : <PriceChip pixels={item.price} big />}
      </View>

      <PreviewStage label={previewLabel} swapLabel={previewSwapLabel} onSwap={onPreviewSwap}>
        {preview}
      </PreviewStage>

      {short && !owned ? (
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

      {owned ? (
        // P9 owned grammar — the just-bought / already-owned state: no BuyBar, the price never returns.
        <View style={styles.ownedRow}>
          <OwnedTag />
          <Text style={styles.ownedNote}>{ownedNote.toUpperCase()}</Text>
        </View>
      ) : free ? (
        // P2b free sticker pack — no BuyBar either way (the pack is free); a plain acquire row.
        <View style={styles.ownedRow}>
          <Text style={styles.ownedNote}>{ownedNote.toUpperCase()}</Text>
        </View>
      ) : (
        <BuyBar price={item.price} balance={balance} onBuy={onBuy} onTopUp={onTopUp} disabled={short} note={buyNote} />
      )}

      {/* G6 — the acquire celebration, at the point of purchase (survives the BUY→OWNED flip because it
          lives at the sheet level, not inside the BuyBar). Tap-through; auto-settles ≤600ms. */}
      {beat ? <AcquireBeat onDone={() => setBeat(false)} /> : null}
    </PulledSheet>
  );
}

const useStyles = themedStyles((t) => ({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  // F-4 — long premium names ("HOLOGRAPHIC", "ORNATE GOLD") wrap to 2 lines rather than shove the type +
  // PriceChip off the row (numberOfLines={2}); `flexShrink` lets the title yield to the trailing chip.
  name: { flexShrink: 1, fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  type: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  spacer: { flex: 1 },
  ownedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    marginTop: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: t.scr.bg,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  ownedNote: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  shortStrip: {
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: 'rgba(227,65,78,0.1)',
    borderWidth: 1,
    borderColor: t.brand.alert,
  },
  shortText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.alert, letterSpacing: 1 },
  bridgeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // F-1 fix 1 — the can't-afford TOP-UP bridge title wears the gold economy voice (F-02).
  bridgeTitle: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.value, letterSpacing: 2 },
  bridgeGrid: { flexDirection: 'row', gap: t.space.md },
}));
