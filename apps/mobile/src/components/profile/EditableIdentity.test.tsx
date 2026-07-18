import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { SelfProfile, GenresResponse } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { EditableIdentity, type SaveOutcome } from './EditableIdentity';

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const GENRES: GenresResponse = {
  items: [
    { id: '11111111-1111-4111-8111-111111111111', name: 'RPG' },
    { id: '22222222-2222-4222-8222-222222222222', name: 'Roguelike' },
  ],
};

const ME = (over: Partial<SelfProfile> = {}): SelfProfile =>
  ({
    id: 'me-0000-0000-4000-8000-000000000000',
    username: 'demo',
    avatarUrl: null,
    bio: 'hello',
    memberSince: '2025-01-01T00:00:00.000Z',
    privacy: 'friends',
    role: 'user',
    adminTier: null,
    staff: false,
    usernamePending: false,
    emailVerified: true,
    favouriteGameId: null,
    favouriteGenreIds: ['11111111-1111-4111-8111-111111111111'],
    gamertags: [{ id: 'gt-1', platform: 'playstation', handle: 'demo_psn' }],
    usernameNextChangeAt: null,
    stats: { games: 0, hours: 0, completionPct: 0, cardsDesigned: 0, adoptionsReceived: 0, friends: 0 },
    favouriteGame: null,
    nowPlaying: null,
    top10: [],
    ...over,
  }) as unknown as SelfProfile;

function renderEditor(over: Partial<React.ComponentProps<typeof EditableIdentity>> = {}) {
  const props = {
    me: ME(),
    genres: GENRES,
    onPatchMe: jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true }),
    onAddGamertag: jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true }),
    onRemoveGamertag: jest.fn<Promise<void>, unknown[]>().mockResolvedValue(undefined),
    ...over,
  };
  render(wrap(<EditableIdentity {...props} />));
  return props;
}

describe('EditableIdentity (W-C4 · in-place per-field commit)', () => {
  it('bio commits on blur (PATCH /me {bio})', async () => {
    const onPatchMe = jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true });
    renderEditor({ onPatchMe });
    const bio = screen.getByLabelText('Bio');
    fireEvent.changeText(bio, 'new bio text');
    fireEvent(bio, 'blur');
    await waitFor(() => expect(onPatchMe).toHaveBeenCalledWith({ bio: 'new bio text' }));
  });

  it('username commits on blur; a MOD-07 screening 422 surfaces inline under the field', async () => {
    const onPatchMe = jest
      .fn<Promise<SaveOutcome>, unknown[]>()
      .mockResolvedValue({ ok: false, fieldErrors: { username: 'That name isn’t allowed.' } });
    renderEditor({ onPatchMe });
    const u = screen.getByLabelText('Username');
    fireEvent.changeText(u, 'newname');
    fireEvent(u, 'blur');
    await waitFor(() => expect(onPatchMe).toHaveBeenCalledWith({ username: 'newname' }));
    expect(await screen.findByText('That name isn’t allowed.')).toBeTruthy();
  });

  it('PROF-06 cooldown: a future usernameNextChangeAt disables the field + shows the microcopy', () => {
    const future = new Date(Date.now() + 5 * 86400_000).toISOString();
    renderEditor({ me: ME({ usernameNextChangeAt: future }) });
    expect(screen.getByLabelText('Username').props.editable).toBe(false);
    expect(screen.getByText(/NEXT CHANGE/)).toBeTruthy();
  });

  it('a genre chip toggles → commits the full favouriteGenreIds array', async () => {
    const onPatchMe = jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true });
    renderEditor({ onPatchMe });
    // Roguelike is OFF → tapping adds it to the existing [RPG]
    fireEvent.press(screen.getByLabelText('Roguelike'));
    await waitFor(() =>
      expect(onPatchMe).toHaveBeenCalledWith({
        favouriteGenreIds: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
      }),
    );
  });

  it('gamertag add (platform + handle) and remove (✕) call their handlers', async () => {
    const onAddGamertag = jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true });
    const onRemoveGamertag = jest.fn<Promise<void>, unknown[]>().mockResolvedValue(undefined);
    renderEditor({ onAddGamertag, onRemoveGamertag });
    // remove the seeded PSN tag
    fireEvent.press(screen.getByLabelText('Remove demo_psn'));
    expect(onRemoveGamertag).toHaveBeenCalledWith('gt-1');
    // add a new one on XBOX
    fireEvent.press(screen.getByLabelText('XBOX'));
    fireEvent.changeText(screen.getByLabelText('Add a gamertag'), 'demo_xbl');
    fireEvent.press(screen.getByText('ADD GAMERTAG'));
    await waitFor(() => expect(onAddGamertag).toHaveBeenCalledWith({ platform: 'xbox', handle: 'demo_xbl' }));
  });

  it('avatar = the PROF-08 monogram + the ✎ "designer coming" note; NO server call (D-2)', () => {
    const onPatchMe = jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true });
    renderEditor({ onPatchMe });
    fireEvent.press(screen.getByLabelText('Edit avatar'));
    expect(screen.getByText(/avatar designer is coming/i)).toBeTruthy();
    expect(onPatchMe).not.toHaveBeenCalled();
  });
});
