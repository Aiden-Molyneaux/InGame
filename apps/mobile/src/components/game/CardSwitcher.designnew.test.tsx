import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CollectionItem } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';

// walk2 B9 ⚖ (owner ruling 2026-07-17, recorded by 0078) — DESIGN NEW is ORANGE again: this REVERSES
// decision 0069's "DESIGN NEW = gold". Designing your own card is creative, not acquisitive — gold
// stays the commerce voice (F-02). The test pins the accent (not gold) on the tile's label.

jest.mock('../CardFace', () => ({
  CardFace: () => null,
  parseComposition: (x: unknown) => x,
}));
jest.mock('../../store/api', () => ({
  useGetEntryCardsQuery: () => ({ data: { items: [] }, isLoading: false }),
  useUpdateEntryMutation: () => [jest.fn(), { isLoading: false }],
}));

import { CardSwitcher } from './CardSwitcher';

const ENTRY = {
  entryId: 'e1',
  gameId: 'g1',
  title: 'Hades',
  card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false },
} as unknown as CollectionItem;

// Midnight (the default theme): scr.accent = '#ff9f43' (orange) · scr.value = '#ffd23f' (gold).
const MIDNIGHT_ACCENT = '#ff9f43';
const MIDNIGHT_GOLD = '#ffd23f';

function flat(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}

describe('CARD-14 walk2-B9: DESIGN NEW wears the ORANGE accent (0069 gold ruling reversed, 0078)', () => {
  it('the DESIGN NEW label + tile read scr.accent, never gold', () => {
    const store = configureStore({ reducer: { prefs: prefsReducer } });
    render(
      <Provider store={store}>
        <CardSwitcher
          entry={ENTRY}
          onEditInStyler={() => {}}
          onDesignNew={() => {}}
          onRequestDelete={() => {}}
        />
      </Provider>,
    );
    const label = screen.getByText('DESIGN NEW');
    const style = flat((label as unknown as { props: { style: unknown } }).props.style);
    expect(style.color).toBe(MIDNIGHT_ACCENT);
    expect(style.color).not.toBe(MIDNIGHT_GOLD);
  });
});
