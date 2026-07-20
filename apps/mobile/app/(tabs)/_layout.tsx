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
      screenOptions={{ headerShown: false }}
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
