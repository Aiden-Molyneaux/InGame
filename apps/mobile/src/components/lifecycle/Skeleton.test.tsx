import { act, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Skeleton } from './Skeleton';
import prefsReducer from '../../store/prefsSlice';

// The pulse honours OS reduce-motion via the shared a11y hook — mocked so the tests are deterministic
// (default: reduced = instant/static, the FlipCard pattern). One test flips it to exercise the live loop.
let mockReduced = true;
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// Skeleton (component-map §5.6 · design-spec §1.6) — the LOADING placeholder: solid fills, a
// reduce-motion-aware pulse, announced as a busy "Loading" region.
describe('Skeleton (design-spec §1.6 loading)', () => {
  beforeEach(() => {
    mockReduced = true;
  });

  it('renders each variant as a single busy "Loading" region', () => {
    for (const variant of ['text-lines', 'tile-row', 'card-cell'] as const) {
      const { unmount } = render(wrap(<Skeleton variant={variant} />));
      expect(screen.getByLabelText('Loading')).toBeTruthy();
      unmount();
    }
  });

  it('honours a custom label', () => {
    render(wrap(<Skeleton accessibilityLabel="Loading your cards" />));
    expect(screen.getByLabelText('Loading your cards')).toBeTruthy();
  });

  it('reduce-motion respected — renders static, no crash (pulse never starts)', () => {
    mockReduced = true;
    render(wrap(<Skeleton variant="tile-row" count={4} />));
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('motion path mounts the pulse loop without throwing', () => {
    mockReduced = false;
    const { unmount } = render(wrap(<Skeleton variant="card-cell" count={3} />));
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    // Flush any scheduled animation frames the loop queued, then unmount to stop it cleanly.
    act(() => {});
    unmount();
  });
});
