import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import {
  selfProfileSchema,
  collectionResponseSchema,
  collectionItemSchema,
  catalogItemSchema,
  genresResponseSchema,
  type SelfProfile,
  type AuthSession,
  type LoginRequest,
  type RegisterRequest,
  type UsernameAvailability,
  type CollectionResponse,
  type CollectionItem,
  type CatalogItem,
  type CatalogListResponse,
  type GenresResponse,
  type CreateGameRequest,
  type AddCollectionEntryRequest,
  type UpdateCollectionEntryRequest,
  type NowPlayingRequest,
  type OkResponse,
  type CardDesignView,
  cardDesignSchema,
  type CreateCardRequest,
  type UpdateCardRequest,
  type MyCardsResponse,
  type EntryCardsResponse,
  type StylePresetsResponse,
  type CreateStylePresetRequest,
  type StylePresetView,
  type DeviceResponse,
  type LooksResponse,
  type LookResponse,
  type PatchDeviceRequest,
  deviceResponseSchema,
  type StoreResponse,
  type WalletResponse,
  type LedgerResponse,
  type DailyBonusResponse,
  type IapValidateRequest,
  type IapValidateResponse,
  type EntitlementsResponse,
  type AcquireResponse,
  type AcquireBatchResponse,
  type AcquireBatchRequest,
  type CosmeticsResponse,
  storeResponseSchema,
  walletResponseSchema,
  ledgerResponseSchema,
  cosmeticsResponseSchema,
} from '@ingame/shared';
import type { RootState } from './index';
import { setTokens } from './authSlice';
import { saveTokens } from '../auth/tokenStore';

// F31 — RTK Query bound to the shared zod schemas (the executable api-contract). Response types are
// the z.infer types from @ingame/shared; the load-bearing reads additionally PARSE the response with
// the schema so a FE↔BE shape drift is caught at the seam, not deep in a component. The access token
// is attached from the in-memory auth slice (rehydrated from expo-secure-store, F14).

