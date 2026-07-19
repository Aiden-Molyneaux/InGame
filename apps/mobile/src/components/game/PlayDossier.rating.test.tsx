import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CollectionItem } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';

// Round-5 D-i — the PLAY dossier's RATING row is a LIVE tap-to-set star input (entry.rating,
// 1..5 | null) and the PLATFORMS row is gone. These tests pin the tap grammar: tap a star → PATCH
// that value; tap the CURRENT rating → clear to null; a failed save reverts + surfaces the error.
// (rating stays OWNER-PRIVATE — the SOC-11 friend-shape exclusion is pinned server-side in
// apps/api/test/integration/friend-view-p2-slice.test.ts.)

const mockUpdate = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
jest.mock('../../store/api', () => ({
  useUpdateEntryMutation: () => [mockUpdate, { isLoading: false }],
}));

import { PlayDossier } from './PlayDossier';

const entry = (rating: number | null): CollectionItem => ({
  entryId: 'e1',
  gameId: 'g1',
  title: 'Elden Ring',
  developer: 'FromSoftware',
  publisher: null,
  releaseYear: 2022,
  genres: [],
  hours: 211,
  percentComplete: 68,
  status: 'beaten',
  ownedSince: '2022-02-25',
  addedAt: '2022-02-25T00:00:00.000Z',
  nowPlaying: false,
  card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
  rating,
  notes: null,
});

const renderDossier = (rating: number | null = null) =>
  render(
    <Provider store={configureStore({ reducer: { prefs: prefsReducer } })}>
      <PlayDossier entry={entry(rating)} />
    </Provider>,
  );

beforeEach(() => mockUpdate.mockClear());

describe('round-5 D-i — the RATING star input', () => {
  it('tapping a star PATCHes that rating and lights it immediately', () => {
    renderDossier(null);
    fireEvent.press(screen.getByLabelText('Rate 4 stars'));
    expect(mockUpdate).toHaveBeenCalledWith({ entryId: 'e1', rating: 4 });
    // the tapped value shows at once (the 4th star now offers CLEAR, not rate-4)
    expect(screen.getByLabelText('Clear rating')).toBeTruthy();
    expect(screen.queryByLabelText('Rate 4 stars')).toBeNull();
  });

  it('tapping the CURRENT rating clears back to unset (rating: null)', () => {
    renderDossier(3);
    fireEvent.press(screen.getByLabelText('Clear rating'));
    expect(mockUpdate).toHaveBeenCalledWith({ entryId: 'e1', rating: null });
    // cleared → every star is a set-affordance again
    expect(screen.queryByLabelText('Clear rating')).toBeNull();
    expect(screen.getByLabelText('Rate 3 stars')).toBeTruthy();
  });

  it('a failed save reverts to server truth and surfaces the error', async () => {
    mockUpdate.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('nope')) });
    renderDossier(null);
    fireEvent.press(screen.getByLabelText('Rate 2 stars'));
    expect(await screen.findByText("Couldn't save — try again.")).toBeTruthy();
    // reverted — star 2 rates again (nothing is set, so nothing offers CLEAR)
    expect(screen.getByLabelText('Rate 2 stars')).toBeTruthy();
    expect(screen.queryByLabelText('Clear rating')).toBeNull();
  });

  it('the inert rows are gone: no PLATFORMS, no PENDING', () => {
    renderDossier(null);
    expect(screen.queryByText('PLATFORMS')).toBeNull();
    expect(screen.queryByText('PENDING')).toBeNull();
    expect(screen.getByText('RATING')).toBeTruthy();
  });
});
