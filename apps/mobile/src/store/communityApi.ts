import type {
  GameGalleryResponse,
  AdoptResponse,
  TrendingCardsResponse,
  OkResponse,
} from '@ingame/shared';
import { gameGalleryResponseSchema, adoptResponseSchema, trendingCardsResponseSchema } from '@ingame/shared';
import { api } from './api';

// P8 community endpoints (M5 · decision 0072/0073 · api-contract 0.60/0.61). These are INJECTED into the
// base `api` slice from a separate file — the concurrent styler/canvas/device track owns api.ts, so this
// packet touches it zero times. `enhanceEndpoints` adds the two new tag types the base slice doesn't
// declare (CommunityCards · TrendingCards); `injectEndpoints` then merges the endpoints into the same
// underlying reducer/middleware, so cross-invalidation of the base tags (Wallet/Ledger/Entitlements/
// Collection/Cards) works exactly as if these lived in api.ts.
//
// FLATTENED-ONLY (OQ-138 / CARD-15): the gallery + trending shapes carry `imageUrl`/`thumbUrl` +
// attribution, NEVER `composition` — cross-user cards render as images, never live skia (0066 §2).
const communityApi = api
  .enhanceEndpoints({ addTagTypes: ['CommunityCards', 'TrendingCards'] })
  .injectEndpoints({
    endpoints: (build) => ({
      // GET /games/:gameId/cards — other users' PUBLISHED cards for a game, personalized `priceForYou`
      // (the caller's missing-components sum, decision 0072), block-filtered (SOC-09). Parsed at the seam.
      getGameGallery: build.query<GameGalleryResponse, string>({
        query: (gameId) => `/games/${gameId}/cards`,
        transformResponse: (raw): GameGalleryResponse => gameGalleryResponseSchema.parse(raw),
        providesTags: (_res, _err, gameId) => [{ type: 'CommunityCards', id: gameId }],
      }),

      // POST /cards/:id/adopt — atomic acquire of the card's missing premium components + the free design
      // grant (0072). Success drops the card into the adopter's switcher (COL-06) and may debit PX, so it
      // invalidates the wallet/ledger/entitlements AND the switcher feed (Cards/Collection); the gallery
      // re-reads because adoptionCount + everyone's priceForYou moved.
      // F-8 (E3-1b): adopt GRANTS the card's premium components as entitlements (same as a Store buy —
      // card-service acquireComponents), so it MUST invalidate the OWNED-flag reads the editors bind to
      // — `Cosmetics` (the /cosmetics `owned` flags the Styler rails / Device rows read) and `Store`
      // (the featured tiles' caller-scoped `owned`). Without these the just-adopted components read as
      // UNOWNED in the editors until an app restart (owner device-walk 🚩). Mirrors `acquireCosmetic`.
      adoptCard: build.mutation<AdoptResponse, string>({
        query: (cardId) => ({ url: `/cards/${cardId}/adopt`, method: 'POST', body: {} }),
        transformResponse: (raw): AdoptResponse => adoptResponseSchema.parse(raw),
        invalidatesTags: [
          'Wallet',
          'Ledger',
          'Entitlements',
          'Cosmetics',
          'Store',
          'Collection',
          'Cards',
          'CommunityCards',
        ],
      }),

      // GET /discover/trending-cards (OQ-055) — featured community cards ranked by adoption, block-filtered.
      // NON-COMMERCE (counts, no prices). Wired into the data layer now; the Discover SURFACE is M6 (no
      // rail renders it today — the AdoptCardSheet is reusable for it — see gallery-manifest GAP).
      getTrendingCards: build.query<TrendingCardsResponse, void>({
        query: () => '/discover/trending-cards',
        // P10 — parse at the seam now that the Discover surface consumes it (was untyped-raw when only the
        // data layer existed). Non-commerce: counts, never prices.
        transformResponse: (raw): TrendingCardsResponse => trendingCardsResponseSchema.parse(raw),
        providesTags: ['TrendingCards'],
      }),

      // POST /me/blocks — SOC-09-light (0073 §0.6): blocking a designer removes their cards from the
      // caller's community views (their adopted copy is kept, MOD-08). ⚠ GAP: the ROUTE is not yet
      // registered server-side (only the block READ substrate exists) — this 404s live until the server
      // SOC tail lands. Wired to the api-contract path so the client half is complete + correct.
      blockUser: build.mutation<OkResponse, string>({
        query: (userId) => ({ url: '/me/blocks', method: 'POST', body: { userId } }),
        invalidatesTags: ['CommunityCards', 'TrendingCards'],
      }),

      // NOTE: the CARD-21 share-image (GET /cards/:id/share-image) is deliberately NOT an RTK endpoint.
      // Its raw PNG is a Blob — storing a fulfilled Blob in redux tripped the serializability check
      // (owner round-2 bug 6). It is fetched off-store by `shareCardImage` (store/shareCard.ts) with a
      // plain authenticated fetch/download instead — a binary that never needs caching stays out of the
      // tag graph entirely.
    }),
  });

export const {
  useGetGameGalleryQuery,
  useAdoptCardMutation,
  useGetTrendingCardsQuery,
  useBlockUserMutation,
} = communityApi;

export { communityApi };
