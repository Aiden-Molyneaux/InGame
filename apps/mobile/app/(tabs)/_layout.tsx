import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { preloadComposedCard } from '../../src/components/CardFace';

// The (tabs) group. Fix #1 hoisted the DeviceShell + NavBand to the ROOT layout, so the shell frames
// this group the same as every other screen and the NavBand (root ShellNav) drives navigation. The
// Tabs navigator is kept only to preserve each tab's state across switches; its own tab bar is
// suppressed (the shell's NavBand IS the tab bar now). M2 wires COLLECTION + PROFILE.
export default function TabsLayout() {
  // Warm the skia card renderer while the shelf data is still in flight — otherwise the first
  // Collection paint flashes default faces that snap to their compositions a beat later (gate-5 A.1).
  useEffect(() => {
    void preloadComposedCard();
  }, []);
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => null}
    >
      <Tabs.Screen name="collection" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
