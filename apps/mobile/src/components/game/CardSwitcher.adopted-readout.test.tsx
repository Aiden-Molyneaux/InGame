import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CollectionItem } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';

// Regression (owner walk m6) — an ADOPTED card must still show its cosmetics in the switcher panel,
// like an owned card does. A foreign card has NO client-side composition (OQ-122 flattened-only), so
// its cosmetics can only come from the server's denormalized CARD-22 `equipped` label snapshot, shown
// READ-ONLY. The bug: the switcher's adopted branch showed only the "Adopted from X" note and never
// wired those labels through — so adopted cards read as cosmetic-less. This pins the labels rendering.

jest.mock('../CardFace', () => ({
  CardFace: () => null,
  parseComposition: (x: unknown) => x,
}));
jest.mock('./FlatCardImage', () => ({
  FlatCardImage: () => null,
}));
jest.mock('../../store/api', () => ({
  useGetEntryCardsQuery: () => ({
    data: {
      items: [
        {
          origin: 'adopted',
          id: 'a1',
          name: 'Rose',
          imageUrl: null,
          designer: { userId: 'u9', username: 'riko' },
          // CARD-22 denormalized per-slot display labels (never the composition)
          equipped: { frame: 'MARQUEE ULTIMATE', nameplate: 'BRASS', font: 'SCRIPT' },
        },
        // a second adopted card WITHOUT a label snapshot (pre-M6 backfill miss) — must degrade to the
        // note alone, never crash
        {
          origin: 'adopted',
          id: 'a2',
          name: 'Thistle',
          imageUrl: null,
          designer: { userId: 'u8', username: 'mara' },
        },
      ],
    },
    isLoading: false,
  }),
  useUpdateEntryMutation: () => [jest.fn(), { isLoading: false }],
}));

import { CardSwitcher } from './CardSwitcher';

const ENTRY = {
  entryId: 'e1',
  gameId: 'g1',
  title: 'Hades',
  card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false },
} as unknown as CollectionItem;

function renderSwitcher() {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return render(
    <Provider store={store}>
      <CardSwitcher
        entry={ENTRY}
        onEditInStyler={() => {}}
        onDesignNew={() => {}}
        onRequestDelete={() => {}}
        onShare={jest.fn()}
      />
    </Provider>,
  );
}

describe('CardSwitcher — adopted cards show their cosmetics (read-only) from server labels', () => {
  it('renders the CARD-22 equipped labels for a selected adopted card, alongside the un-editable note', () => {
    renderSwitcher();
    // the first adopted row (Rose) selects by default (nothing equipped)
    fireEvent.press(screen.getByLabelText('Select Rose'));
    // the cosmetic values render (uppercased display strings) — the readout is back
    expect(screen.getByText('MARQUEE ULTIMATE')).toBeTruthy();
    expect(screen.getByText('BRASS')).toBeTruthy();
    expect(screen.getByText('SCRIPT')).toBeTruthy();
    // still read-only — the adopted note stands beside the readout
    expect(screen.getByText(/Adopted from riko/)).toBeTruthy();
  });

  it('degrades to the note alone when an adopted card carries no label snapshot (no crash)', () => {
    renderSwitcher();
    fireEvent.press(screen.getByLabelText('Select Thistle'));
    expect(screen.getByText(/Adopted from mara/)).toBeTruthy();
    // no fabricated cosmetics for a card whose labels were never snapshotted
    expect(screen.queryByText('BRASS')).toBeNull();
  });
});
