import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import { PixelsMark } from './PixelsMark';

// BuyBar (component-map §7 · design-spec §2.3 motion.holdToBuy · OQ-046) — the item-sheet spend bar. THE
// LAUNCH GATE ships BOTH buy paths:
//   • HOLD-TO-BUY (default) — the gold keycap sits PRESSED (F-03 held = darkened fill, NO motion) for a
//     ~rated hold; completing the hold spends; releasing early cancels (nothing spent).
//   • THE NON-HOLD ACCESSIBLE ALT (OQ-046) — under OS reduce-motion a single PRESS flips the keycap to
//     an INLINE two-step confirm (CANCEL · CONFIRM), so a timed gesture never gates a motor-impaired
//     user. (ASSUMPTION: reduce-motion is the a11y trigger today; a dedicated "confirm with a tap"
//     toggle can replace it when Settings lands.)
//   F-8 (E3-C3): the confirm is INLINE (rendered inside the bar), NOT a nested ConfirmSheet. The BuyBar
//   lives INSIDE a PulledSheet (ItemSheet/ReconcileSheet/KeepBar), and a PulledSheet is an absolute
//   overlay that fills its PARENT — so a ConfirmSheet mounted from here filled only the item-sheet body
//   and rendered half-open, stacked inside it (uninteractable; the launch-gate a11y flow was broken).
//   An inline confirm needs no second overlay, so it renders fully and works from within the open sheet
//   (and removes the nested scrim the PackTile BEST-RATE ribbon was escaping — E3-B2b). The house
//   root-hoist pattern (decision 0040 D.27) still owns confirms that AREN'T born inside another sheet.
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

  // Drop out of the inline confirm if the item/price changes or the key sleeps (a short bridge opened),
  // so a stale "CONFIRM" can never spend against a changed price or a disabled key.
  useEffect(() => {
    if (disabled) setConfirming(false);
  }, [disabled, price]);

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
        {/* while confirming, the note becomes the spend prompt (the ConfirmSheet's old `message`). */}
        {confirming ? (
          <Text style={styles.noteText}>Spend {price} PX — pixels are spent instantly.</Text>
        ) : note ? (
          <Text style={styles.noteText}>{note}</Text>
        ) : null}
      </View>
      <View style={styles.spacer} />
      {reduceMotion ? (
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
              accessibilityLabel={`Confirm buy for ${label}`}
              onPress={() => {
                setConfirming(false);
                onBuy();
              }}
              style={styles.buy}
            >
              <Text style={styles.buyText}>CONFIRM · {label}</Text>
            </Pressable>
          </>
        ) : (
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
        )
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
  // the inline-confirm CANCEL — the safe/secondary weight beside the gold CONFIRM (mirrors the
  // ConfirmSheet grammar: cancel is quiet, the spend is the loud gold key).
  cancel: {
    backgroundColor: t.scr.key,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    ...(t.scr.isLight ? { borderWidth: 1, borderColor: t.scr.dim } : null),
  },
  cancelText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.navy, letterSpacing: 1 },
}));
