import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { GalleryCardView, AdoptResponse } from '@ingame/shared';
import { PulledSheet } from '../PulledSheet';
import { ConfirmSheet } from '../ConfirmSheet';
import { ScreenButton } from '../ScreenButton';
import { themedStyles } from '../../theme';
import { BuyBar } from '../commerce/BuyBar';
import { AcquireBeat } from '../commerce/AcquireBeat';
import { CosmeticSwatch } from '../commerce/CosmeticSwatch';
import { PriceChip } from '../commerce/PriceChip';
import { PixelsMark } from '../commerce/PixelsMark';
import { OwnedTag } from '../commerce/Tags';
import { FlatCardImage } from './FlatCardImage';
import { AdoptCount } from './CommunityGallery';

// The outcome the container hands back from POST /cards/:id/adopt (the container owns the RTK mutation;
// the sheet owns the confirm + result UX so it stays testable without a store).
export type AdoptOutcome =
  | { ok: true; result: AdoptResponse }
  | { ok: false; code: 'INSUFFICIENT_BALANCE'; shortBy: number }
  | { ok: false; code: 'ALREADY_ADOPTED' | 'NOT_PUBLISHED' | 'OFFLINE' | 'ERROR' };

// AdoptCardSheet (P8 · SOC-11 atomic adopt · M5 F-9 E1) — buying a community card must FEEL like buying
// cosmetics in the Styler. So this sheet wears the ReconcileSheet ANATOMY: the flattened card preview at
// top, then rows of the card's PREMIUM components (swatch · name · owned/price — E2 `card.components`),
// the summed TOTAL, and the SHARED gold BuyBar hold-to-adopt (G1/G2). Insufficient funds NEVER offer the
// hold (G3, pre-emptive) — the BuyBar shows NOT-ENOUGH + a TOP UP door. Success acknowledges IN PLACE
// (G5 — a settle beat, no toast) with the acquire celebration (G6 AcquireBeat). FREE cards take the
// standard (non-gold, G1) tap → a purchase-toned confirm with no debit line. Block-the-designer
// (SOC-09-light) is the ⋯ / long-press on the credit.
export function AdoptCardSheet({
  card,
  visible,
  balance,
  onClose,
  onAdopt,
  adopting,
  onAdopted,
  onTopUp,
  onShare,
  onBlock,
  shareBusy = false,
}: {
  card: GalleryCardView | null;
  visible: boolean;
  /** the caller's wallet balance — drives the BuyBar meta + the G3 pre-emptive can't-afford state. */
  balance: number;
  onClose: () => void;
  /** Runs POST /cards/:id/adopt; resolves to the mapped outcome. */
  onAdopt: () => Promise<AdoptOutcome>;
  adopting: boolean;
  /** Success — the container invalidates (switcher/gallery/wallet). It does NOT toast or close: the sheet
   *  shows the in-place settle (G5) and its own Done door. */
  onAdopted: (result: AdoptResponse, card: GalleryCardView) => void;
  onTopUp: () => void;
  onShare: () => void;
  /** Open the destructive block confirm for this card's designer (container-owned). */
  onBlock: () => void;
  shareBusy?: boolean;
}) {
  const styles = useStyles();
  const [confirming, setConfirming] = useState(false); // the FREE-path confirm gate
  const [outcome, setOutcome] = useState<Exclude<AdoptOutcome, { ok: true }> | null>(null);
  const [adopted, setAdopted] = useState(false); // G5 — the in-place success settle

  // Reset the transient state whenever a new card is inspected (or the sheet closes).
  useEffect(() => {
    setConfirming(false);
    setOutcome(null);
    setAdopted(false);
  }, [card?.id, visible]);

  if (!card) return null;
  const free = card.priceForYou <= 0;
  const components = card.components ?? [];

  async function runAdopt() {
    if (!card) return;
    setConfirming(false);
    setOutcome(null);
    const r = await onAdopt();
    if (r.ok) {
      setAdopted(true); // G5/G6 — settle in place + celebrate; container invalidates in the background
      onAdopted(r.result, card);
    } else {
      setOutcome(r);
    }
  }

  return (
    <>
      <PulledSheet visible={visible && !confirming} onClose={onClose}>
        <View style={styles.head}>
          <Text style={styles.headTitle} numberOfLines={1}>
            COMMUNITY CARD — <Text style={styles.headName}>{card.name.toUpperCase()}</Text>
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.cardWrap}>
          <FlatCardImage title={card.name} imageUrl={card.imageUrl ?? card.thumbUrl} size="pick" />
        </View>

        {/* DESIGNED BY «designer» · ADOPTED N× — long-press / the ⋯ opens the block confirm (SOC-09-light) */}
        <View style={styles.creditRow}>
          <Pressable
            onLongPress={onBlock}
            accessibilityRole="text"
            accessibilityHint="Long-press to block this designer"
            style={styles.creditPress}
          >
            <Text style={styles.credit}>
              DESIGNED BY <Text style={styles.creditName}>{card.designer.username.toUpperCase()}</Text> ·
              ADOPTED{' '}
            </Text>
            <AdoptCount count={card.adoptionCount} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Block ${card.designer.username}`}
            onPress={onBlock}
            hitSlop={8}
          >
            <Text style={styles.ovf}>⋯</Text>
          </Pressable>
        </View>

        {adopted ? (
          // G5 — the in-place success settle (the KeepBeat/SaveAsNewBeat grammar): a ✓ strip where the
          // action was, never a toast; the G6 AcquireBeat plays over it.
          <View style={styles.settleWrap}>
            <View style={styles.okStrip}>
              <Text style={styles.okIc}>✓</Text>
              <View style={styles.okTx}>
                <Text style={styles.okTitle}>ADOPTED — {card.name.toUpperCase()}</Text>
                <Text style={styles.okSub}>It’s in your switcher now — equip it any time.</Text>
              </View>
            </View>
            <ScreenButton label="Done" variant="primary" onPress={onClose} block />
            <AcquireBeat />
          </View>
        ) : outcome?.code === 'ALREADY_ADOPTED' ? (
          <View style={styles.ownedBar}>
            <Text style={styles.ownedText}>✓ YOU ALREADY HAVE THIS CARD — it&apos;s in your switcher.</Text>
          </View>
        ) : outcome?.code === 'NOT_PUBLISHED' ? (
          <View style={styles.ownedBar}>
            <Text style={styles.unavailText}>This card is no longer available.</Text>
          </View>
        ) : outcome?.code === 'OFFLINE' ? (
          <View style={styles.ownedBar}>
            <Text style={styles.unavailText}>You&apos;re offline — adopting needs a connection.</Text>
          </View>
        ) : outcome?.code === 'ERROR' ? (
          <View style={styles.ownedBar}>
            <Text style={styles.unavailText}>That didn&apos;t go through — nothing was charged. Try again.</Text>
          </View>
        ) : (
          <>
            {/* the reconcile-style component list (E1/E2) — what the card is built from, with swatches */}
            {components.length > 0 ? (
              <View style={styles.componentBlock}>
                <Text style={styles.compHead}>PREMIUM COMPONENTS — ACQUIRED WITH THE CARD</Text>
                <View style={styles.list}>
                  {components.map((c) => (
                    <View key={c.cosmeticId} style={styles.row}>
                      <View style={styles.rowThumb}>
                        <CosmeticSwatch type={c.type} id={c.cosmeticId} size="row" />
                      </View>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <View style={styles.spacer} />
                      {c.owned ? <OwnedTag /> : <PriceChip pixels={c.price} />}
                    </View>
                  ))}
                </View>
                {!free ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL — WHAT YOU PAY</Text>
                    <View style={styles.spacer} />
                    <Text style={styles.totalValue}>{card.priceForYou}</Text>
                    <PixelsMark size={12} />
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.card15}>You get the image, not the layers.</Text>

            {/* the action (G1/G2/G3) — FREE = a standard tap → purchase-toned confirm (no debit); PRICED =
                the shared gold BuyBar hold-to-adopt, which owns the pre-emptive NOT-ENOUGH (G3). */}
            {free ? (
              <ScreenButton
                label="Adopt · Free"
                variant="primary"
                onPress={() => setConfirming(true)}
                disabled={adopting}
                block
              />
            ) : (
              <BuyBar
                price={card.priceForYou}
                balance={balance}
                verb="ADOPT"
                onBuy={() => void runAdopt()}
                onTopUp={onTopUp}
                disabled={adopting}
                note={adopting ? 'adopting…' : 'the whole card · yours account-wide'}
              />
            )}
          </>
        )}

        {!adopted ? (
          <>
            <View style={styles.actions}>
              <ScreenButton
                label={shareBusy ? '…' : 'Share'}
                variant="secondary"
                onPress={onShare}
                disabled={shareBusy}
                style={styles.actionBtn}
              />
            </View>
            <Text style={styles.note}>
              {free
                ? 'This card is free to adopt — the designer earns clout, not currency.'
                : 'Premium components are acquired once and yours account-wide. The designer earns clout, not currency.'}
            </Text>
          </>
        ) : null}
      </PulledSheet>

      {/* the FREE-path confirm (SOC-11) — purchase-toned, never destructive-red, no debit line. */}
      <ConfirmSheet
        visible={confirming}
        tone="purchase"
        title="Adopt this card?"
        message={`"${card.name}" will be added to your cards for this game. It's free — the designer earns clout, not currency.`}
        confirmLabel="Adopt"
        busy={adopting}
        onConfirm={() => void runAdopt()}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}

