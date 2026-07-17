import type { CreateInviteResponse, ResolveInviteResponse } from '@ingame/shared';
import { createInviteResponseSchema, resolveInviteResponseSchema } from '@ingame/shared';
import { api } from './api';

// inviteApi (P8 · SOC-10) — the invite-link surfaces. POST /me/invites mints a bearer token (the QR +
// link are both rendered from it, OQ-073); GET /invites/:token resolves it on the AUTH-LOOKUP read class
// (bearer/token-scoped — the resolver may be a fresh install with no session, so this must work with or
// without an access token; the base slice attaches the token only if present). The resolve NEVER
// distinguishes never-existed / revoked / expired / blocked-sender — all surface as the RTK error
// (INVITE_INVALID / INVITE_EXPIRED), never a body leak. INJECTED (api.ts untouched); parsed at the seam.
const inviteApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Mint (or rotate to) the caller's active invite — signed token, TTL 7d, ≤5 active. Not tag-cached:
    // the invite screen fires it once on open and renders the returned link + QR.
    createInvite: build.mutation<CreateInviteResponse, void>({
      query: () => ({ url: '/me/invites', method: 'POST', body: {} }),
      transformResponse: (raw): CreateInviteResponse => createInviteResponseSchema.parse(raw),
    }),
    // Resolve an opened invite → the sender summary + the resolver↔sender relationship (so an already-
    // friend link lands the right action, not a duplicate ADD). 409 → the expired/invalid terminal.
    resolveInvite: build.query<ResolveInviteResponse, string>({
      query: (token) => `/invites/${token}`,
      transformResponse: (raw): ResolveInviteResponse => resolveInviteResponseSchema.parse(raw),
    }),
  }),
});

export const { useCreateInviteMutation, useResolveInviteQuery } = inviteApi;
export { inviteApi };
