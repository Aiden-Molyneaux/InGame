import type { ContributionsResponse } from '@ingame/shared';
import { contributionsResponseSchema } from '@ingame/shared';
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
// …/games?cursor=) stay contract-only (drawn-not-built) — P13 renders VIEW ALL over this base
// top-N payload (see the screen). `standing` is server-null at M6 (CAT-10 ranking rides M7).
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
  }),
});

export const { useGetContributionsQuery } = contributorApi;

export { contributorApi };
