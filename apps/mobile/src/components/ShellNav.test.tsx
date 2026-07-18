import { render } from '@testing-library/react-native';
import { ShellNav } from './ShellNav';

// ShellNav route→NavBand state derivation. The recurring bug class (parvati P13-F2, then C2 on P12):
// a new tier-2 route matching NO predicate falls through to `locked` — the whole NavBand goes inert.
// These tests pin the sub-surface routes to their owning keycap, UNLOCKED.

let mockPathname = '/';
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ navigate: jest.fn() }),
}));

// walk2 B13 — the /legal predicate reads the LIVE auth state (authed → Profile cluster; pre-auth → locked).
let mockAuthed = true;
jest.mock('../store/hooks', () => ({
  useAppSelector: (sel: (s: { auth: { accessToken: string | null } }) => unknown) =>
    sel({ auth: { accessToken: mockAuthed ? 'token' : null } }),
}));

// Capture the props ShellNav derives for the NavBand (the assertion surface).
let navBandProps: { activeKey?: string; locked?: boolean } = {};
jest.mock('./NavBand', () => ({
  NavBand: (props: { activeKey: string; locked: boolean }) => {
    navBandProps = props;
    return null;
  },
}));

function renderAt(pathname: string, { authed = true }: { authed?: boolean } = {}) {
  mockPathname = pathname;
  mockAuthed = authed;
  navBandProps = {};
  render(<ShellNav />);
  return navBandProps;
}

describe('ShellNav — route→keycap derivation (the locked-fall-through guard)', () => {
  it('C2 (P12) — /settings is PROFILE-active and UNLOCKED (a Profile sub-surface)', () => {
    const p = renderAt('/settings');
    expect(p.locked).toBe(false);
    expect(p.activeKey).toBe('profile');
  });

  it('C2 (P12) — /settings/blocked is PROFILE-active and UNLOCKED', () => {
    const p = renderAt('/settings/blocked');
    expect(p.locked).toBe(false);
    expect(p.activeKey).toBe('profile');
  });

  it('F2 (P13) — /contributor/:id is PROFILE-active and UNLOCKED (the prior fix, pinned)', () => {
    const p = renderAt('/contributor/some-user-id');
    expect(p.locked).toBe(false);
    expect(p.activeKey).toBe('profile');
  });

  it('pre-auth (/sign-in) stays LOCKED', () => {
    const p = renderAt('/sign-in');
    expect(p.locked).toBe(true);
  });

  // walk2 B13 — /legal is auth-ambient: the SAME route is locked pre-auth (create-account acceptance
  // links) and live PROFILE-active signed-in (Settings → ABOUT & LEGAL). Both directions pinned.
  it('B13 — legal-from-Settings (signed in): /legal/terms is PROFILE-active and UNLOCKED', () => {
    const p = renderAt('/legal/terms', { authed: true });
    expect(p.locked).toBe(false);
    expect(p.activeKey).toBe('profile');
  });

  it('B13 — pre-auth legal (create-account links): /legal/terms stays LOCKED', () => {
    const p = renderAt('/legal/terms', { authed: false });
    expect(p.locked).toBe(true);
  });

  it('B13 — /legal/privacy follows the same gate (authed unlocked · pre-auth locked)', () => {
    expect(renderAt('/legal/privacy', { authed: true }).locked).toBe(false);
    expect(renderAt('/legal/privacy', { authed: false }).locked).toBe(true);
  });
});
