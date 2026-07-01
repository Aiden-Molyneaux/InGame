import { Tabs } from 'expo-router';
import { DeviceShell } from '../../src/components/DeviceShell';
import { NavBand, type NavTab } from '../../src/components/NavBand';

// The tab-nav SHELL (component-map §5.1). The DeviceShell plastic frames the Midnight screen; the
// NavBand (5 keys) is the custom tab bar. M2 wires COLLECTION + PROFILE; DISCOVER · STORE · FRIENDS
// are shown but inert placeholders (their screens are M3+). F-04: the 5 keys stay legible.

interface MinimalTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

const ORDER = ['collection', 'discover', 'store', 'friends', 'profile'];
const LABELS: Record<string, { label: string; accent?: NavTab['accent'] }> = {
  collection: { label: 'COLLECT', accent: 'collection' },
  discover: { label: 'DISCOVER' },
  store: { label: 'STORE', accent: 'store' },
  friends: { label: 'FRIENDS' },
  profile: { label: 'PROFILE' },
};

function TabBar({ state, navigation }: MinimalTabBarProps) {
  const realNames = new Set(state.routes.map((r) => r.name));
  const activeKey = state.routes[state.index]?.name ?? 'collection';
  const tabs: NavTab[] = ORDER.map((key) => ({
    key,
    label: LABELS[key]?.label ?? key.toUpperCase(),
    accent: LABELS[key]?.accent,
    built: realNames.has(key),
  }));
  return (
    <NavBand
      tabs={tabs}
      activeKey={activeKey}
      onSelect={(key) => {
        if (realNames.has(key)) navigation.navigate(key);
      }}
    />
  );
}

export default function TabsLayout() {
  return (
    <DeviceShell>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <TabBar
            state={props.state as unknown as MinimalTabBarProps['state']}
            navigation={props.navigation as unknown as MinimalTabBarProps['navigation']}
          />
        )}
      >
        <Tabs.Screen name="collection" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </DeviceShell>
  );
}
