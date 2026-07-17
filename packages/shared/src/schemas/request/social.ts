import { z } from 'zod';
import { usernameSchema } from './profile';
import { boundedText } from '../sanitize';

// REQUEST/INPUT schemas for social actions (SOC-09). The actor is the authenticated principal ONLY —
// `.strict()` refuses any smuggled actor id. `userId` here is the TARGET of the action (who to block),
// which is legitimately body-supplied (it is not the actor).

/** POST /me/blocks body: { userId } — the target to block (SOC-09). */
export const blockUserRequestSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

export type BlockUserRequest = z.infer<typeof blockUserRequestSchema>;

/**
 * POST /friends/requests body: { toUserId } — the TARGET of a friend request (SOC-08). The actor is the
 * authenticated principal ONLY (`.strict()` refuses a smuggled actor id); `toUserId` is legitimately
 * body-supplied (it is not the actor). Self-target (toUserId === actor) is refused server-side (SELF_TARGET).
 */
export const createFriendRequestSchema = z
  .object({
    toUserId: z.string().uuid(),
  })
  .strict();

export type CreateFriendRequest = z.infer<typeof createFriendRequestSchema>;

/**
 * GET /users/search?username= query (SOC-07). EXACT-match people search — the `username` is validated
 * against the SAME `usernameSchema` the rest of the surface uses (a query that can't be a valid username
 * matches NObody, so the service returns an empty result set rather than a 422 — an impossible handle is
 * not an error, and refusing it would leak the username grammar as an oracle). No fuzzy/prefix at M6.
 */
export const userSearchQuerySchema = z
  .object({
    username: usernameSchema,
  })
  .strict();

export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;

/**
 * GET /invites/:token — the DEFENSIVE token-param guard (SOC-10; decision 0076 §0.6). The token is a
 * server-random ≥32-byte secret rendered base64url, so a legitimate token is `[A-Za-z0-9_-]` and ~43
 * chars. This bounds length + charset BEFORE the value is hashed/looked up (never trust a path param);
 * a value that fails this is treated EXACTLY like an unknown token → INVITE_INVALID (no 422, no oracle —
 * malformed ≡ never-existed). The bounds are generous (16..512) so a longer future token still parses.
 */
export const INVITE_TOKEN_RE = /^[A-Za-z0-9_-]+$/;
export const inviteTokenParamSchema = z.string().min(16).max(512).regex(INVITE_TOKEN_RE);
export type InviteTokenParam = z.infer<typeof inviteTokenParamSchema>;

/**
 * POST /recommendations body: { toUserId, gameId, note? } — recommend a game to a FRIEND (SOC-05). The
 * actor (recommender) is the authenticated principal ONLY (`.strict()` refuses a smuggled actor id);
 * `toUserId`/`gameId` are legitimately body-supplied (they are not the actor). `note` is an OPTIONAL
 * short freeform message, SYS-02-bounded (≤500 — the "short personal note" tier, matching collection
 * notes; SYS-04-tunable) and control-char-stripped (SYS-02 sanitize); it is UNSCREENED at M6 (MOD-07 text
 * screening rides M7 — accepted for the trusted beta, recorded). Server-side refusals (SELF_TARGET ·
 * NOT_FRIENDS · the MOD-09 block collapse · unknown game) live in the service. Note-length over the cap
 * → 422 (SYS-02) here at the boundary.
 */
export const RECOMMENDATION_NOTE_MAX_LEN = 500;
export const createRecommendationSchema = z
  .object({
    toUserId: z.string().uuid(),
    gameId: z.string().uuid(),
    // SYS-02: NFC-normalized + control/bidi/zero-width-stripped + trimmed + length-bounded (the shared
    // free-text helper, same as bio/notes). Over the cap → 422. A '' / whitespace-only note sanitizes to
    // '' → normalized to `undefined` (no empty-string note ever persists). UNSCREENED at M6 (MOD-07 → M7).
    note: boundedText(RECOMMENDATION_NOTE_MAX_LEN)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .strict();

export type CreateRecommendationRequest = z.infer<typeof createRecommendationSchema>;
