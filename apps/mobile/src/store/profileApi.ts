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
    // OPTIMISTIC (round-5 N-A2; hardened round-6 for murr-HIGH out-of-order safety). Favourite-genres
    // (and every field-commit) must flip on the frame the user taps, not after two sequential
    // round-trips. So:
    //  (a) we patch the getMe cache immediately — so the chip repaints AND the NEXT tap computes off the
    //      already-updated array (kills the rapid-tap last-write-wins race: a second tap that read the
    //      stale `favouriteGenreIds` used to silently revert the first), and
    //  (b) once the mutation SETTLES (success OR failure) we reconcile the cache to server truth with a
    //      SINGLE background GET /me (invalidateTags(['Me'])). We deliberately do NOT seed the cache from
    //      the PATCH's own response snapshot: under overlapping rapid toggles an out-of-order resolve
    //      would clobber the cache with the earlier PATCH's stale snapshot, and a rejected earlier
    //      patch's blind undo would drop a later toggle — the post-settle reconcile is what repairs both.
    // The reconcile runs AFTER the optimistic flip, so the heavy GET /me (~12 sequential server queries)
    // stays off the INTERACTION path — the chip never waits on it. RTK dedupes concurrent getMe
    // refetches, so a burst of toggles collapses to a single reconcile.
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
          await queryFulfilled;
        } catch {
          undo.undo(); // the PATCH was rejected/failed — roll THIS optimistic patch back
        } finally {
          // Reconcile to server truth once the mutation has settled. Non-blocking: the optimistic patch
          // already flipped the chip, so this background GET /me does NOT reintroduce the blocking
          // double round-trip N-A2 removed. It self-corrects any out-of-order resolve or overlap-undo
          // transient (a rejected earlier patch that over-reverted a later toggle).
          dispatch(api.util.invalidateTags(['Me']));
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