// Base URL split by target. Native (the phone via Expo Go) uses this machine's LAN IP from
// `apps/mobile/.env` so a device on the same Wi-Fi can reach the API. The dev browser (web target) runs
// ON this machine, and a cross-origin POST from localhost:8082 → the LAN IP (192.168.x.x) trips Chrome's
// Private Network Access guard — the login OPTIONS preflight returns 200 but the actual POST is silently
// blocked (the "web login freeze" — reproduced 2026-07-05). `localhost` is same address-space, no PNA —
// so on web we always talk to localhost:4000. Web is a dev/testing convenience only (CLAUDE.md), never
// shipped, so this never reaches a real user. Leaves the phone's `.env` (and :8081 lane) untouched.
const API_BASE =
  Platform.OS === 'web'
    ? 'http://localhost:4000/api'
    : (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api');

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

function urlOf(args: string | FetchArgs): string {
  return typeof args === 'string' ? args : args.url;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// A refresh either succeeds, is DEFINITIVELY refused (the token is dead → sign out), or fails
// transiently (network blip / 5xx / a proxy's malformed 200 → surface the error, keep the session).
type RefreshOutcome = { kind: 'ok'; tokens: TokenPair } | { kind: 'refused' } | { kind: 'transient' };

// Single-flight: N parallel 401s share ONE refresh attempt (rotation means a second concurrent
// refresh with the same token would trip the F15 reuse-detection and revoke the whole family).
let refreshPromise: Promise<RefreshOutcome> | null = null;

/**
 * OQ-123 — self-healing sessions. An authenticated request that 401s tries ONE silent refresh
 * (AUTH-02 rotation) and retries; a DEFINITIVELY refused refresh tears the session down (F20 purge +
 * F14 clear) and lands on /sign-in. A transient failure surfaces the original error WITHOUT signing
 * the user out — a proxy hiccup must not eject a still-valid session.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const is401 = result.error?.status === 401;
  if (!is401 || urlOf(args).startsWith('/auth/')) return result;

  // F-17 — the post-logout sign-in FLICKER (a self-perpetuating renderer storm). `logoutTeardown()`
  // — an explicit sign-out, OR the OQ-123 teardown at the bottom of this handler — dispatches
  // `api.util.resetApiState()`, which makes EVERY still-mounted query REFETCH. Those refetches are now
  // tokenless, so each 401s straight back into this handler. Without this guard, each such 401 re-runs
  // the FULL teardown (resetApiState AGAIN + router.replace('/sign-in')) → the cache resets again → a
  // fresh refetch wave → more 401s … an unbounded loop that re-navigates to /sign-in hundreds of times
  // a second (proven on web 2026-07-16: ~1200 fetches + ~400 router.replace in ~4s until the main
  // thread starved; on device it reads as the sign-in screen flickering, barely targetable, cleared
  // only by an app restart). A 401 on a request that carried NO live session is EXPECTED once we're
  // logging out — there is nothing left to tear down — so just surface it. The session is gone the
  // instant `clearSession` runs inside `logoutTeardown`, so this reads true for every refetch in the
  // wave and collapses the loop to a single bounded burst. The genuine "valid session, server refused"
  // 401 still has its token here, so it falls through to the refresh/teardown below unchanged.
  if ((api.getState() as RootState).auth.accessToken == null) return result;

  const refreshToken = (api.getState() as RootState).auth.refreshToken;
  if (refreshToken) {
    if (!refreshPromise) {
      const attempt = (async (): Promise<RefreshOutcome> => {
        const r = await rawBaseQuery(
          { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
          api,
          extraOptions,
        );
        // Only a 401 is a definitive refusal (the refresh token is dead); any other error is transient.
        if (r.error) return r.error.status === 401 ? { kind: 'refused' } : { kind: 'transient' };
        const data = r.data as Partial<TokenPair> | undefined;
        return data?.accessToken && data?.refreshToken
          ? { kind: 'ok', tokens: data as TokenPair }
          : { kind: 'transient' }; // 2xx but no tokens (malformed/proxy body) — don't sign out
      })();
      refreshPromise = attempt;
      void attempt.finally(() => {
        if (refreshPromise === attempt) refreshPromise = null;
      });
    }
    const outcome = await refreshPromise;
    if (outcome.kind === 'transient') return result; // recoverable — surface the 401, keep the session
    if (outcome.kind === 'ok') {
      api.dispatch(setTokens(outcome.tokens));
      await saveTokens(outcome.tokens);
      result = await rawBaseQuery(args, api, extraOptions);
      if (result.error?.status !== 401) return result;
    }
    // outcome.kind === 'refused', or the retried request STILL 401'd → the OQ-123 teardown below.
  }

  // No refresh token, the refresh was refused, or the retry still 401s → the OQ-123 teardown.
  const { logoutTeardown } = await import('./index'); // lazy — avoids the store↔api import cycle
  await logoutTeardown();
  router.replace('/sign-in');
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Me',
    'Collection',
    'Catalog',
    'Cards',
    'Presets',
    'Device',
    'DeviceLooks',
    'Store',
    'Wallet',
    'Ledger',
    'Entitlements',
    'Cosmetics',
    // Declared here (not only via communityApi's enhanceEndpoints) so the base-slice mutations that
    // MOVE community state — publishCard drops a new card into the gallery — can invalidate it. RTK
    // dedupes with communityApi's addTagTypes; the getGameGallery provider still lives in communityApi.
    'CommunityCards',
    // W-A8 (walk2) — same precedent: declared here so the UNLOCK-TRIGGERING mutations (mapped from the
    // seeded ACH criteria's events, P11 manifest) can invalidate the /me/achievements read → the ACH-06
    // CelebrationHost's refetch-delta fires ON the action, not on the next focus/restart. The provider
    // lives in achievementsApi (its enhanceEndpoints dedupes). Only the mapped mutations carry it — no
    // blanket invalidation chatter. Other-ACTOR unlocks (a13/a14/a15 adoptions-received/reach, b8's
    // recommender credit) still ride focus/reconnect until the M7 push (accepted residual).
    'MeAchievements',
  ],
  endpoints: (build) => ({
    // ── auth ──────────────────────────────────────────────────────────────────────────────────
    register: build.mutation<AuthSession, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['Me', 'Collection', 'Catalog'],
    }),
    login: build.mutation<AuthSession, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me', 'Collection', 'Catalog'],
    }),
    // W3 (AUTH-11) — the ADVISORY username pre-check; authoritative enforcement stays at register.
    usernameAvailable: build.query<UsernameAvailability, string>({
      query: (u) => `/auth/username-available?u=${encodeURIComponent(u)}`,
    }),

    // ── me ────────────────────────────────────────────────────────────────────────────────────
    getMe: build.query<SelfProfile, void>({
      query: () => '/me',
      providesTags: ['Me'],
      transformResponse: (raw): SelfProfile => selfProfileSchema.parse(raw),
    }),

    // ── collection (COL-01..07, WTP-03) ───────────────────────────────────────────────────────
    getCollection: build.query<CollectionResponse, void>({
      query: () => '/me/collection',
      providesTags: ['Collection'],
      transformResponse: (raw): CollectionResponse => collectionResponseSchema.parse(raw),
    }),
    addToCollection: build.mutation<CollectionItem, AddCollectionEntryRequest>({
      query: (body) => ({ url: '/me/collection', method: 'POST', body }),
      // MeAchievements (W-A8) — collection.entry_added triggers a3 shelf_starter (+ the b8 recipient add).
      invalidatesTags: ['Collection', 'Me', 'Catalog', 'MeAchievements'], // counts + own-it flags move too (CAT-09)
      transformResponse: (raw): CollectionItem => collectionItemSchema.parse(raw),
    }),
    // P6/R2 (perf-investigation §R2 · fix-wave #3) — the three everyday shelf writes PATCH the cached
    // shelf instead of invalidating it. `'Collection'` is provided by ONE query (`getCollection`,
    // unpaginated + zod-reparsed), and it is subscribed by screens that never unmount — both tabs plus
    // every game page retained on the stack — so each invalidation cost a full-shelf GET + a re-parse +
    // brand-new object identities for every row, which defeats FlipCard's/EntryCard's memos and hands a
    // new composition prop to every live skia canvas on the shelf. Patching keeps the SAME identities for
    // untouched rows, so only the row that actually changed re-renders. Every patch either mirrors the
    // server's own write exactly (see each recipe) or is reconciled from the response, and every
    // optimistic one has a rollback. The non-'Collection' tags are UNCHANGED — 'Me' (profile stats +
    // nowPlaying), 'Catalog' (CAT-09 own-it flags) and 'MeAchievements' (W-A8 on-action celebration)
    // still invalidate exactly as before; only the full-shelf refetch is gone.
    updateEntry: build.mutation<CollectionItem, { entryId: string } & UpdateCollectionEntryRequest>({
      query: ({ entryId, ...body }) => ({
        url: `/me/collection/${entryId}`,
        method: 'PATCH',
        body,
      }),
      // MeAchievements (W-A8) — a status update (→ beaten) triggers a12 beaten_path.
      // Walk-4 Murr (batch-3 major) — an EQUIP keeps the full 'Collection' invalidation: the P2 add-flow
      // chains this equip right after an adopt/publish, whose OWN 'Collection' invalidation dispatches a
      // slow full-shelf GET in the same beat; without a post-equip refetch, that pre-equip snapshot can
      // land LAST and wholesale-replace the reconciled cache (patches are never re-applied) — the new
      // entry would visibly wear the DEFAULT card after the settle said otherwise. Equips are rare
      // (never the log-hours/autosave hot path), and the invalidation is dispatched after the PATCH
      // fulfils, which serializes the refetch AFTER the equip by construction. Plain field updates keep
      // the R2 no-refetch posture.
      invalidatesTags: (_r, _e, arg) =>
        arg.activeCardDesignId !== undefined ? ['Me', 'MeAchievements', 'Collection'] : ['Me', 'MeAchievements'],
      // F31 — the reconcile inserts into a zod-parsed cache, so the response parses at the seam too
      // (shape drift throws loudly instead of corrupting the cache silently).
      transformResponse: (raw): CollectionItem => collectionItemSchema.parse(raw),
      async onQueryStarted({ entryId, ...body }, { dispatch, queryFulfilled }) {
        // The OPTIMISTIC half covers the plain COL-02/03/05 fields only — each is stored verbatim by
        // collection-service.updateEntry, so the patch is exactly what the server will do. The COL-06
        // equip (`activeCardDesignId`) is deliberately NOT optimistic: the `card` rider is server-
        // resolved (own design → adopted → CARD-18 default stub), so it lands in the reconcile below.
        const optimistic = dispatch(
          api.util.updateQueryData('getCollection', undefined, (draft) => {
            const item = draft.items.find((i) => i.entryId === entryId);
            if (!item) return;
            if (body.status !== undefined) item.status = body.status;
            if (body.hours !== undefined) item.hours = body.hours;
            if (body.percentComplete !== undefined) item.percentComplete = body.percentComplete;
            if (body.ownedSince !== undefined) item.ownedSince = body.ownedSince;
            if (body.rating !== undefined) item.rating = body.rating;
            if (body.notes !== undefined) item.notes = body.notes;
          }),
        );
        try {
          // PATCH /me/collection/:entryId returns the FULL updated item (the same assembleItem the
          // list serializer uses), so the reconcile gives the row byte-identical data to what a
          // refetch would have produced — including the equipped card rider — for zero extra requests.
          const { data } = await queryFulfilled;
          dispatch(
            api.util.updateQueryData('getCollection', undefined, (draft) => {
              const idx = draft.items.findIndex((i) => i.entryId === entryId);
              if (idx !== -1) draft.items[idx] = data;
            }),
          );
        } catch {
          // Undo, then HEAL with a refetch (walk-4 Murr minor — perf-investigation's own directive:
          // "keep invalidation as the fallback on error"). Path-based undo misbehaves under OVERLAPPING
          // in-flight mutations (the failed one's inverse patches clobber the survivor's state); errors
          // are rare, so the healing refetch costs nothing on the hot path and restores server truth.
          optimistic.undo(); // a 422 (hours cap / unequippable design) or a dropped connection
          dispatch(api.util.invalidateTags(['Collection']));
        }
      },
    }),
    removeEntry: build.mutation<OkResponse, string>({
      query: (entryId) => ({ url: `/me/collection/${entryId}`, method: 'DELETE' }),
      invalidatesTags: ['Me', 'Catalog'],
      // Applied ON SUCCESS, not optimistically — deliberately. Removal is only ever triggered from the
      // game page, which awaits the mutation and then `router.back()`s; dropping the row early would
      // pull the entry out from under the OWN posture while the request is still in flight and flash
      // the CATALOG posture for the round-trip. Same visible ordering as the old invalidation, minus
      // the refetch. (The shelf's own totals move with it — the server drops one entry, no re-sort.)
      async onQueryStarted(entryId, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            api.util.updateQueryData('getCollection', undefined, (draft) => {
              const idx = draft.items.findIndex((i) => i.entryId === entryId);
              if (idx === -1) return;
              draft.items.splice(idx, 1);
              draft.total = Math.max(0, draft.total - 1);
              draft.collectionTotal = Math.max(0, draft.collectionTotal - 1);
            }),
          );
        } catch {
          /* nothing was applied — the shelf still holds the entry, exactly as before */
        }
      },
    }),
    setNowPlaying: build.mutation<OkResponse, NowPlayingRequest>({
      query: (body) => ({ url: '/me/now-playing', method: 'PUT', body }),
      invalidatesTags: ['Me'],
      // WTP-03 is a SINGLE pin stored on the profile (`profile.now_playing_game_id`), and the shelf's
      // per-item `nowPlaying` is derived from it (`item.gameId === nowPlayingGameId`) — so mirroring the
      // server means setting the flag on the pinned game and clearing it everywhere else. `gameId: null`
      // clears the pin. Optimistic (the ▶ NOW tag is what the tap is FOR) with an undo on failure.
      async onQueryStarted({ gameId }, { dispatch, queryFulfilled }) {
        const optimistic = dispatch(
          api.util.updateQueryData('getCollection', undefined, (draft) => {
            for (const item of draft.items) item.nowPlaying = item.gameId === gameId;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          // Undo + heal (walk-4 Murr minor): an A→B pin race where A fails AFTER B applied would
          // otherwise undo(A) into a two-pins state (`hero` picks the wrong row). See updateEntry.
          optimistic.undo(); // e.g. 422 not_in_collection — the pin is left exactly as it was
          dispatch(api.util.invalidateTags(['Collection']));
        }
      },
    }),

    // ── cards + style presets (CARD-14/24, COL-06 — decision 0066 / api 0.53) ─────────────────
    getMyCards: build.query<MyCardsResponse, void>({
      query: () => '/me/cards',
      providesTags: ['Cards'],
    }),
    getEntryCards: build.query<EntryCardsResponse, string>({
      query: (entryId) => `/me/collection/${entryId}/cards`,
      providesTags: ['Cards'],
    }),
    createCard: build.mutation<CardDesignView, CreateCardRequest>({
      query: (body) => ({ url: '/cards', method: 'POST', body }),
      invalidatesTags: ['Cards'],
    }),
    // The CARD-24a AUTOSAVE. It DOES invalidate (murr F1 — the stale-cache resume destroyed edits:
    // a cached getMyCards row served the OLD composition on re-entry, and the next autosave
    // overwrote the new one on the server). The PATCH is debounced ~1.2s, so that costs a couple of
    // small card GETs per editing PAUSE — personal scale; simple beats clever here. What is NOT small
    // is the shelf, so its half of the refresh moved from a refetch to a patch (P6/R2, below).
    updateCard: build.mutation<CardDesignView, { cardId: string } & UpdateCardRequest>({
      query: ({ cardId, ...body }) => ({ url: `/cards/${cardId}`, method: 'PATCH', body }),
      // P6/R2 — 'Cards' invalidation UNCHANGED (murr F1: a stale getMyCards row served the OLD
      // composition on re-entry and the next autosave overwrote the new one). 'Collection' is NARROWED
      // to the equipped-card case: the shelf only cares about this design when it is the rider on one of
      // its rows (murr F4), and then only for the fields the rider carries — so patch that ONE row from
      // the PATCH's authoritative response instead of refetching all N. When the edited design is
      // equipped nowhere (the common styler case — a draft/unequipped card), the shelf is untouched and
      // the ~1.2s-debounced autosave stops firing a full-shelf GET per editing PAUSE.
      invalidatesTags: ['Cards'],
      // F31 (walk-4 Murr minor) — the rider copy below writes into a zod-parsed cache; parse the PATCH
      // response at the seam so shape drift throws loudly instead of corrupting the shelf silently.
      transformResponse: (raw): CardDesignView => cardDesignSchema.parse(raw),
      async onQueryStarted({ cardId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            api.util.updateQueryData('getCollection', undefined, (draft) => {
              const item = draft.items.find((i) => i.card.id === cardId);
              if (!item) return; // not equipped anywhere — nothing on the shelf shows this design
              item.card.name = data.name;
              item.card.composition = data.composition; // the owner renders the rider LIVE (0066 §2)
              item.card.imageUrl = data.imageUrl;
              item.card.thumbUrl = data.thumbUrl;
              item.card.isPremium = data.isPremium;
            }),
          );
        } catch {
          /* the autosave owns its own retry (styler); a failed PATCH changed nothing to mirror */
        }
      },
    }),
    savePrivateCard: build.mutation<CardDesignView, string>({
      query: (cardId) => ({ url: `/cards/${cardId}/save-private`, method: 'POST' }),
      // Me — stats.cardsDesigned counts finished designs; Collection — the equipped rider (murr F4).
      invalidatesTags: ['Cards', 'Me', 'Collection'],
    }),
    deleteCard: build.mutation<OkResponse, string>({
      query: (cardId) => ({ url: `/cards/${cardId}`, method: 'DELETE' }),
      invalidatesTags: ['Cards', 'Me'],
    }),
    getStylePresets: build.query<StylePresetsResponse, void>({
      query: () => '/me/style-presets',
      providesTags: ['Presets'],
    }),
    createStylePreset: build.mutation<StylePresetView, CreateStylePresetRequest>({
      query: (body) => ({ url: '/me/style-presets', method: 'POST', body }),
      invalidatesTags: ['Presets'],
    }),

    // ── device editor (M4 §3.5 — DEV-01..05 · decision 0030; ARCH 3 ONE write pipeline) ────────
    // The whole editor funnels through updateDevice (shell · theme · sticker · look-apply). getDevice
    // returns the live three facets (or the free DEFAULTS when the user has no row — DEV-03). The PATCH
    // returns the authoritative device, so the client applies the response directly; it also invalidates
    // ['Device'] so the Profile MY DEVICE strip refreshes on return (a couple of small GETs per editing
    // PAUSE — the debounce means at most one PATCH per ~1.5s pause; the styler-autosave precedent).
    getDevice: build.query<DeviceResponse, void>({
      query: () => '/me/device',
      providesTags: ['Device'],
      transformResponse: (raw): DeviceResponse => deviceResponseSchema.parse(raw),
    }),
    updateDevice: build.mutation<DeviceResponse, PatchDeviceRequest>({
      query: (body) => ({ url: '/me/device', method: 'PATCH', body }),
      invalidatesTags: ['Device'],
      transformResponse: (raw): DeviceResponse => deviceResponseSchema.parse(raw),
    }),
    // LOOKS (DEV-05) — the endpoints land here so api.ts is touched once; the LOOKS UI is a later packet.
    getLooks: build.query<LooksResponse, void>({
      query: () => '/me/device/looks',
      providesTags: ['DeviceLooks'],
    }),
    saveLook: build.mutation<LookResponse, void>({
      // SAVE CURRENT — the look is snapshotted SERVER-SIDE from the live device (empty body; cap ~12 →
      // 409 LOOK_CAP_REACHED). Own device unchanged, so only the looks list invalidates.
      query: () => ({ url: '/me/device/looks', method: 'POST', body: {} }),
      invalidatesTags: ['DeviceLooks'],
    }),
    deleteLook: build.mutation<OkResponse, string>({
      query: (lookId) => ({ url: `/me/device/looks/${lookId}`, method: 'DELETE' }),
      invalidatesTags: ['DeviceLooks'],
    }),

    // ── store · wallet · economy (M5 — ECON-01..11 · COSM-03 · decision 0072/0073 · api 0.57) ──────
    // The Store front (ECON-10 pack ladder + honest-empty premium/drops). Parsed at the seam (the
    // executable contract). Invalidated by an IAP grant (the Starter `purchased` flag flips).
    getStore: build.query<StoreResponse, void>({
      query: () => '/store',
      providesTags: ['Store'],
      transformResponse: (raw): StoreResponse => storeResponseSchema.parse(raw),
    }),
    // The wallet balance + the daily-bonus availability (ECON-02/07). The header CurrencyCounter + the
    // DailyBonusBar both read this; every currency mutation invalidates ['Wallet'] so the count re-reads.
    getWallet: build.query<WalletResponse, void>({
      query: () => '/me/wallet',
      providesTags: ['Wallet'],
      transformResponse: (raw): WalletResponse => walletResponseSchema.parse(raw),
    }),
    // The ledger page (ECON-07), newest-first. Arg = the opaque cursor (undefined = the first page).
    // Each cursor is its own cache entry; the Wallet view accumulates pages in component state via the
    // lazy hook (simpler + correct vs an RTK merge, which mis-refetches a middle page on invalidation).
    getLedger: build.query<LedgerResponse, string | undefined>({
      query: (cursor) =>
        cursor ? `/me/wallet/ledger?cursor=${encodeURIComponent(cursor)}` : '/me/wallet/ledger',
      providesTags: ['Ledger'],
      transformResponse: (raw): LedgerResponse => ledgerResponseSchema.parse(raw),
    }),
    claimDailyBonus: build.mutation<DailyBonusResponse, void>({
      query: () => ({ url: '/me/daily-bonus', method: 'POST', body: {} }),
      // MeAchievements (W-A8) — the daily claim triggers a10 ladder_graduate + b6 night_shift.
      invalidatesTags: ['Wallet', 'Ledger', 'MeAchievements'],
    }),
    // POST /iap/validate — a pack purchase (receipt) OR restore (rcUserId). Grants → balance + a ledger
    // row + (for the Starter) a purchased flag, so all three invalidate. The client mints the mock
    // receipt (store/mockReceipt.ts) at DEV; the real StoreKit receipt is the P2b seam.
    validateIap: build.mutation<IapValidateResponse, IapValidateRequest>({
      query: (body) => ({ url: '/iap/validate', method: 'POST', body }),
      invalidatesTags: ['Wallet', 'Ledger', 'Store'],
    }),
    getEntitlements: build.query<EntitlementsResponse, void>({
      query: () => '/me/entitlements',
      providesTags: ['Entitlements'],
    }),
    // GET /cosmetics (COSM-01, decision 0075) — the full free+premium library with per-item `price` +
    // caller-scoped `owned` flags. The CARD-13 premium-in-editor surfaces (Styler rails / Device rows /
    // reconcile cost-stack) read this to price + own-flag every premium cosmetic (parsed at the seam).
    getCosmetics: build.query<CosmeticsResponse, void>({
      query: () => '/cosmetics',
      providesTags: ['Cosmetics'],
      transformResponse: (raw): CosmeticsResponse => cosmeticsResponseSchema.parse(raw),
    }),
    // POST /cosmetics/:id/acquire — the Store BUY (COSM-03/ECON-01). 409 INSUFFICIENT_BALANCE {shortBy}
    // drives the in-sheet bridge; success → an entitlement + a spend ledger row. Cosmetics — the /cosmetics
    // `owned` flags flip, so the editor rails re-read.
    acquireCosmetic: build.mutation<AcquireResponse, string>({
      query: (cosmeticId) => ({ url: `/cosmetics/${cosmeticId}/acquire`, method: 'POST', body: {} }),
      // 'Store' — the featured-storefront tiles carry caller-scoped `owned` flags (M5 F-6), so a buy
      // must re-read /store to flip them (the aisle rides 'Cosmetics').
      invalidatesTags: ['Wallet', 'Ledger', 'Entitlements', 'Cosmetics', 'Store'],
    }),
    // POST /cosmetics/acquire-batch — CARD-13 ACQUIRE ALL (the ReconcileSheet / KeepBar). Atomic against
    // the total; already-owned ids are silent no-ops. Ticks the wallet + flips ownership everywhere.
    acquireCosmeticBatch: build.mutation<AcquireBatchResponse, AcquireBatchRequest>({
      query: (body) => ({ url: '/cosmetics/acquire-batch', method: 'POST', body }),
      invalidatesTags: ['Wallet', 'Ledger', 'Entitlements', 'Cosmetics'],
    }),
    // POST /cards/:id/publish (CARD-13/15/19/20) — the Canvas ◆ PUBLISH. Gates return 409s the client
    // renders as the CARD-19 checklist / ReconcileSheet: MIN_COMPLEXITY · DUPLICATE_COMPOSITION ·
    // PREMIUM_UNRECONCILED {unowned,total}. Success flattens + sets status=published (immutable after).
    // Invalidates CommunityCards so the game's gallery re-reads and the just-published card appears
    // WITHOUT an app restart (owner round-2 bug 3): the general (id-less) tag is a wildcard across every
    // gameId's gallery entry, the same cross-slice pattern adoptCard uses.
    publishCard: build.mutation<CardDesignView, string>({
      query: (cardId) => ({ url: `/cards/${cardId}/publish`, method: 'POST', body: {} }),
      // MeAchievements (W-A8) — card.published triggers a1 first_print / a2 press_operator / b3 renaissance.
      invalidatesTags: ['Cards', 'Me', 'Collection', 'CommunityCards', 'MeAchievements'],
    }),

    // ── catalog (CAT-01..05/09) ───────────────────────────────────────────────────────────────
    getGenres: build.query<GenresResponse, void>({
      query: () => '/genres',
      transformResponse: (raw): GenresResponse => genresResponseSchema.parse(raw),
    }),
    searchCatalog: build.query<CatalogListResponse, string>({
      query: (q) => `/catalog/search?q=${encodeURIComponent(q)}`,
      providesTags: ['Catalog'],
    }),
    getPopular: build.query<CatalogListResponse, void>({
      query: () => '/catalog/popular',
      providesTags: ['Catalog'],
    }),
    createGame: build.mutation<CatalogItem, CreateGameRequest>({
      query: (body) => ({ url: '/catalog/games', method: 'POST', body }),
      // MeAchievements (W-A8) — catalog.game_created triggers a9 contributor.
      invalidatesTags: ['Catalog', 'MeAchievements'],
      transformResponse: (raw): CatalogItem => catalogItemSchema.parse(raw),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useLazyUsernameAvailableQuery,
  useGetCollectionQuery,
  useAddToCollectionMutation,
  useUpdateEntryMutation,
  useRemoveEntryMutation,
  useSetNowPlayingMutation,
  useGetGenresQuery,
  useLazySearchCatalogQuery,
  useGetPopularQuery,
  useCreateGameMutation,
  useGetMyCardsQuery,
  useGetEntryCardsQuery,
  useCreateCardMutation,
  useUpdateCardMutation,
  useSavePrivateCardMutation,
  useDeleteCardMutation,
  useGetStylePresetsQuery,
  useCreateStylePresetMutation,
  useGetDeviceQuery,
  useUpdateDeviceMutation,
  useGetLooksQuery,
  useSaveLookMutation,
  useDeleteLookMutation,
  useGetStoreQuery,
  useGetWalletQuery,
  useLazyGetLedgerQuery,
  useClaimDailyBonusMutation,
  useValidateIapMutation,
  useGetEntitlementsQuery,
  useGetCosmeticsQuery,
  useAcquireCosmeticMutation,
  useAcquireCosmeticBatchMutation,
  usePublishCardMutation,
} = api;
