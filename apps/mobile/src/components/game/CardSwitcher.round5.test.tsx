import React from 'react';
import { render, screen, fireEvent, type RenderResult } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CollectionItem } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';

// Round-5 Game page (walk notes N-B9 · N-B10) — the CARDS-tab per-card action panel:
//   N-B9  — SHARE moved out of PLAY and onto EVERY card's panel (CARD-21), publish-gated: an owned
//           draft/private design has no public face to share; an adopted card is published by definition.
//   N-B10 — the panel's "name — PRIVATE/PUBLISHED" title line is dropped (the tile's status tag and
//           the card face already carry that info); the panel leads with the cosmetic readout.

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
        { origin: 'owned', id: 'c1', name: 'Sunburst', status: 'published', composition: {} },
        { origin: 'owned', id: 'c2', name: 'Moonlit', status: 'private', composition: {} },
        { origin: 'adopted', id: 'c3', name: 'Rose', imageUrl: null, designer: { userId: 'u9', username: 'riko' } },
      ],
    },
    isLoading: false,
  }),
  useUpdateEntryMutation: () => [jest.fn(), { isLoading: false }],
}));

import { CardSwitcher } from './CardSwitcher';
import { ScreenButton } from '../ScreenButton';

const ENTRY = {
  entryId: 'e1',
  gameId: 'g1',
  title: 'Hades',
  card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false },
} as unknown as CollectionItem;

function renderSwitcher(onShare = jest.fn()) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  const utils = render(
    <Provider store={store}>
      <CardSwitcher
        entry={ENTRY}
        onEditInStyler={() => {}}
        onDesignNew={() => {}}
        onRequestDelete={() => {}}
        onShare={onShare}
      />
    </Provider>,
  );
  return { onShare, ...utils };
}

const shareButton = (utils: Pick<RenderResult, 'UNSAFE_getAllByType'>) =>
  utils.UNSAFE_getAllByType(ScreenButton).find((b) => b.props.label === 'Share')!;

describe('round-5 N-B9 — per-card SHARE in the CARDS panel (publish-gated)', () => {
  it('a PUBLISHED owned card shares — onShare gets that card, not the equipped one', () => {
    const utils = renderSwitcher();
    // no row is equipped (entry wears the default face) → the first row (Sunburst) is selected
    expect(shareButton(utils).props.disabled).toBe(false);
    fireEvent.press(screen.getByText('SHARE'));
    expect(utils.onShare).toHaveBeenCalledWith('c1', 'Sunburst');
  });

  it('a PRIVATE owned design cannot share (no public face) — the button is present but disabled', () => {
    const utils = renderSwitcher();
    fireEvent.press(screen.getByLabelText('Select Moonlit'));
    expect(shareButton(utils).props.disabled).toBe(true);
    fireEvent.press(screen.getByText('SHARE'));
    expect(utils.onShare).not.toHaveBeenCalled();
  });

  it('an ADOPTED card shares (published by definition)', () => {
    const utils = renderSwitcher();
    fireEvent.press(screen.getByLabelText('Select Rose'));
    expect(shareButton(utils).props.disabled).toBe(false);
    fireEvent.press(screen.getByText('SHARE'));
    expect(utils.onShare).toHaveBeenCalledWith('c3', 'Rose');
  });
});

describe('round-5 N-B10 — the panel no longer titles "name — privacy"', () => {
  it('the "name — STATUS" line is gone while the tile status tag stays', () => {
    renderSwitcher();
    expect(screen.queryByText('Sunburst — PUBLISHED')).toBeNull();
    fireEvent.press(screen.getByLabelText('Select Moonlit'));
    expect(screen.queryByText('Moonlit — PRIVATE')).toBeNull();
    // the privacy still shows elsewhere in the UI: the tile's own status tag
    expect(screen.getByText('PRIVATE')).toBeTruthy();
    expect(screen.getByText('PUBLISHED')).toBeTruthy();
  });
});
