import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { themedStyles } from '../theme';
import { useReducedMotion } from '../a11y/useReducedMotion';
import { KeyboardLift } from './KeyboardLift';
import { ScrollLockContext, useScrollLockHost } from './ScrollLock';

// PulledSheet (component-map §5.7) — the GRAB-HANDLE bottom drawer (sort/filter, log-hours, store
// detail). One primitive; scrim tap dismisses.
//
// M3-R R0-1 (S3-b): renders as an IN-SCREEN OVERLAY, never a root RN `Modal` — a Modal mounts at
// the OS-window level and escapes the device frame entirely (the drawer visibly opened from the
// iPhone's bottom edge, outside the plastic). As an absolute overlay it fills the routed screen
// inside the Midnight well and clips to its rounded corners, exactly like the mockup's in-screen
// drawer. Contract: consumers mount it at their SCREEN ROOT (a sibling of the scroll, never inside
// one) — every current consumer already does.
// R0-2 (S3-l): opening the sheet DISMISSES any open keyboard (a field behind the scrim must not
// keep receiving keystrokes), and a field inside the sheet lifts it above the keyboard via
// KeyboardLift — clamped to the overlay's top so a near-cap sheet can't clip out of the well.
// Android hardware back dismisses (the retired Modal used to own that; web has no BackHandler).
// A11y: `role="dialog"` + iOS `accessibilityViewIsModal`. KNOWN GAP: Android TalkBack can still
// traverse the screen behind the scrim (the Modal gave that fencing for free) — a focus trap is
// owed with the §1.6b a11y baseline pass.
export function PulledSheet({
  visible,
  onClose,
  title,
  dimScrim = true,
  maxFraction = 0.75,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  /** Optional page title rendered under the grab handle (R2 0b — e.g. the Log-Hours drawer). */
  title?: string;
  /** false = a transparent (still tap-to-close) scrim — the Canvas EDIT sheet keeps the bed lit
   *  ("no scrim-dim on the work", board P4 / the Styler's no-scrim lesson). Variant, not a fork. */
  dimScrim?: boolean;
  /** cap the sheet to a fraction of the overlay height (default 0.75). The Canvas EDIT/TRANSFORM
   *  drawers pass a smaller value so they "open up to the bottom of the card" and leave the gamecard
   *  visible above them (owner gate-5 note) — a stopgap before the drawer overhaul. */
  maxFraction?: number;
  children: ReactNode;
}) {
  const styles = useStyles();
  // CARD-16/0044 §104 — no slide-in under reduce-motion. Read via a ref (not an effect dep) so a
  // mid-session toggle while a sheet is OPEN doesn't re-run the effect and replay the slide (murr m3).
  const reduceMotion = useReducedMotion();
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const slide = useRef(new Animated.Value(0)).current; // 0 = off-stage, 1 = docked
  const [wellTopY, setWellTopY] = useState<number | undefined>(undefined);
  const overlayRef = useRef<View>(null);
  // a held slider/picker inside the sheet must not scroll the sheet body (round-3 scroll-lock rule)
  const { scrollEnabled, api: scrollLockApi } = useScrollLockHost();

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss(); // the trigger screen's focused field must not type behind the scrim
      if (reduceRef.current) {
        slide.setValue(1); // reduce-motion (0044 §104): dock instantly, no slide/fade
        return;
      }
      slide.setValue(0);
      Animated.timing(slide, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, slide]);

  // Hardware back closes the sheet instead of navigating (parity with the retired Modal).
  // Web-guarded: react-native-web's BackHandler shim console.errors on every subscribe.
  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View
      ref={overlayRef}
      style={styles.overlay}
      onLayout={() => overlayRef.current?.measureInWindow((_x, y) => setWellTopY(y))}
    >
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose}>
        <Animated.View style={[styles.scrim, !dimScrim && styles.scrimClear, { opacity: slide }]} />
      </Pressable>
      {/* the height cap lives on the LIFT WRAPPER (a definite % of the overlay) — on the sheet itself
          it resolves against the auto-sized wrapper and strands a dead band under the sheet */}
      <KeyboardLift style={{ ...styles.liftSlot, maxHeight: `${Math.round(maxFraction * 100)}%` as `${number}%` }} minTopY={wellTopY}>
        <Animated.View
          role="dialog"
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              opacity: slide,
              transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
            },
          ]}
        >
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title.toUpperCase()}</Text> : null}
          {/* `flexShrink:1` (F-8 E3, the Inspect-drawer overspill) — without it the ScrollView keeps
              its FULL content height inside the maxHeight-capped sheet, so tall content (a big card +
              readout + actions, or the new PreviewStage floor) overflowed BELOW the sheet's cap and the
              bottom rows rendered off screen. Shrinking the scroll view to the space the cap leaves
              makes overflow SCROLL within the sheet instead of spilling past it. */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={scrollEnabled}
          >
            <ScrollLockContext.Provider value={scrollLockApi}>{children}</ScrollLockContext.Provider>
          </ScrollView>
        </Animated.View>
      </KeyboardLift>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  overlay: {
    ...StyleSheet.absoluteFillObject, // the routed screen area INSIDE the well — not the OS window
    justifyContent: 'flex-end',
  },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scrimClear: { backgroundColor: 'transparent' },
  liftSlot: { maxHeight: '75%' },
  sheet: {
    backgroundColor: t.scr.panel,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
    flexShrink: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    marginTop: t.space.md,
    backgroundColor: t.scr.faint,
  },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.title, // 15 — the drawer page title (R2 0b)
    color: t.scr.ink,
    letterSpacing: 1,
    paddingHorizontal: t.space.xl,
    paddingTop: t.space.md,
  },
  scroll: { flexShrink: 1 }, // scroll within the sheet's height cap, never overflow past it (F-8 E3)
  body: { padding: t.space.xl, gap: t.space.xl },
}));
