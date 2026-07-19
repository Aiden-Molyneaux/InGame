import type {
  ContributionsResponse,
  ContributionsCardsPage,
  ContributionsGamesPage,
} from '@ingame/shared';
import {
  contributionsResponseSchema,
  contributionsCardsPageSchema,
  contributionsGamesPageSchema,
} from '@ingame/shared';
import { api } from './api';

// P13 contributor-profile endpoint (CAT-07 · api-contract §Catalog). INJECTED into the base `api`
// slice from its own file (the communityApi.ts precedent) — the concurrent styler/device track owns
// api.ts, so this packet touches it zero times. `enhanceEndpoints` adds the `Contributions` tag the
// base slice doesn't declare; `injectEndpoints` merges into the same reducer/middleware.
//
// FLATTENED-ONLY (OQ-122 / CARD-15): the contributor shapes carry `imageUrl`/`thumbUrl`, NEVER
// `composition` — cross-user cards render as images (via EntryCard), never live skia.
//
// The base endpoint is LIVE since M5 P3; the VIEW-ALL cursor sub-lists (…/cards?cursor= ·
// …/games?cursor=) went LIVE in M6 P13 (both server sub-routes exist — friend-only, cursor-paginated,
// `{ items, nextCursor }`). W-1 builds the real client: dedicated /contributor/[id]/cards + /games
// routes page over these (the accumulation lives in the RTK-free useContributorPaging hook).
// `standing` is server-null at M6 (CAT-10 ranking rides M7).
const contributorApi = api.enhanceEndpoints({ addTagTypes: ['Contributions'] }).injectEndpoints({
  endpoints: (build) => ({
    // GET /users/:id/contributions — the CAT-07 pride surface, two privacy-gated shapes (PROF-03):
    // friend/self carries signatureCard/topCards/topGames; non-friend/limited carries stats+standing
    // only (those set-piece fields absent). Blocked/suspended/deleted → a generic 404 (MOD-09). Parsed
    // at the seam so a shape drift is caught here, not deep in the screen.
    getContributions: build.query<ContributionsResponse, string>({
      query: (userId) => `/users/${userId}/contributions`,
      transformResponse: (raw): ContributionsResponse => contributionsResponseSchema.parse(raw),
      providesTags: (_res, _err, userId) => [{ type: 'Contributions', id: userId }],
    }),

    // GET /users/:id/contributions/cards?cursor= (CAT-07 VIEW ALL cards) — friend-only (PROF-03 → 403),
    // cursor-paginated. The arg is { userId, cursor? }; each distinct arg is its own cache entry (the
    // page-1/no-cursor entry is a subscription, later pages ride the lazy hook + accumulate in the
    // screen — the feedApi precedent). MOD-09 non-disclosure → 404; a non-friend → 403.
    getContributionsCards: build.query<ContributionsCardsPage, { userId: string; cursor?: string }>({
      query: ({ userId, cursor }) =>
        cursor
          ? `/users/${userId}/contributions/cards?cursor=${encodeURIComponent(cursor)}`
          : `/users/${userId}/contributions/cards`,
      transformResponse: (raw): ContributionsCardsPage => contributionsCardsPageSchema.parse(raw),
      providesTags: (_res, _err, { userId }) => [{ type: 'Contributions', id: userId }],
    }),

    // GET /users/:id/contributions/games?cursor= (CAT-07/CAT-09 VIEW ALL games) — friend-only, paginated.
    getContributionsGames: build.query<ContributionsGamesPage, { userId: string; cursor?: string }>({
      query: ({ userId, cursor }) =>
        cursor
          ? `/users/${userId}/contributions/games?cursor=${encodeURIComponent(cursor)}`
          : `/users/${userId}/contributions/games`,
      transformResponse: (raw): ContributionsGamesPage => contributionsGamesPageSchema.parse(raw),
      providesTags: (_res, _err, { userId }) => [{ type: 'Contributions', id: userId }],
    }),
  }),
});

export const {
  useGetContributionsQuery,
  useGetContributionsCardsQuery,
  useLazyGetContributionsCardsQuery,
  useGetContributionsGamesQuery,
  useLazyGetContributionsGamesQuery,
} = contributorApi;

export { contributorApi };
