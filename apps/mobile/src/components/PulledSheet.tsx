import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Keyboard, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { theme } from '../theme';
import { KeyboardLift } from './KeyboardLift';

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
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const slide = useRef(new Animated.Value(0)).current; // 0 = off-stage, 1 = docked
  const [wellTopY, setWellTopY] = useState<number | undefined>(undefined);
  const overlayRef = useRef<View>(null);

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss(); // the trigger screen's focused field must not type behind the scrim
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
        <Animated.View style={[styles.scrim, { opacity: slide }]} />
      </Pressable>
      {/* the 75% cap lives on the LIFT WRAPPER (a definite % of the overlay) — on the sheet itself
          it resolves against the auto-sized wrapper and strands a dead band under the sheet */}
      <KeyboardLift style={styles.liftSlot} minTopY={wellTopY}>
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
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardLift>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, // the routed screen area INSIDE the well — not the OS window
    justifyContent: 'flex-end',
  },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  liftSlot: { maxHeight: '75%' },
  sheet: {
    backgroundColor: theme.scr.panel,
    borderTopWidth: 1,
    borderTopColor: theme.scr.hairline,
    flexShrink: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    marginTop: theme.space.md,
    backgroundColor: theme.scr.faint,
  },
  body: { padding: theme.space.xl, gap: theme.space.xl },
});
