import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../store/prefsSlice';
// The blocked-users page is a routed screen at app/settings/blocked.tsx. Its test lives under src/
// (the repo convention — expo-router scans app/** for ROUTES and would treat a co-located *.test.tsx
// as a route, failing the whole route tree; observed on the P12 BOOT check 2026-07-17).
import Blocked from '../../app/settings/blocked';

jest.mock('../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

// Controllable RTK hooks — the blocked page's data/mutation seam.
let mockBlocks: { data?: { blocks: unknown[] }; isLoading: boolean; isError: boolean };
const mockUnblock = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
jest.mock('../store/settingsApi', () => ({
  useGetBlocksQuery: () => ({ ...mockBlocks, refetch: jest.fn() }),
  useUnblockUserMutation: () => [mockUnblock, { isLoading: false }],
}));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const PERSON = {
  userId: 'aaaaaaaa-1111-4111-8111-111111111111',
  username: 'riko_test',
  avatarUrl: null,
  blockedAt: '2026-06-09T12:00:00.000Z',
};

describe('Blocked users page (P12 · SOC-09 · settings-states S6)', () => {
  beforeEach(() => mockUnblock.mockClear());

  it('renders the calm SOC-09 note + the quiet empty state when no one is blocked', () => {
    mockBlocks = { data: { blocks: [] }, isLoading: false, isError: false };
    render(wrap(<Blocked />));
    expect(screen.getByText(/They’re never told\./)).toBeTruthy();
    expect(screen.getByText(/No one blocked/)).toBeTruthy();
  });

  it('lists blocked people (name + date), and UNBLOCK routes through the 0040 ConfirmSheet → the mutation', async () => {
    mockBlocks = { data: { blocks: [PERSON] }, isLoading: false, isError: false };
    render(wrap(<Blocked />));
    expect(screen.getByText('RIKO_TEST')).toBeTruthy();
    expect(screen.getByText(/BLOCKED JUN 9/)).toBeTruthy();

    // the row UNBLOCK opens the confirm (the MOD-09 lone-exception affordance)
    fireEvent.press(screen.getByLabelText('Unblock riko_test'));
    expect(screen.getByText('UNBLOCK RIKO_TEST?')).toBeTruthy(); // the ConfirmSheet title

    // confirm → the unblock mutation fires with the userId
    const keys = screen.getAllByText('UNBLOCK');
    fireEvent.press(keys[keys.length - 1]);
    await waitFor(() => expect(mockUnblock).toHaveBeenCalledWith(PERSON.userId));
  });

  it('surfaces the Signal Lost load error with RETRY', () => {
    mockBlocks = { data: undefined, isLoading: false, isError: true };
    render(wrap(<Blocked />));
    expect(screen.getByText('SIGNAL LOST')).toBeTruthy();
  });
});
