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

// Capture the props ShellNav derives for the NavBand (the assertion surface).
let navBandProps: { activeKey?: string; locked?: boolean } = {};
jest.mock('./NavBand', () => ({
  NavBand: (props: { activeKey: string; locked: boolean }) => {
    navBandProps = props;
    return null;
  },
}));

function renderAt(pathname: string) {
  mockPathname = pathname;
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
});
