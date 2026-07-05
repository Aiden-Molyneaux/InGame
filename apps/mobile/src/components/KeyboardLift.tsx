import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform, View, type KeyboardEvent, type ViewStyle } from 'react-native';

// KeyboardLift (M3-R R0-2 · S3-l/S4-d) — lifts bottom-docked content above the soft keyboard,
// FRAME-AWARE. RN's KeyboardAvoidingView measures against the OS window, but everything in this
// app renders inside the DeviceShell's screen well (~130px of plastic sits between the well bottom
// and the window bottom), so KAV chronically mis-lifts (the S4-d bug). This instead measures the
// wrapped content's REAL window position and translates by the actual overlap:
//   lift = max(0, contentBottomY − keyboardTopY)   (clamped so the content top never rises above
//   `minTopY`, when given — a sheet near its 75% cap must not clip out of the screen well)
// Structure: the OUTER plain View is the measuring anchor — it sits outside the transform, so
// measureInWindow always reports the UNTRANSLATED footprint (translation doesn't affect layout).
// That sidesteps the Paper-vs-Fabric question of whether measure sees an in-flight native-driver
// transform, and makes re-fires-while-lifted (keyboard type switches) exact instead of compensated.
// iOS: `keyboardWillChangeFrame` covers show + hide + height changes in one listener (hide reports
// keyboardTop = screen bottom → overlap 0 → settles home). Android: Did-show/hide fire AFTER any
// adjustResize, so a resized window self-corrects to lift 0. Web: keyboard events never fire →
// natural no-op. Mounting UNDER an already-open keyboard (sheet opened while a field was focused)
// is seeded from Keyboard.metrics() — events alone would never fire for it.
export function KeyboardLift({
  children,
  style,
  minTopY,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Window-Y the lifted content's TOP must not rise above (e.g. the screen well's top). */
  minTopY?: number;
}) {
  const lift = useRef(new Animated.Value(0)).current;
  const anchorRef = useRef<View>(null);
  const minTopRef = useRef(minTopY);
  minTopRef.current = minTopY;

  useEffect(() => {
    const settleFor = (kbTop: number, duration: number) => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      anchor.measureInWindow((_x, y, _w, h) => {
        const overlap = Math.max(0, y + h - kbTop);
        const cap = minTopRef.current === undefined ? overlap : Math.max(0, y - minTopRef.current);
        Animated.timing(lift, {
          toValue: -Math.min(overlap, cap),
          duration,
          useNativeDriver: true,
        }).start();
      });
    };
    const onFrame = (e: KeyboardEvent) =>
      settleFor(e.endCoordinates.screenY, e.duration && e.duration > 0 ? e.duration : 220);
    const onHide = (e: KeyboardEvent | undefined) =>
      Animated.timing(lift, {
        toValue: 0,
        duration: e?.duration && e.duration > 0 ? e.duration : 200,
        useNativeDriver: true,
      }).start();

    const subs =
      Platform.OS === 'ios'
        ? [Keyboard.addListener('keyboardWillChangeFrame', onFrame)]
        : [Keyboard.addListener('keyboardDidShow', onFrame), Keyboard.addListener('keyboardDidHide', onHide)];

    // Mounted under an ALREADY-OPEN keyboard (no event will fire): seed from current metrics.
    const metrics = Keyboard.isVisible?.() ? Keyboard.metrics?.() : undefined;
    if (metrics) settleFor(metrics.screenY, 220);

    return () => subs.forEach((s) => s.remove());
  }, [lift]);

  return (
    <View ref={anchorRef} collapsable={false} style={style}>
      {/* flexShrink keeps the transform layer inside the anchor's maxHeight cap (translation
          doesn't affect layout, but height flows through this layer). NOTE: this layer survives
          Android view-flattening ONLY because its style always carries a transform — if that ever
          becomes conditional, add collapsable={false} here (the anchor's doesn't protect it). */}
      <Animated.View style={{ transform: [{ translateY: lift }], flexShrink: 1, minHeight: 0 }}>
        {children}
      </Animated.View>
    </View>
  );
}
