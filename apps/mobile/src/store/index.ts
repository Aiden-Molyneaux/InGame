import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import authReducer, { clearSession } from './authSlice';
import prefsReducer, { resetPrefs } from './prefsSlice';
import { clearTokens } from '../auth/tokenStore';

// F20 — redux-persist wraps the PREFS slice ONLY (version-keyed). The auth slice is NOT persisted
// (tokens live in expo-secure-store, F14) and the RTK Query cache is not persisted. Logout PURGES the
// persisted store + resets the RTK cache + clears the secure-store tokens — a clean slate with no
// cross-user leak (the per-user-namespace guarantee).
const prefsPersistConfig = { key: 'ingame_prefs', version: 1, storage: AsyncStorage };

const rootReducer = combineReducers({
  auth: authReducer,
  prefs: persistReducer(prefsPersistConfig, prefsReducer),
  [api.reducerPath]: api.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
    }).concat(api.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/** F20/F14 — the full logout teardown: reset in-memory prefs, purge persisted prefs, reset the API
 *  cache, clear tokens. `resetPrefs` must fire alongside `persistor.purge()`: purge only clears the
 *  async STORAGE, so without the in-memory reset an ACTIVE device-editor preview (a premium shell/theme
 *  dispatched to the prefs slice) survived logout and bled into the sign-in screen + the next user's
 *  first frames (owner round-2 bug 7). */
export async function logoutTeardown(): Promise<void> {
  store.dispatch(clearSession());
  store.dispatch(resetPrefs());
  store.dispatch(api.util.resetApiState());
  await persistor.purge();
  await clearTokens();
}
