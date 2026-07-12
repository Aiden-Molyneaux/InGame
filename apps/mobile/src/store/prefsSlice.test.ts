import reducer, {
  setCollectionView,
  setShellId,
  setThemeId,
  setStickerComposition,
  setCol12CoachmarkSeen,
  type PrefsState,
} from './prefsSlice';
import { DEFAULT_SHELL_ID, DEFAULT_THEME_ID } from '../theme/palettes';
import { STICKER_COMPOSITION_VERSION, type StickerComposition } from '@ingame/shared';

const EMPTY: StickerComposition = { version: STICKER_COMPOSITION_VERSION, stickers: [] };
const state = (over: Partial<PrefsState> = {}): PrefsState => ({
  collectionView: 'shelf',
  shellId: DEFAULT_SHELL_ID,
  themeId: DEFAULT_THEME_ID,
  stickerComposition: EMPTY,
  col12CoachmarkSeen: false,
  ...over,
});

// The persisted prefs reducer (F20) — the Collection view-mode preference (COL-07/COL-13) + the
// Device look (M4 §3.5, DEV-02/04: shell colourway + screen theme + sticker composition, ARCH 2).
describe('prefsSlice', () => {
  it('defaults to the shelf view + the default shell/theme + an empty sticker composition + unseen coachmark', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({
      collectionView: 'shelf',
      shellId: DEFAULT_SHELL_ID,
      themeId: DEFAULT_THEME_ID,
      stickerComposition: EMPTY,
      col12CoachmarkSeen: false,
    });
  });

  it('updates the collection view mode', () => {
    expect(reducer(state(), setCollectionView('top')).collectionView).toBe('top');
  });

  it('sets the shell colourway (DEV-02)', () => {
    expect(reducer(state(), setShellId('carbon')).shellId).toBe('carbon');
  });

  it('sets the screen theme (DEV-04)', () => {
    expect(reducer(state(), setThemeId('deepsea')).themeId).toBe('deepsea');
  });

  it('sets the sticker composition (DEV-01/03 · ARCH 2)', () => {
    const comp: StickerComposition = {
      version: STICKER_COMPOSITION_VERSION,
      stickers: [{ id: 'a', assetId: 'star', zone: 'forehead', x: 0.5, y: 0.5, scale: 1, rotation: 0 }],
    };
    expect(reducer(state(), setStickerComposition(comp)).stickerComposition).toEqual(comp);
  });

  it('latches the COL-12 coachmark as seen (CARD-16 first-run gate)', () => {
    expect(reducer(state(), setCol12CoachmarkSeen(true)).col12CoachmarkSeen).toBe(true);
  });
});
