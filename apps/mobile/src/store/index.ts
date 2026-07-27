import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
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

// P6/R1 (perf-investigation §R1 · fix-wave #1) — SCOPE the dev-only state-invariant middleware OFF the
// RTK Query cache. `immutableCheck` and `serializableCheck` DEEP-WALK the whole store on EVERY dispatched
// action in dev; the store is dominated by `state.api`, which GROWS all session (a per-arg entry per
// visited gallery/friend/search/feed, pinned by any still-mounted subscriber). That made every dispatch —
// and RTKQ fires a burst of them per interaction — progressively slower, which is the owner's
// "30 minutes to sluggish, a reload fixes it" symptom (the reload empties the cache). Measured here on
// V8 with realistic payloads (phone-Hermes is a further 2-6x worse):
//
//   cached state              before    after (this fix)   prod posture
//   collection N=18 only      1.09 ms     0.05 ms            0.00 ms
//   standing tab set, N=18    3.63 ms     0.01 ms            0.00 ms
//   standing set + N=200     16.97 ms     0.01 ms            0.00 ms
//   standing set + N=2000   139.77 ms     0.04 ms            0.00 ms
//
// SCOPED, not disabled: `ignoredPaths: [api.reducerPath]` PRUNES the walk at the `api` key (RTK's
// trackProperties/detectMutations and findNonSerializableValue all `continue` before recursing into an
// ignored path), so `auth` + `prefs` — the slices WE write reducers for, where an accidental mutation or
// a non-serializable value is a real bug — keep BOTH guard-rails at ~zero cost. The RTK cache is written
// only by RTK itself (immer-managed) and holds JSON off the wire, so the checks never had anything to
// catch there. The ACTION half of the serializable check is untouched (it still inspects every dispatched
// action, incl. RTKQ payloads) — that cost is per-action-size, not cache-size, so it isn't progressive.
// PRODUCTION IS UNCHANGED BY CONSTRUCTION: both middlewares compile to a pass-through when
// NODE_ENV === 'production' (RTK createImmutableStateInvariantMiddleware/createSerializableStateInvariantMiddleware),
// so this only ever alters a DEV build's posture.
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault({
      immutableCheck: { ignoredPaths: [api.reducerPath] },
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredPaths: [api.reducerPath],
      },
    }).concat(api.middleware),
});

export const persistor = persistStore(store);

// setupListeners enables `refetchOnFocus` / `refetchOnReconnect` for the queries that opt in (today
// only the ACH-06 CelebrationHost's /me/achievements subscription — ARCH-A4). It hooks AppState focus +
// NetInfo reconnect, NOT a timer: returning to the app or reconnecting re-reads /me/achievements so a
// new unlock is detected as a refetch-delta — poll-FREE (owner directive). Other queries are unaffected
// (they don't set refetchOnFocus, so the default stays off).
setupListeners(store.dispatch);

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
