import { usePathname, useRouter } from 'expo-router';
import { NavBand, type NavTab } from './NavBand';
import { useAppSelector } from '../store/hooks';

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
const ROUTES: Record<string, '/(tabs)/collection' | '/(tabs)/profile' | '/(tabs)/friends' | '/(tabs)/discover' | '/store'> = {
  collection: '/(tabs)/collection',
  profile: '/(tabs)/profile',
  friends: '/(tabs)/friends',
  // P10 — DISCOVER goes LIVE (design-spec §2.7 — the keycap is active on every Discover artboard). The
  // 5th routable tab (peer of COLLECTION/PROFILE/FRIENDS; STORE stays the top-level commerce door).
  discover: '/(tabs)/discover',
  store: '/store',
};

export function ShellNav({ bottomInset = 0 }: { bottomInset?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  // walk2 B13 — the legal screens (`/legal/*`) are AUTH-AMBIENT: reached pre-auth from the create-account
  // acceptance links (nav LOCKED — the pre-auth state) AND signed-in from Settings → ABOUT & LEGAL (nav
  // LIVE, PROFILE-active — the Settings sub-surface they were opened from). Route-only predicates can't
  // tell the two apart, so /legal is gated on the LIVE auth state: signed-in ⇒ the Profile cluster;
  // signed-out ⇒ falls through to `locked`. Gating on the token means the pre-auth lock CANNOT regress —
  // an unauthed visitor on any /legal route still gets the locked band.
  const authed = useAppSelector((s) => s.auth.accessToken != null);

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
  // The self Achievements trophy case (`/achievements`, P11 §4.10) is a Profile sub-surface (the board
  // draws PROFILE-active on every state; reached from the self-Profile teaser). The FRIEND achievements
  // view is `/user/:id/achievements` and rides the /user cluster (FRIENDS-active, below) — consistent
  // with the friend profile/collection it's reached from.
  // Settings (`/settings` + `/settings/blocked`, P12 §0.10) is a Profile sub-surface — reached from the
  // Profile header gear; the board draws PROFILE-active with the NavBand live (parvati C2 — the same
  // fell-through-to-`locked` class as contributor/F2).
  const onProfile =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/device') ||
    pathname.startsWith('/contributor') ||
    pathname.startsWith('/achievements') ||
    pathname.startsWith('/settings') ||
    (pathname.startsWith('/legal') && authed); // walk2 B13 — authed legal = a Settings sub-surface

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
  // DISCOVER (`/discover`, P10 §0.8) — the WTP screen; the two rooms (UP NEXT ↔ DISCOVER) are an
  // in-screen SectionSwitch, not routes, so the keycap stays active across the toggle.
  const onDiscover = pathname.startsWith('/discover');
  const locked = !(onCollection || onProfile || onStore || onFriends || onDiscover); // sign-in, index redirect, splash
  const activeKey = onStore ? 'store' : onDiscover ? 'discover' : onFriends ? 'friends' : onProfile ? 'profile' : 'collection';

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
