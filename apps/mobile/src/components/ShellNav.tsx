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

// The built tab routes (the group `(tabs)` is not part of the URL). STORE (§P6, M5) is a top-level
// route (`/store`) — the app's permanent commerce door, gold keycap — reached from any tab.
const ROUTES: Record<string, '/(tabs)/collection' | '/(tabs)/profile' | '/(tabs)/friends' | '/store'> = {
  collection: '/(tabs)/collection',
  profile: '/(tabs)/profile',
  friends: '/(tabs)/friends',
  store: '/store',
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
  // keycap active) — the nav stays live, it is NOT locked. The Contributor profile (`/contributor/:id`,
  // P13 §4.9) is reached FROM a profile and its board draws PROFILE-active on every state (parvati F2 —
  // it previously fell through to `locked`).
  const onProfile =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/device') ||
    pathname.startsWith('/contributor');
  // The FRIENDS cluster (P8 §3.3 + P9 §4.6/§2.2) — the FRIENDS tab itself (`/friends`), the Find/Add hub
  // + its sub-flows (`/add-friends`, `/invite-friends`, `/friend-requests`, the SOC-10 `/invite/:token`
  // landing), and the friend-view cluster (`/user/:id` + its Collection/entry, `/compare/:friendId`) all
  // belong here: their boards draw FRIENDS-active. FRIENDS is NOW a routable tab (P8) — the keycap is
  // active and navigates. The nav is NOT locked (that's pre-auth only).
  const onFriends =
    pathname.startsWith('/friends') || // /friends (tab) + /friends-roster
    pathname.startsWith('/friend-requests') ||
    pathname.startsWith('/add-friends') ||
    pathname.startsWith('/invite') || // /invite-friends + /invite/:token
    pathname.startsWith('/user') ||
    pathname.startsWith('/compare');
  // The Store (`/store`, §P6) — its own destination; Top Up + Wallet are in-screen sub-views (the STORE
  // keycap stays active throughout, the device-editor FlowTakeover precedent).
  const onStore = pathname.startsWith('/store');
  const locked = !(onCollection || onProfile || onStore || onFriends); // sign-in, index redirect, splash
  const activeKey = onStore ? 'store' : onFriends ? 'friends' : onProfile ? 'profile' : 'collection';

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
        if (!route) return;
        // Misc-1 — the STORE keycap ALWAYS returns to the storefront: bump a fresh `k` so the store route
        // resets any in-screen sub-view (wallet / top-up / aisle) back to browse (the store reads `k` and
        // snaps to browse when it changes). The counter's ?view= deep links don't pass through here, so
        // they keep working. Other tabs navigate plainly.
        if (key === 'store') router.navigate(`/store?k=${Date.now()}`);
        else router.navigate(route);
      }}
    />
  );
}
