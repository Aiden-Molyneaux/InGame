import { usePathname, useRouter } from 'expo-router';
import { NavBand, type NavTab } from './NavBand';

// ShellNav — the router-aware wrapper that lets the ROOT-mounted NavBand (component-map §5.1) drive
// tab navigation from the persistent DeviceShell. Because the shell now frames EVERY screen, the
// NavBand derives its state from the current route instead of a Tabs `tabBar`:
//   • pre-auth (sign-in / index / splash) ⇒ `locked` (gray, non-interactive) — component-map §5.1;
//   • in the app (a built tab route) ⇒ active, and a keypress navigates via the router.
// M2 wires COLLECTION + PROFILE; DISCOVER · STORE · FRIENDS are shown but inert (screens are M3+).

// TEMP (owner experiment 2026-07-06): hide the outside key labels and tighten the band so the app
// content reclaims that vertical space. Flip back to `true` (or drop the prop) to restore the
// labelled NavBand.
const SHOW_NAV_LABELS = false;

// Key order per the canonical NavBand on every mockup board: STORE · DISCOVER · COLLECTION (the
// centre/hero key) · PROFILE · FRIENDS.
const ORDER = ['store', 'discover', 'collection', 'profile', 'friends'] as const;

const LABELS: Record<string, { label: string; accent?: NavTab['accent'] }> = {
  collection: { label: 'COLLECTION', accent: 'collection' }, // full name — the label rides OUTSIDE the cap now
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

  // Add-game, the Game page (`/game/:id`, CARD-23 NAVIGATE target) AND the Styler (`/styler/:gameId`,
  // §3.2) are FlowTakeovers OF Collection (board: NavBand untouched, COLLECTION keycap active) — the
  // nav stays live and a keypress switches tabs, it is NOT locked. All count as Collection context.
  const onCollection =
    pathname.startsWith('/collection') ||
    pathname.startsWith('/add-game') ||
    pathname.startsWith('/game') ||
    pathname.startsWith('/styler');
  // The Device editor (`/device`, §3.5) is a FlowTakeover OF Profile (board: NavBand untouched, PROFILE
  // keycap active) — the nav stays live, it is NOT locked.
  const onProfile = pathname.startsWith('/profile') || pathname.startsWith('/device');
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
      showLabels={SHOW_NAV_LABELS}
      onSelect={(key) => {
        const route = ROUTES[key];
        if (route) router.navigate(route);
      }}
    />
  );
}
