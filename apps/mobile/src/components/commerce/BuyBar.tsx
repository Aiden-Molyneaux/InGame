import { useCallback, useEffect, useState } from 'react';
import { Pressable, View, Text } from 'react-native';
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
  /** the second bb-meta line (e.g. "spends pixels instantly" / the offline reason). */
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
  // G3 — pre-emptive can't-afford: never offer the hold, show NOT-ENOUGH + the inline top-up door.
  const cantAfford = !disabled && onTopUp !== undefined && balance < price;

  const handleBuy = useCallback(() => {
    setConfirming(false);
    onBuy();
  }, [onBuy]);

  return (
    <View style={styles.bar}>
      <View style={styles.meta}>
        <Text style={styles.have}>YOU HAVE {balance} PX</Text>
        {/* while confirming, the note becomes the spend prompt (the ConfirmSheet's old `message`). */}
        {confirming ? (
          <Text style={styles.noteText}>Spend {price} PX — pixels are spent instantly.</Text>
        ) : note ? (
          <Text style={styles.noteText}>{note}</Text>
        ) : null}
      </View>
      <View style={styles.spacer} />

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
        // OQ-046 accessible alt — a single press flips to an INLINE confirm (no hold, no nested sheet).
        confirming ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setConfirming(false)}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Confirm ${verbLower} for ${label}`}
              onPress={handleBuy}
              style={styles.buy}
            >
              <Text style={styles.buyText}>CONFIRM · {label}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${verb === 'ADOPT' ? 'Adopt' : 'Buy'} for ${label}`}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => setConfirming(true)}
            style={[styles.buy, disabled && styles.buyDisabled]}
          >
            <Text style={styles.buyText}>{verb} · {label}</Text>
          </Pressable>
        )
      ) : (
        // G2 — the filling hold key (the shared primitive).
        <HoldFillButton
          label={`HOLD TO ${verb} · ${label}`}
          accessibilityLabel={`Hold to ${verbLower} for ${label}`}
          onComplete={handleBuy}
          disabled={disabled}
          holdMs={holdMs}
          tone="gold"
        />
      )}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: t.scr.bg,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  meta: { gap: 2, flexShrink: 1 },
  have: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  noteText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
  spacer: { flex: 1 },
  buy: {
    backgroundColor: t.brand.gold,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
  },
  buyDisabled: { opacity: 0.4 },
  buyText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.goldInk, letterSpacing: 1 },
  // G3 — the pre-emptive can't-afford cluster (F-02 gold voice on the shortfall glyph, not alert-red).
  shortWrap: { alignItems: 'flex-end', gap: t.space.sm },
  shortLine: { flexDirection: 'row', alignItems: 'center' },
  shortText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.value, letterSpacing: 0.8 },
  // the inline-confirm CANCEL — the safe/secondary weight beside the gold CONFIRM.
  cancel: {
    backgroundColor: t.scr.key,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    ...(t.scr.isLight ? { borderWidth: 1, borderColor: t.scr.dim } : null),
  },
  cancelText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.navy, letterSpacing: 1 },
}));