const useStyles = themedStyles((t) => ({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: t.space.sm, gap: t.space.md },
  headTitle: { flex: 1, fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  headName: { color: t.scr.ink },
  close: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim },
  cardWrap: { alignItems: 'center', paddingVertical: t.space.sm },
  creditRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.sm },
  creditPress: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  credit: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, textAlign: 'center' },
  creditName: { fontFamily: t.font.screenBold, color: t.scr.ink },
  ovf: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim, marginTop: -6 },
  // ── the component list (reconcile anatomy) ──
  componentBlock: { marginTop: t.space.md, gap: t.space.sm },
  compHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  list: { gap: t.space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  rowThumb: { width: 46, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  itemName: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5, flexShrink: 1 },
  spacer: { flex: 1 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: t.space.sm },
  totalLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  totalValue: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.gold, letterSpacing: 0.5 },
  card15: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, lineHeight: 13, marginTop: t.space.md, marginBottom: t.space.sm },
  // ── settle / states ──
  settleWrap: { marginTop: t.space.md, gap: t.space.md },
  okStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: 'rgba(255,210,63,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.55)',
  },
  okIc: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.gold },
  okTx: { gap: 2, flexShrink: 1 },
  okTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.8 },
  okSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  ownedBar: { marginTop: t.space.md, padding: t.space.md, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline },
  ownedText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5 },
  unavailText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  actions: { flexDirection: 'row', gap: t.space.md, marginTop: t.space.md },
  actionBtn: { flex: 1 },
  note: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, lineHeight: 15, marginTop: t.space.sm },
}));
