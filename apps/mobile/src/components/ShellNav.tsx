import { usePathname, useRouter } from 'expo-router';
import { NavBand, type NavTab } from './NavBand';

// ShellNav — the router-aware wrapper that lets the ROOT-mounted NavBand (component-map §5.1) drive
// tab navigation from the persistent DeviceShell. Because the shell now frames EVERY screen, the
// NavBand derives its state from the current route instead of a Tabs `tabBar`:
//   • pre-auth (sign-in / index / splash) ⇒ `locked` (gray, non-interactive) — component-map §5.1;
//   • in the app (a built tab route) ⇒ active, and a keypress navigates via the router.
// M2 wires COLLECTION + PROFILE; DISCOVER · STORE · FRIENDS are shown but inert (screens are M3+).

const ORDER = ['collection', 'discover', 'store', 'friends', 'profile'] as const;

const LABELS: Record<string, { label: string; accent?: NavTab['accent'] }> = {
  collection: { label: 'COLLECT', accent: 'collection' },
  discover: { label: 'DISCOVER' },
  store: { label: 'STORE', accent: 'store' },
  friends: { label: 'FRIENDS' },
  profile: { label: 'PROFILE' },
};

// The built tab routes (the group `(tabs)` is not part of the URL).
const ROUTES: Record<string, '/(tabs)/collection' | '/(tabs)/profile'> = {
  collection: '/(tabs)/collection',
  profile: '/(tabs)/profile',
};

export function ShellNav({ bottomInset = 0 }: { bottomInset?: number }) {
  const pathname = usePathname();
  const router = useRouter();

  const onCollection = pathname.startsWith('/collection');
  const onProfile = pathname.startsWith('/profile');
  const locked = !(onCollection || onProfile); // sign-in, index redirect, splash
  const activeKey = onProfile ? 'profile' : 'collection';

  const tabs: NavTab[] = ORDER.map((key) => ({
    key,
    label: LABELS[key]?.label ?? key.toUpperCase(),
    accent: LABELS[key]?.accent,
    built: key in ROUTES,
  }));

  return (
    <NavBand
      tabs={tabs}
      activeKey={activeKey}
      locked={locked}
      bottomInset={bottomInset}
      onSelect={(key) => {
        const route = ROUTES[key];
        if (route) router.navigate(route);
      }}
    />
  );
}
