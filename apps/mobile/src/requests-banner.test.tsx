import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { PersonSummary } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';
import { RequestsBanner } from '../app/(tabs)/friends';

// The banner never runs these hooks, but importing the ROUTE module pulls them in — mock the store/api
// modules + the router so the import stays native-free (the route-test pattern).
jest.mock('./store/friendApi', () => ({
  useGetFriendsQuery: () => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }),
  useGetFriendRequestsQuery: () => ({ data: undefined }),
}));
jest.mock('./store/feedApi', () => ({
  useGetFeedQuery: () => ({ data: undefined, isFetching: false, isError: false, refetch: jest.fn() }),
  useLazyGetFeedQuery: () => [jest.fn(), { isFetching: false, isError: false }],
  mergeFeedPages: (pages: unknown) => pages,
}));
jest.mock('./store/achievementsApi', () => ({ useGetAchievementDefsQuery: () => ({ data: undefined }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
}));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// ── Walk-4 review (the P1-c class, third site) — the FRIENDS-tab requests banner rendered its stacked
// mini-avatars from usernames ALONE, dropping the avatarUrl + avatarConfig the requests payload always
// carried (personSummarySchema) — a requester's forged monogram showed as the derived-initials default.
// The banner now consumes the full PersonSummary. The forged-monogram assertions fail pre-fix (the
// configured <Avatar> carries the "<username> monogram" label; the default box carries none). ──

const person = (over: Partial<PersonSummary>): PersonSummary => ({
  userId: '00000000-0000-0000-0000-000000000001',
  username: 'riko',
  avatarUrl: null,
  avatarConfig: null,
  relationship: 'incoming',
  ...over,
});

const RIKO_FORGED = person({
  avatarConfig: { bg: '#2a1f4d', ink: '#e8c14a', glyph: 'RK', frame: 'ring' },
});
const ZOE_PLAIN = person({ userId: '00000000-0000-0000-0000-000000000002', username: 'zoe' });

describe('RequestsBanner (SOC-08 fast-path) — the person identity reaches the stacked avatars', () => {
  it('renders a requester’s FORGED monogram (avatarConfig threaded, not dropped to default initials)', () => {
    const { getByLabelText } = render(wrap(<RequestsBanner count={2} people={[RIKO_FORGED, ZOE_PLAIN]} onPress={() => {}} />));
    expect(getByLabelText('riko monogram')).toBeTruthy();
  });

  it('a config-less requester keeps the default monogram; the copy still names the first two', () => {
    const { queryByLabelText, getByText, getByLabelText } = render(
      wrap(<RequestsBanner count={2} people={[ZOE_PLAIN, RIKO_FORGED]} onPress={() => {}} />),
    );
    expect(queryByLabelText('zoe monogram')).toBeNull(); // null config ⇒ the unlabelled default box
    expect(getByLabelText('2 friend requests')).toBeTruthy();
    expect(getByText('ZOE · RIKO WANT TO CONNECT')).toBeTruthy();
  });

  it('a requester with a real avatarUrl renders the image avatar (url wins over config)', () => {
    const withUrl = person({ username: 'ana', avatarUrl: 'https://cdn/x.png' });
    const { getByLabelText } = render(wrap(<RequestsBanner count={1} people={[withUrl]} onPress={() => {}} />));
    expect(getByLabelText('ana avatar')).toBeTruthy();
  });
});
