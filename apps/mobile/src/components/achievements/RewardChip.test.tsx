import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';

// P11 walk-1 — RewardChip consumes the CANONICAL PixelsMark (component-map §7, the M5 commerce kit)
// for the pixels kind: never a bespoke diamond redraw. The mark is mocked to a marker so the assertion
// is on CONSUMPTION (the import seam), not the SVG internals (PixelsMark has its own artwork).

jest.mock('../commerce/PixelsMark', () => ({
  PixelsMark: ({ size }: { size?: number }) => {
    const { Text } = require('react-native');
    return <Text>{`PIXELSMARK:${size}`}</Text>;
  },
}));

import { RewardChip } from './RewardChip';

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}

describe('P11 RewardChip', () => {
  it('pixels kind renders the canonical PixelsMark (the commerce-kit glyph, not a bespoke diamond)', () => {
    render(wrap(<RewardChip kind="pixels" name="+50 Pixels" sub="From Collector" />));
    expect(screen.getByText('PIXELSMARK:22')).toBeTruthy();
    expect(screen.getByText('+50 PIXELS')).toBeTruthy();
    // a PX payout never wears the EARN-ONLY tag
    expect(screen.queryByText('EARN-ONLY')).toBeNull();
  });

  it('cosmetic kind keeps the frame glyph + the EARN-ONLY tag (no PixelsMark)', () => {
    render(wrap(<RewardChip kind="cosmetic" name="Gold-Foil Frame" sub="Unlocked for your cards" />));
    expect(screen.getByText('EARN-ONLY')).toBeTruthy();
    expect(screen.queryByText(/PIXELSMARK/)).toBeNull();
  });
});
