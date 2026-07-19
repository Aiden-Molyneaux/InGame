import type {
  SelfProfile,
  PatchMeRequest,
  GamertagView,
  CreateGamertagRequest,
  OkResponse,
} from '@ingame/shared';
import { selfProfileSchema } from '@ingame/shared';
import { api } from './api';

// W-C4 Profile-edit endpoints (PROF-02/03/06 · api-contract PROF section). INJECTED into the base `api`
// slice from its own file (the settingsApi/reportApi/communityApi convention) — api.ts is off-limits
// this packet. All three seams are LIVE (confirmed against apps/api/src/routes/me-routes.ts).
//
// The per-field commit (OQ-034 · board Edit-mode doctrine) rides these directly: each editable field
// PATCHes on blur/toggle; gamertag add/remove fire immediately. `patchMe` returns the full self-view,
// so parsing it at the seam repaints the identity everywhere — it drives an OPTIMISTIC getMe-cache
// patch, NOT a `Me` invalidation (see patchMe below).
const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    // PATCH /me — username · bio · favouriteGenreIds · favouriteGameId · privacy (patchMeRequestSchema).
    // MOD-07 screening + PROF-06 cooldown + uniqueness are enforced server-side; a rejection is a
    // VALIDATION_ERROR with field-targeted `details` (api-contract 0.46) the editor surfaces inline.
    //
    // OPTIMISTIC (round-5 N-A2). Favourite-genres (and every field-commit) must flip on the frame the
    // user taps, not after two sequential round-trips. There is NO `Me` invalidation: instead
    //  (a) we patch the getMe cache immediately — so the chip repaints AND the NEXT tap computes off the
    //      already-updated array (kills the rapid-tap last-write-wins race: a second tap that read the
    //      stale `favouriteGenreIds` used to silently revert the first), and
    //  (b) on success we seed the cache from the PATCH's OWN authoritative self-view (already
    //      selfProfileSchema-parsed by transformResponse), reconciling server-derived riders
    //      (favouriteGame expansion, usernameNextChangeAt, stats) WITHOUT a forced GET /me.
    // The heavy GET /me (~12 sequential server queries) is thus off the interaction path entirely.
    patchMe: build.mutation<SelfProfile, PatchMeRequest>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      transformResponse: (raw): SelfProfile => selfProfileSchema.parse(raw),
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        // getMe is a no-arg (void) query — its cache key is `undefined`, matching the getMe definition.
        const undo = dispatch(
          api.util.updateQueryData('getMe', undefined, (draft) => {
            Object.assign(draft, patch);
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(api.util.upsertQueryData('getMe', undefined, data));
        } catch {
          undo.undo(); // the PATCH was rejected/failed — roll the optimistic patch back
        }
      },
    }),
    // POST /me/gamertags (PROF-02) — { platform, handle }; the handle is screened server-side (422 →
    // the inline error). Returns the created GamertagView; the identity re-reads via the Me tag.
    addGamertag: build.mutation<GamertagView, CreateGamertagRequest>({
      query: (body) => ({ url: '/me/gamertags', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    // DELETE /me/gamertags/:id (PROF-02) — remove a gamertag chip. Idempotent server-side.
    removeGamertag: build.mutation<OkResponse, string>({
      query: (id) => ({ url: `/me/gamertags/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const { usePatchMeMutation, useAddGamertagMutation, useRemoveGamertagMutation } = profileApi;

export { profileApi };
