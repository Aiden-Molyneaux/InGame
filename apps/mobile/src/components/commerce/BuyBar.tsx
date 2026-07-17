import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import { HoldFillButton, HOLD_MS } from './HoldFillButton';
import { ScreenButton } from '../ScreenButton';
import { PixelsMark } from './PixelsMark';

// BuyBar (component-map §7 · design-spec §2.3 motion.holdToBuy · OQ-046 · M5 F-9 grammar) — the shared
// PX spend bar every in-context buy (ItemSheet · ReconcileSheet · KeepBar · the adopt sheet) speaks
// through. It carries the F-9 unification (owner device walk 2026-07-14):
//   G1 — a PX cost renders the GOLD economy voice (F-02).
//   G2 — HOLD-to-activate with a FILLING gold sweep while held (the shared HoldFillButton); releasing
//        early spends nothing. Reduce-motion (OQ-046 / 0044 §104) collapses to an INLINE two-step
//        confirm (CANCEL · CONFIRM), so a timed gesture never gates a motor-impaired user.
//   G3 — INSUFFICIENT funds NEVER offer the hold (pre-emptive, uniform, no failed-attempt flow): when
//        the balance can't cover the price AND a top-up destination exists, the bar renders its
//        can't-afford state — "NOT ENOUGH ◇ — YOU HAVE N" — with the TOP UP door INLINE beneath. The
//        server 409 stays the backstop, never the UX.
//   G6 (the acquire celebration) is SURFACE-owned, not bar-owned — a surface that settles into
//        owned/kept mounts <AcquireBeat> where the action was (so it survives the bar unmounting on the
//        owned flip). BuyBar just fires `onBuy`.
// F-8 (E3-C3): the reduce-motion confirm is INLINE (never a nested ConfirmSheet — a PulledSheet parent
// would clip it half-open).
//
// F-21 (owner buy-drawer walk 2026-07-16) — the bar is UNBOXED: the action key stands FREE (no bordered
// container), a vertical stack of {a prominent balance line · the note/spend-prompt · the free-standing
// stepped BUY/HOLD key}. Ruling 2 (unboxed) + ruling 4 (the balance reads prominently — its own gold-
// marked line near the action, at title size) both land in this restructure; the key steps via
// HoldFillButton (ruling 1). The parent surface owns horizontal padding, so a block key spans the
// content width and reads as a free-standing button, not a boxed toolbar.
export { HOLD_MS };

