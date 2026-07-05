import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { router } from 'expo-router';
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
} from '@ingame/shared';
import type { RootState } from './index';
import { setTokens } from './authSlice';
import { saveTokens } from '../auth/tokenStore';

// F31 — RTK Query bound to the shared zod schemas (the executable api-contract). Response types are
// the z.infer types from @ingame/shared; the load-bearing reads additionally PARSE the response with
// the schema so a FE↔BE shape drift is caught at the seam, not deep in a component. The access token
// is attached from the in-memory auth slice (rehydrated from expo-secure-store, F14).

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

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
  tagTypes: ['Me', 'Collection', 'Catalog'],
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
      invalidatesTags: ['Collection', 'Me', 'Catalog'], // counts + own-it flags move too (CAT-09)
      transformResponse: (raw): CollectionItem => collectionItemSchema.parse(raw),
    }),
    updateEntry: build.mutation<CollectionItem, { entryId: string } & UpdateCollectionEntryRequest>({
      query: ({ entryId, ...body }) => ({
        url: `/me/collection/${entryId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Collection', 'Me'],
    }),
    removeEntry: build.mutation<OkResponse, string>({
      query: (entryId) => ({ url: `/me/collection/${entryId}`, method: 'DELETE' }),
      invalidatesTags: ['Collection', 'Me', 'Catalog'],
    }),
    setNowPlaying: build.mutation<OkResponse, NowPlayingRequest>({
      query: (body) => ({ url: '/me/now-playing', method: 'PUT', body }),
      invalidatesTags: ['Collection', 'Me'],
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
      invalidatesTags: ['Catalog'],
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
} = api;
