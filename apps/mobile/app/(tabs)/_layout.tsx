import { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { preloadComposedCard } from '../../src/components/CardFace';
import { useAppSelector } from '../../src/store/hooks';

// The (tabs) group. Fix #1 hoisted the DeviceShell + NavBand to the ROOT layout, so the shell frames
// this group the same as every other screen and the NavBand (root ShellNav) drives navigation. The
// Tabs navigator is kept only to preserve each tab's state across switches; its own tab bar is
// suppressed (the shell's NavBand IS the tab bar now). M2 wires COLLECTION + PROFILE.
export default function TabsLayout() {
  // AUTH-09 belt-and-braces (owner ruling 2026-07-19): the usernamePending wall stands at EVERY tabs
  // entry, not just app/index.tsx — a deep link straight into /(tabs)/… cannot skip it. Only walls
  // when the pending state is KNOWN true (the fail-open /me posture stays index.tsx's concern).
  const usernamePending = useAppSelector((s) => s.auth.user?.usernamePending === true);
  // Warm the skia card renderer while the shelf data is still in flight — otherwise the first
  // Collection paint flashes default faces that snap to their compositions a beat later (gate-5 A.1).
  useEffect(() => {
    void preloadComposedCard();
  }, []);
  if (usernamePending) return <Redirect href="/choose-username" />;
  return (
    <Tabs
      // R5 (P6 §6 row 4) — the tabs are the app's PERMANENT query subscribers (they never unmount,
      // by design, and each holds shelf/profile/discover subscriptions): freezeOnBlur stops a
      // blurred tab re-rendering on every RTK invalidation (the R2 fan-out) — renders defer and
      // catch up on refocus. Blur-time cleanups (Keyboard.dismiss) fire on the blur event BEFORE the
      // freeze, and timers/effects keep running — only rendering pauses.
      // walk-5 (owner ruling, product-spec 0.70): the COL-12 blur-time FLIP RESET IS GONE — a flipped
      // card STAYS in the state the user left it across tab switches. So the flip-back-on-return beat
      // this comment used to warn about no longer exists: freeze has nothing to defer there.
      screenOptions={{ headerShown: false, freezeOnBlur: true }}
      tabBar={() => null}
    >
      <Tabs.Screen name="collection" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="friends" />
      {/* P10 — DISCOVER goes live (the 5th nav key; §2.7). State-preserving like the others. */}
      <Tabs.Screen name="discover" />
    </Tabs>
  );
}