export function BuyBar({
  price,
  balance,
  onBuy,
  onTopUp,
  disabled = false,
  note,
  holdMs = HOLD_MS,
  verb = 'BUY',
}: {
  price: number;
  balance: number;
  onBuy: () => void;
  /** G3 — the top-up destination. Present + can't-afford + not disabled → the pre-emptive NOT-ENOUGH state. */
  onTopUp?: () => void;
  disabled?: boolean;
  /** the note line under the balance (e.g. "spends pixels instantly" / the offline reason). */
  note?: string;
  holdMs?: number;
  /** the action verb — 'BUY' (cosmetics) or 'ADOPT' (a community card); one shared grammar, one knob. */
  verb?: 'BUY' | 'ADOPT';
}) {
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const [confirming, setConfirming] = useState(false);

  // Drop out of the inline confirm if the item/price changes or the key sleeps (a short bridge opened),
  // so a stale "CONFIRM" can never spend against a changed price or a disabled key.
  useEffect(() => {
    if (disabled) setConfirming(false);
  }, [disabled, price]);

  const label = `${price} PX`;
  const verbLower = verb === 'ADOPT' ? 'adopt' : 'buy';
  const verbTitle = verb === 'ADOPT' ? 'Adopt' : 'Buy';
  // G3 — pre-emptive can't-afford: never offer the hold, show NOT-ENOUGH + the inline top-up door.
  const cantAfford = !disabled && onTopUp !== undefined && balance < price;

  const handleBuy = useCallback(() => {
    setConfirming(false);
    onBuy();
  }, [onBuy]);

  return (
    <View style={styles.bar}>
      {/* ruling 4 — the balance reads PROMINENTLY: its own clear line near the action, a gold-marked count
          at title size (F-06 15) so it's plainly legible before committing to a hold. Suppressed in the
          can't-afford state (the NOT-ENOUGH line states the balance there). */}
      {!cantAfford ? (
        <View style={styles.balanceLine} accessibilityLabel={`You have ${balance} pixels`}>
          <Text style={styles.balanceLabel}>YOU HAVE</Text>
          <Text style={styles.balanceValue}>{balance}</Text>
          <PixelsMark size={14} />
        </View>
      ) : null}

      {/* the note / spend-prompt line — while confirming, it becomes the spend prompt. */}
      {confirming ? (
        <Text style={styles.noteText}>Spend {price} PX — pixels are spent instantly.</Text>
      ) : note ? (
        <Text style={styles.noteText}>{note}</Text>
      ) : null}

      {cantAfford ? (
        // G3 — the uniform can't-afford state: no hold, the shortfall + a TOP UP door inline.
        <View style={styles.shortWrap}>
          <View style={styles.shortLine}>
            <Text style={styles.shortText}>NOT ENOUGH </Text>
            <PixelsMark size={11} />
            <Text style={styles.shortText}> — YOU HAVE {balance}</Text>
          </View>
          <ScreenButton
            label="Top up"
            variant="add"
            size="mini"
            icon={<PixelsMark size={11} />}
            onPress={onTopUp}
          />
        </View>
      ) : reduceMotion ? (
        // OQ-046 accessible alt — a single press flips to an INLINE confirm (no hold, no nested sheet). The
        // keys are HoldFillButtons (immediate-press under reduce-motion), so they wear the same stepped face.
        confirming ? (
          <View style={styles.confirmRow}>
            <View style={styles.confirmCell}>
              <HoldFillButton
                label="CANCEL"
                accessibilityLabel="Cancel"
                tone="cream"
                onComplete={() => setConfirming(false)}
                block
              />
            </View>
            <View style={styles.confirmCell}>
              <HoldFillButton
                label={`CONFIRM · ${label}`}
                accessibilityLabel={`Confirm ${verbLower} for ${label}`}
                tone="gold"
                onComplete={handleBuy}
                block
              />
            </View>
          </View>
        ) : (
          <HoldFillButton
            label={`${verb} · ${label}`}
            accessibilityLabel={`${verbTitle} for ${label}`}
            tone="gold"
            onComplete={() => setConfirming(true)}
            disabled={disabled}
            block
          />
        )
      ) : (
        // G2 — the free-standing filling hold key (the shared stepped primitive).
        <HoldFillButton
          label={`HOLD TO ${verb} · ${label}`}
          accessibilityLabel={`Hold to ${verbLower} for ${label}`}
          onComplete={handleBuy}
          disabled={disabled}
          holdMs={holdMs}
          tone="gold"
          block
        />
      )}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  // F-21 ruling 2 — UNBOXED: a plain vertical stack, no border/panel container. The parent surface
  // (PulledSheet body, KeepBar wrap) owns horizontal padding, so the block key spans the content width.
  bar: { gap: t.space.md },
  // ruling 4 — the prominent balance line: "YOU HAVE" (dim body) + a gold count (title 15) + the mark.
  balanceLine: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  balanceLabel: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 1 },
  balanceValue: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.value, letterSpacing: 0.5 },
  noteText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
  // the reduce-motion two-step keys share a row (CANCEL · CONFIRM), each stretching to half the width.
  confirmRow: { flexDirection: 'row', gap: t.space.md },
  confirmCell: { flex: 1 },
  // G3 — the pre-emptive can't-afford cluster (F-02 gold voice on the shortfall glyph, not alert-red).
  shortWrap: { alignItems: 'flex-end', gap: t.space.sm },
  shortLine: { flexDirection: 'row', alignItems: 'center' },
  shortText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.value, letterSpacing: 0.8 },
}));
