import { z } from 'zod';
import { relationshipSchema } from '../common';

// RESPONSE/VIEW schemas for the SOC-10 invite surfaces (POST /me/invites · GET /invites/:token). The
// invite token is a BEARER credential (an unguessable server-random secret): it is returned to the
// minter ONCE by POST /me/invites, and GET /invites/:token resolves it on the AUTH-LOOKUP read class
// (bearer/token-scoped, never session-authed — the resolver may be a fresh install with no account).
//
// Non-disclosure by construction: the resolve NEVER distinguishes never-existed / revoked / malformed /
// blocked-sender (all → INVITE_INVALID) and leaks no sender detail on a refusal — only a SUCCESSFUL
// resolve carries the sender summary.

/**
 * POST /me/invites (SOC-10) → the freshly-minted token, the shareable URL (the token appended to the
 * `INVITE_LINK_BASE` the P15 static landing owns), and the TTL expiry (ISO-8601 UTC, 7 days out). The
 * `token` is returned exactly ONCE — only its hash is stored server-side. The client renders the QR from
 * this token (OQ-073).
 */
export const createInviteResponseSchema = z
  .object({
    token: z.string(),
    url: z.string().url(),
    expiresAt: z.string(),
  })
  .strict();
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;

/**
 * GET /invites/:token (SOC-10) → a resolved invite. `sender` is the minter's PUBLIC summary (never a
 * friend-private field — the resolver may be a stranger). `relationship` is the resolver↔sender relation
 * (base four; `none` for an UNAUTHENTICATED resolve, or when the pair have no relation) so the client
 * lands the right action — an already-`friend`/`outgoing`/`incoming` link resolves to the correct chrome,
 * not a duplicate ADD. `prefilledRequest.toUserId` is the sender (the one-tap ADD target — redemption is
 * the normal POST /friends/requests, where P1's cooldown/blocked/already rules apply).
 */
export const inviteSenderSchema = z
  .object({
    userId: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().url().nullable(),
  })
  .strict();
export type InviteSender = z.infer<typeof inviteSenderSchema>;

export const resolveInviteResponseSchema = z
  .object({
    token: z.string(),
    sender: inviteSenderSchema,
    relationship: relationshipSchema,
    prefilledRequest: z
      .object({
        toUserId: z.string().uuid(),
      })
      .strict(),
  })
  .strict();
export type ResolveInviteResponse = z.infer<typeof resolveInviteResponseSchema>;
