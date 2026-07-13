import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { GalleryCardView, AdoptResponse } from '@ingame/shared';
import { PulledSheet } from '../PulledSheet';
import { ConfirmSheet } from '../ConfirmSheet';
import { ScreenButton } from '../ScreenButton';
import { themedStyles } from '../../theme';
import { FlatCardImage } from './FlatCardImage';
import { AdoptCount } from './CommunityGallery';

// The outcome the container hands back from POST /cards/:id/adopt (the container owns the RTK mutation;
// the sheet owns the confirm + result UX so it stays testable without a store).
export type AdoptOutcome =
  | { ok: true; result: AdoptResponse }
  | { ok: false; code: 'INSUFFICIENT_BALANCE'; shortBy: number }
  | { ok: false; code: 'ALREADY_ADOPTED' | 'NOT_PUBLISHED' | 'OFFLINE' | 'ERROR' };

// AdoptCardSheet (P8 · the game page CARDS gallery inspect/adopt — SOC-11 atomic adopt). A community
// card rises as a PulledSheet: the flattened render large (never skia — OQ-138), the DESIGNED-BY credit
// + AdoptCount, and the adopt bar. ADOPT → a purchase-toned ConfirmSheet (the total, or FREE with no
// debit line) → the container's `onAdopt`. Errors resolve IN the sheet: INSUFFICIENT_BALANCE → the
// can't-afford bridge (short-strip + TOP UP, P6's grammar); ALREADY_ADOPTED → owned; NOT_PUBLISHED →
// vanished. Block-the-designer (SOC-09-light) is a long-press / ⋯ on the credit → the container's
// destructive confirm (the existing game-page ConfirmSheet-at-root pattern).
export function AdoptCardSheet({
  card,
  visible,
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
  onClose: () => void;
  /** Runs POST /cards/:id/adopt; resolves to the mapped outcome. */
  onAdopt: () => Promise<AdoptOutcome>;
  adopting: boolean;
  /** Success — the container toasts, invalidates, and closes. */
  onAdopted: (result: AdoptResponse, card: GalleryCardView) => void;
  onTopUp: () => void;
  onShare: () => void;
  /** Open the destructive block confirm for this card's designer (container-owned). */
  onBlock: () => void;
  shareBusy?: boolean;
}) {
  const styles = useStyles();
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<Exclude<AdoptOutcome, { ok: true }> | null>(null);

  // Reset the transient state whenever a new card is inspected (or the sheet closes).
  useEffect(() => {
    setConfirming(false);
    setOutcome(null);
  }, [card?.id, visible]);

  if (!card) return null;
  const free = card.priceForYou <= 0;

  async function runAdopt() {
    if (!card) return;
    setConfirming(false);
    setOutcome(null);
    const r = await onAdopt();
    if (r.ok) {
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

        {/* the adopt bar (ECON-04) — you get the flattened image, not the layers (CARD-15) */}
        {outcome?.code === 'ALREADY_ADOPTED' ? (
          <View style={styles.ownedBar}>
            <Text style={styles.ownedText}>✓ YOU ALREADY HAVE THIS CARD — it&apos;s in your switcher.</Text>
          </View>
        ) : outcome?.code === 'NOT_PUBLISHED' ? (
          <View style={styles.ownedBar}>
            <Text style={styles.unavailText}>This card is no longer available.</Text>
          </View>
        ) : outcome?.code === 'INSUFFICIENT_BALANCE' ? (
          <View style={styles.bridge}>
            <Text style={styles.shortStrip}>
              SHORT {outcome.shortBy} {outcome.shortBy === 1 ? 'PIXEL' : 'PIXELS'} — TOP UP TO ADOPT
            </Text>
            <ScreenButton label="Top up" variant="add" size="mini" onPress={onTopUp} block />
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
          <View style={styles.adoptBar}>
            <View style={styles.adoptMeta}>
              <Text style={styles.adoptTitle}>ADOPT — THE WHOLE CARD</Text>
              <Text style={styles.adoptSub}>You get the image, not the layers.</Text>
            </View>
            <ScreenButton
              label={free ? 'Adopt · Free' : `Adopt · ${card.priceForYou} PX`}
              variant="primary"
              size="mini"
              onPress={() => setConfirming(true)}
              disabled={adopting}
            />
          </View>
        )}

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
      </PulledSheet>

      {/* the atomic adopt confirm (SOC-11) — purchase-toned, never destructive-red. FREE = no debit line. */}
      <ConfirmSheet
        visible={confirming}
        tone="purchase"
        title="Adopt this card?"
        message={
          free
            ? `"${card.name}" will be added to your cards for this game. It's free — the designer earns clout, not currency.`
            : `Adopting "${card.name}" acquires its premium components — ${card.priceForYou} ${card.priceForYou === 1 ? 'pixel' : 'pixels'} total — and adds the card to your cards for this game.`
        }
        confirmLabel={free ? 'Adopt' : `Adopt · ${card.priceForYou} PX`}
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
  adoptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    marginTop: t.space.md,
    padding: t.space.md,
    backgroundColor: t.scr.bg,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  adoptMeta: { flex: 1, gap: 2 },
  adoptTitle: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.8 },
  adoptSub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, lineHeight: 13 },
  bridge: { gap: t.space.sm, marginTop: t.space.md, padding: t.space.md, backgroundColor: t.scr.bg, borderWidth: 1, borderColor: t.brand.gold },
  shortStrip: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 0.8, textAlign: 'center' },
  ownedBar: { marginTop: t.space.md, padding: t.space.md, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline },
  ownedText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5 },
  unavailText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  actions: { flexDirection: 'row', gap: t.space.md, marginTop: t.space.md },
  actionBtn: { flex: 1 },
  note: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, lineHeight: 15, marginTop: t.space.sm },
}));
