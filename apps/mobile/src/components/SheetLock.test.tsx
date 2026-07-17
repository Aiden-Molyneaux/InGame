import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../store/prefsSlice';
import { SheetLockProvider, useHoldSheetLock, useSheetLocked } from './SheetLock';
import { PulledSheet } from './PulledSheet';

jest.mock('../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// A background probe reads the lock the way a screen's ScrollView does.
function Probe() {
  return <Text>{useSheetLocked() ? 'LOCKED' : 'FREE'}</Text>;
}
// A stand-in for a sheet that holds the lock while `active`.
function Holder({ active }: { active: boolean }) {
  useHoldSheetLock(active);
  return null;
}

describe('SheetLock (C2 — freeze the background while a sheet is open)', () => {
  it('an inactive holder leaves the background FREE; an active one LOCKS it', () => {
    const { rerender } = render(
      wrap(
        <SheetLockProvider>
          <Probe />
          <Holder active={false} />
        </SheetLockProvider>,
      ),
    );
    expect(screen.getByText('FREE')).toBeTruthy();

    rerender(
      wrap(
        <SheetLockProvider>
          <Probe />
          <Holder active />
        </SheetLockProvider>,
      ),
    );
    expect(screen.getByText('LOCKED')).toBeTruthy();
  });

  it('is COUNTED — two open sheets both have to close before the background thaws', () => {
    const { rerender } = render(
      wrap(
        <SheetLockProvider>
          <Probe />
          <Holder active />
          <Holder active />
        </SheetLockProvider>,
      ),
    );
    expect(screen.getByText('LOCKED')).toBeTruthy();

    // one closes → still locked (the other holds)
    rerender(
      wrap(
        <SheetLockProvider>
          <Probe />
          <Holder active />
          <Holder active={false} />
        </SheetLockProvider>,
      ),
    );
    expect(screen.getByText('LOCKED')).toBeTruthy();

    // both closed → free
    rerender(
      wrap(
        <SheetLockProvider>
          <Probe />
          <Holder active={false} />
          <Holder active={false} />
        </SheetLockProvider>,
      ),
    );
    expect(screen.getByText('FREE')).toBeTruthy();
  });

  it('a visible PulledSheet locks the background; closing it frees it', () => {
    const { rerender } = render(
      wrap(
        <SheetLockProvider>
          <Probe />
          <PulledSheet visible={false} onClose={jest.fn()}>
            <Text>sheet body</Text>
          </PulledSheet>
        </SheetLockProvider>,
      ),
    );
    expect(screen.getByText('FREE')).toBeTruthy();

    rerender(
      wrap(
        <SheetLockProvider>
          <Probe />
          <PulledSheet visible onClose={jest.fn()}>
            <Text>sheet body</Text>
          </PulledSheet>
        </SheetLockProvider>,
      ),
    );
    expect(screen.getByText('LOCKED')).toBeTruthy();

    rerender(
      wrap(
        <SheetLockProvider>
          <Probe />
          <PulledSheet visible={false} onClose={jest.fn()}>
            <Text>sheet body</Text>
          </PulledSheet>
        </SheetLockProvider>,
      ),
    );
    expect(screen.getByText('FREE')).toBeTruthy();
  });
});
