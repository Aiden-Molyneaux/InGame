import { Tabs } from 'expo-router';

// The (tabs) group. Fix #1 hoisted the DeviceShell + NavBand to the ROOT layout, so the shell frames
// this group the same as every other screen and the NavBand (root ShellNav) drives navigation. The
// Tabs navigator is kept only to preserve each tab's state across switches; its own tab bar is
// suppressed (the shell's NavBand IS the tab bar now). M2 wires COLLECTION + PROFILE.
export default function TabsLayout() {
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
