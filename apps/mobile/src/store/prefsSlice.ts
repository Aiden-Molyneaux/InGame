import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// The PERSISTED slice (F20 — redux-persist holds drafts/cache/prefs ONLY, never tokens). For M2 this
// is the Collection view-mode preference (COL-07 / COL-13: SHELF · GRID · LIST · TOP). It is
// version-keyed and PURGED on logout (the clean-slate / per-user-namespace guarantee).
export type CollectionView = 'shelf' | 'grid' | 'list' | 'top';

export interface PrefsState {
  collectionView: CollectionView;
}

const initialState: PrefsState = { collectionView: 'shelf' };

const prefsSlice = createSlice({
  name: 'prefs',
  initialState,
  reducers: {
    setCollectionView(state, action: PayloadAction<CollectionView>) {
      state.collectionView = action.payload;
    },
  },
});

export const { setCollectionView } = prefsSlice.actions;
export default prefsSlice.reducer;
