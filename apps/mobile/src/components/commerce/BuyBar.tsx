import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import { ConfirmSheet } from '../ConfirmSheet';
import { PixelsMark } from './PixelsMark';

// BuyBar (component-map §7 · design-spec §2.3 motion.holdToBuy · OQ-046) — the item-sheet spend bar. THE
// LAUNCH GATE ships BOTH buy paths:
//   • HOLD-TO-BUY (default) — the gold keycap sits PRESSED (F-03 held = darkened fill, NO motion) for a
//     ~rated hold; completing the hold spends; releasing early cancels (nothing spent).
//   • THE NON-HOLD ACCESSIBLE ALT (OQ-046) — under OS reduce-motion the keycap is a single PRESS →
//     ConfirmSheet, so a timed gesture never gates a motor-impaired user. (ASSUMPTION: reduce-motion is
//     the a11y trigger today; a dedicated "confirm with a tap" toggle can replace it when Settings lands.)
// Both funnel to the same `onBuy`. `disabled` sleeps the key (offline / the P5 bridge short state).
export const HOLD_MS = 650;

export function BuyBar({
  price,
  balance,
  onBuy,
  disabled = false,
  note,
  holdMs = HOLD_MS,
}: {
  price: number;
  balance: number;
  onBuy: () => void;
  disabled?: boolean;
  /** the second bb-meta line (e.g. "spends pixels instantly" / the offline reason). */
  note?: string;
  holdMs?: number;
}) {
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const [holding, setHolding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => clear, [clear]);

  const startHold = useCallback(() => {
    if (disabled) return;
    setHolding(true);
    clear();
    timer.current = setTimeout(() => {
      setHolding(false);
      timer.current = null;
      onBuy();
    }, holdMs);
  }, [disabled, clear, holdMs, onBuy]);

  const cancelHold = useCallback(() => {
    clear();
    setHolding(false);
  }, [clear]);

  const label = `${price} PX`;

  return (
    <View style={styles.bar}>
      <View style={styles.meta}>
        <Text style={styles.have}>YOU HAVE {balance} PX</Text>
        {note ? <Text style={styles.noteText}>{note}</Text> : null}
      </View>
      <View style={styles.spacer} />
      {reduceMotion ? (
        // OQ-046 accessible alt — a single press opens the confirm (no hold).
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buy for ${label}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => setConfirming(true)}
          style={[styles.buy, disabled && styles.buyDisabled]}
        >
          <Text style={styles.buyText}>BUY · {label}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hold to buy for ${label}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPressIn={startHold}
          onPressOut={cancelHold}
          style={[styles.buy, holding && styles.buyHolding, disabled && styles.buyDisabled]}
        >
          <Text style={styles.buyText}>HOLD TO BUY · {label}</Text>
        </Pressable>
      )}
      <ConfirmSheet
        visible={confirming}
        title="BUY THIS?"
        message={`Spend ${price} PX for this item. You have ${balance} PX — pixels are spent instantly.`}
        confirmLabel={`Confirm · ${label}`}
        tone="purchase"
        onConfirm={() => {
          setConfirming(false);
          onBuy();
        }}
        onClose={() => setConfirming(false)}
      />
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
  // F-03 held = pressed (darkened fill, NO motion) — the board's `.btn.buy.holding`.
  buyHolding: { backgroundColor: '#e0b933' },
  buyDisabled: { opacity: 0.4 },
  buyText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.goldInk, letterSpacing: 1 },
}));
