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
// so parsing it at the seam + invalidating `Me` repaints the identity everywhere.
const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    // PATCH /me — username · bio · favouriteGenreIds · favouriteGameId · privacy (patchMeRequestSchema).
    // MOD-07 screening + PROF-06 cooldown + uniqueness are enforced server-side; a rejection is a
    // VALIDATION_ERROR with field-targeted `details` (api-contract 0.46) the editor surfaces inline.
    patchMe: build.mutation<SelfProfile, PatchMeRequest>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      transformResponse: (raw): SelfProfile => selfProfileSchema.parse(raw),
      invalidatesTags: ['Me'],
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
