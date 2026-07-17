import { act, render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';
import type { CardComposition } from '../../render/composition';
import { PrintRitual } from './PrintRitual';

// A flippable reduce-motion mock (the `mock` prefix lets the factory close over it). Default = false so
// the full press-run plays; individual tests flip it to exercise the §104 settled-without-travel branch.
let mockReduced = false;
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

// Stub the two card renderers to identifiable leaves — this isolates PrintRitual's motion + the
// imageUrl→flatten wiring from Skia (CardFace) and network <Image> (FlatCardImage).
jest.mock('../CardFace', () => ({
  CardFace: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'LIVE-CARDFACE');
  },
}));
jest.mock('../game/FlatCardImage', () => ({
  FlatCardImage: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'FLAT-IMAGE');
  },
}));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// A trivial valid-enough composition; the stub CardFace ignores it (only the null-imageUrl path renders it).
const composition = {} as unknown as CardComposition;

describe('PrintRitual (P8 — the press run)', () => {
  afterEach(() => {
    mockReduced = false;
  });

  it('with motion the full three-beat sequence plays and reaches the settled action layout', () => {
    mockReduced = false;
    jest.useFakeTimers();
    try {
      const onDone = jest.fn();
      render(
        wrap(
          <PrintRitual
            title="Hades"
            composition={composition}
            imageUrl="/media/cards/hades.png"
            cardsDesigned={4}
            onDone={onDone}
          />,
        ),
      );
      act(() => jest.advanceTimersByTime(1600)); // press 250 + emerge 600 + marquee 500 + slack
      expect(screen.getByText('FLAT-IMAGE')).toBeTruthy(); // the flattened print emerged
      expect(screen.getByText('PUBLISHED FOR HADES')).toBeTruthy();
      fireEvent.press(screen.getByText('DONE — BACK TO THE GAME'));
      expect(onDone).toHaveBeenCalledTimes(1);
    } finally {
      act(() => jest.runOnlyPendingTimers());
      jest.useRealTimers();
    }
  });

  it('tap-to-skip mid-sequence jumps straight to the settled state', () => {
    mockReduced = false;
    jest.useFakeTimers();
    try {
      const onDone = jest.fn();
      render(
        wrap(
          <PrintRitual
            title="Celeste"
            composition={composition}
            imageUrl="/media/cards/celeste.png"
            cardsDesigned={2}
            onDone={onDone}
          />,
        ),
      );
      act(() => jest.advanceTimersByTime(200)); // mid press-bite
      fireEvent.press(screen.getByLabelText(/Published Celeste/)); // tap anywhere skips
      expect(screen.getByText('PUBLISHED FOR CELESTE')).toBeTruthy();
      fireEvent.press(screen.getByText('DONE — BACK TO THE GAME'));
      expect(onDone).toHaveBeenCalledTimes(1);
    } finally {
      act(() => jest.runOnlyPendingTimers());
      jest.useRealTimers();
    }
  });

  it('under reduce-motion lands settled — the print + PUBLISHED without a press run (§104)', () => {
    mockReduced = true;
    render(
      wrap(
        <PrintRitual
          title="Stardew"
          composition={composition}
          imageUrl="/media/cards/stardew.png"
          cardsDesigned={9}
          onDone={jest.fn()}
        />,
      ),
    );
    expect(screen.getByText('FLAT-IMAGE')).toBeTruthy();
    expect(screen.getByText('PUBLISHED FOR STARDEW')).toBeTruthy();
    expect(screen.getByText('DONE — BACK TO THE GAME')).toBeTruthy();
  });

  it('falls back to the live-composition CardFace when the flattened imageUrl is absent', () => {
    mockReduced = true;
    render(
      wrap(
        <PrintRitual
          title="Hollow"
          composition={composition}
          imageUrl={null}
          cardsDesigned={1}
          onDone={jest.fn()}
        />,
      ),
    );
    expect(screen.getByText('LIVE-CARDFACE')).toBeTruthy();
    expect(screen.queryByText('FLAT-IMAGE')).toBeNull();
  });

  it('unmounting mid-animation tears down cleanly (no throw, no leaked timers)', () => {
    mockReduced = false;
    jest.useFakeTimers();
    try {
      const view = render(
        wrap(
          <PrintRitual
            title="Elden"
            composition={composition}
            imageUrl="/media/cards/elden.png"
            cardsDesigned={3}
            onDone={jest.fn()}
          />,
        ),
      );
      act(() => jest.advanceTimersByTime(300));
      expect(() => view.unmount()).not.toThrow();
      act(() => jest.advanceTimersByTime(2000)); // any stragglers must not fire into an unmounted tree
    } finally {
      jest.useRealTimers();
    }
  });
});
