import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { SelfProfile, GenresResponse } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { theme } from '../../theme';
import { SCREEN_THEMES, DEFAULT_THEME_ID } from '../../theme/palettes';
import { EditableIdentity, type SaveOutcome } from './EditableIdentity';

// Tests assert against the DEFAULT (Midnight) palette directly — the rule-theme-tokens convention
// for test files (cf. celebration.test.tsx): `theme.scr` is the live layer, off-limits statically.
const SCR = SCREEN_THEMES[DEFAULT_THEME_ID];

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
    avatarConfig: null,
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

  it('N3 (owner) — the ADD GAMERTAG key is orange /primary (not the cream secondary)', () => {
    renderEditor();
    const tree = JSON.stringify(screen.toJSON());
    // the primary fill is the on-screen accent (#ff9f43 on Midnight); the cream secondary is #f5f1e4.
    expect(tree).toContain('#ff9f43');
  });

  it('W-4 (D-2) — the ✎ opens the Monogram Forge inline; opening alone makes NO server call', () => {
    const onPatchMe = jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true });
    renderEditor({ onPatchMe });
    // the forge is closed until the pencil is tapped (no designer-coming note anymore).
    expect(screen.queryByText('MONOGRAM FORGE')).toBeNull();
    fireEvent.press(screen.getByLabelText('Edit avatar'));
    expect(screen.getByText('MONOGRAM FORGE')).toBeTruthy();
    expect(onPatchMe).not.toHaveBeenCalled(); // opening the forge doesn't patch
  });

  // Flatten a node's style array into one object.
  const flatStyle = (node: { props: { style?: unknown } }): Record<string, unknown> =>
    Object.assign({}, ...[node.props.style ?? {}].flat(Infinity).filter(Boolean));

  it('N-A1 — the PROF-06 time-gate note wears the screen accent (orange) for salience', () => {
    const future = new Date(Date.now() + 5 * 86400_000).toISOString();
    renderEditor({ me: ME({ usernameNextChangeAt: future }) });
    const gate = screen.getByText(/NEXT CHANGE/);
    expect(flatStyle(gate).color).toBe(SCR.accent); // #ff9f43 on Midnight — NOT the dim default
  });

  it('N-A1 — the non-cooldown format hint stays dim, not accent', () => {
    renderEditor(); // usernameNextChangeAt: null → the no-cooldown format-hint branch
    const hint = screen.getByText(/SAVES WHEN YOU TAP AWAY/);
    expect(flatStyle(hint).color).toBe(SCR.dim);
  });

  it('N-A3 — the well applies ONE equal inter-section gap (theme.space.xl) across every section', () => {
    renderEditor();
    // Walk up from the Username input to the `well` (the panel-backed section container).
    type Node = { parent: Node | null; props: { style?: unknown } };
    let p = (screen.getByLabelText('Username') as unknown as Node).parent;
    let flat: Record<string, unknown> = {};
    while (p) {
      flat = flatStyle(p);
      if (flat.backgroundColor === SCR.panel) break;
      p = p.parent;
    }
    expect(flat.backgroundColor).toBe(SCR.panel); // found the well
    expect(flat.gap).toBe(theme.space.xl); // 16 — the single, larger, equal section gap
  });
});
