import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SelfProfile } from '@ingame/shared';

// The auth slice — IN-MEMORY only. It is NOT redux-persisted: the tokens live in expo-secure-store
// (F14), and this slice is rehydrated from there on launch. `user` is the GET /me self-shape.
export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SelfProfile | null;
}

const initialState: AuthState = { accessToken: null, refreshToken: null, user: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; user: SelfProfile }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
    },
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    setUser(state, action: PayloadAction<SelfProfile | null>) {
      state.user = action.payload;
    },
    clearSession(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
    },
  },
});

export const { setSession, setTokens, setUser, clearSession } = authSlice.actions;
export default authSlice.reducer;
