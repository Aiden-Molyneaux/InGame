import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../store/prefsSlice';
// The Settings shell is a routed screen at app/settings.tsx; its test lives under src/ (the repo
// convention — expo-router treats app/** files as routes; see blocked.test.tsx).
import Settings from '../../app/settings';

jest.mock('../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }) }));
jest.mock('../store', () => ({ logoutTeardown: jest.fn() }));
jest.mock('../store/api', () => ({
  useGetMeQuery: () => ({
    data: { username: 'demo', emailVerified: true },
  }),
}));
jest.mock('../store/settingsApi', () => ({
  useGetBlocksQuery: () => ({ data: { blocks: [] } }),
}));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

describe('Settings shell (P12 §0.10 · walk2 B11)', () => {
  it('B11 — SIGN OUT is the TERMINAL row: after every browse section (below the last ABOUT & LEGAL row)', () => {
    const view = render(wrap(<Settings />));
    const tree = JSON.stringify(view.toJSON());
    const signOut = tree.indexOf('SIGN OUT');
    expect(signOut).toBeGreaterThan(-1);
    // terminal-row grammar: sign-out sits BELOW the last section's last row (VERSION) — not in ACCOUNT.
    expect(signOut).toBeGreaterThan(tree.indexOf('VERSION'));
    expect(signOut).toBeGreaterThan(tree.indexOf('PRIVACY POLICY'));
    expect(signOut).toBeGreaterThan(tree.indexOf('BLOCKED USERS'));
  });

  it('SIGN OUT raises the calm S7b ConfirmSheet (accent, reversible — not red)', () => {
    render(wrap(<Settings />));
    fireEvent.press(screen.getByText('SIGN OUT'));
    expect(screen.getByText('SIGN OUT?')).toBeTruthy(); // the ConfirmSheet title
    expect(screen.getByText(/Nothing is deleted/)).toBeTruthy();
  });
});
