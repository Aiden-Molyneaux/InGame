import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, type ViewStyle } from 'react-native';
import { themedStyles, useTheme } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import { announce } from '../../a11y/announce';
import { ScreenButton } from '../ScreenButton';

// Toast (component-map §5.6 · design-spec §1.6) — the TRANSIENT feedback banner: a save/publish/purchase
// failed (with a plain-words reassurance + an orange RETRY where safe to repeat) OR a light confirmation
// (a SEND landed). Full-bleed, slides in under the header (design-spec anchor; `anchor="bottom"` +
// `bottomInset` for a safe-area-aware bottom posture — the P5 packet's note). ONE at a time: a host
// renders a single Toast and swaps its `message`. Auto-dismisses (fake-timer testable); the slide honours
// reduce-motion (CARD-16 / decision 0044 §104 — instant, no travel). Announces on show (§105 live-region).
export type ToastTone = 'info' | 'success' | 'error';

export function Toast({
  message,
  tone = 'info',
  onRetry,
  onDismiss,
  retryLabel = 'Retry',
  duration,
  anchor = 'top',
  bottomInset = 0,
  style,
}: {
  message: string;
  tone?: ToastTone;
  /** Failure-only: the orange RETRY (RTK `refetch`/re-submit). Sets a longer default dwell. */
  onRetry?: () => void;
  /** Called on auto-dismiss and on the ✕ tap. The host clears its toast state here. */
  onDismiss?: () => void;
  retryLabel?: string;
  /** Auto-dismiss ms. Default: 3500 (info/success · error w/o retry), 6000 (error w/ retry). `0` = sticky. */
  duration?: number;
  /** `top` (default) slides under the header; `bottom` docks above the safe-area. */
  anchor?: 'top' | 'bottom';
  /** Safe-area bottom inset applied when `anchor="bottom"` (host passes its inset). */
  bottomInset?: number;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const slide = useRef(new Animated.Value(0)).current; // 0 = off-stage, 1 = docked

  const dwell = duration ?? (onRetry ? 6000 : 3500);

  // Announce + slide in on mount; the toast is unmounted by the host (visibility is the host's state),
  // so a fresh mount per message keeps this a simple one-shot.
  useEffect(() => {
    announce(message);
    if (reduce) {
      slide.setValue(1);
      return;
    }
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [message, reduce, slide]);

  // Auto-dismiss timer (skipped when sticky). Cleared on unmount / message change.
  useEffect(() => {
    if (dwell <= 0 || !onDismiss) return;
    const id = setTimeout(onDismiss, dwell);
    return () => clearTimeout(id);
  }, [dwell, onDismiss, message]);

  const stripe = tone === 'error' ? t.scr.accent : tone === 'success' ? t.brand.success : t.scr.dim;
  const fromEdge = anchor === 'top' ? -24 : 24;

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.banner,
        anchor === 'top' ? styles.top : [styles.bottom, { paddingBottom: bottomInset + 12 }],
        { borderLeftColor: stripe },
        {
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [fromEdge, 0] }) }],
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.message}>{message}</Text>
        {onRetry ? <ScreenButton label={retryLabel} variant="action-alt" size="mini" onPress={onRetry} /> : null}
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.close}>
            <Text style={styles.closeIc}>✕</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const useStyles = themedStyles((t) => ({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: t.scr.panelHi,
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: t.scr.hairline,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.lg,
  },
  top: { top: 0 },
  bottom: { bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  message: {
    flex: 1,
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11 (F-06)
    color: t.scr.ink,
    letterSpacing: 0.4,
  },
  close: { paddingHorizontal: t.space.xs },
  closeIc: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim },
}));
