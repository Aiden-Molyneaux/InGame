import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STICKER_COMPOSITION_VERSION, type StickerComposition } from '@ingame/shared';
import {
  DEFAULT_SHELL_ID,
  DEFAULT_THEME_ID,
  type ScreenThemeId,
  type ShellId,
} from '../theme/palettes';

// The PERSISTED slice (F20 — redux-persist holds drafts/cache/prefs ONLY, never tokens). It is
// version-keyed and PURGED on logout (the clean-slate / per-user-namespace guarantee). Holds:
//  • the Collection view-mode preference (COL-07 / COL-13: SHELF · GRID · LIST · TOP);
//  • the Device look (M4 §3.5, DEV-02/04): the selected shell colourway + screen theme the theme
//    engine (`useTheme`) reads, AND the placed sticker composition (DEV-01/03, ARCH 2) the persistent
//    DeviceShell renders on the plastic bands of EVERY screen. All three are the OPTIMISTIC app-wide
//    values — the editor writes them locally on each mutation and reconciles them to server truth on
//    open (device.tsx hydrate); logout purges the slice, so they never leak across users. New keys pick
//    up their initial-state defaults on rehydrate (redux-persist's autoMergeLevel1 shallow-merges
//    persisted state over initialState — a first-time or older persisted blob simply inherits these
//    defaults; no migration needed).
export type CollectionView = 'shelf' | 'grid' | 'list' | 'top';

export interface PrefsState {
  collectionView: CollectionView;
  shellId: ShellId;
  themeId: ScreenThemeId;
  stickerComposition: StickerComposition;
  // COL-12/CARD-16 — the first-run peek-flip coachmark's one-time "seen" flag. Persisted (redux-persist
  // autoMergeLevel1 gives an older/first-time blob the `false` default → the hint shows once). No on-face
  // indicator (owner directive) — this coachmark is the only discoverability affordance.
  col12CoachmarkSeen: boolean;
}

const initialState: PrefsState = {
  collectionView: 'shelf',
  shellId: DEFAULT_SHELL_ID,
  themeId: DEFAULT_THEME_ID,
  stickerComposition: { version: STICKER_COMPOSITION_VERSION, stickers: [] },
  col12CoachmarkSeen: false,
};

const prefsSlice = createSlice({
  name: 'prefs',
  initialState,
  reducers: {
    setCollectionView(state, action: PayloadAction<CollectionView>) {
      state.collectionView = action.payload;
    },
    setShellId(state, action: PayloadAction<ShellId>) {
      state.shellId = action.payload;
    },
    setThemeId(state, action: PayloadAction<ScreenThemeId>) {
      state.themeId = action.payload;
    },
    setStickerComposition(state, action: PayloadAction<StickerComposition>) {
      state.stickerComposition = action.payload;
    },
    // COL-12 — latch the coachmark as seen (fired on the first flip or an explicit dismiss); never unset.
    setCol12CoachmarkSeen(state, action: PayloadAction<boolean>) {
      state.col12CoachmarkSeen = action.payload;
    },
  },
});

export const {
  setCollectionView,
  setShellId,
  setThemeId,
  setStickerComposition,
  setCol12CoachmarkSeen,
} = prefsSlice.actions;
export default prefsSlice.reducer;
