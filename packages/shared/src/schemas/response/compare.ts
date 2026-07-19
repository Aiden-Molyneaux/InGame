import { z } from 'zod';
import { friendCollectionCardSchema } from './collection';
import { avatarConfigSchema } from '../avatar-config';

// GET /me/compare/:friendId (SOC-03) — the collection face-off (api-contract 0.25). READ-ONLY,
// non-commerce (comparing creates no card, spends no PX). PRIVACY-GATED (PROF-03): a hidden axis is
// OMITTED, never faked. The endpoint is FRIEND-ONLY — a non-friend is refused NOT_FRIENDS (409); a
// blocked / suspended / deleted / unknown target collapses to the generic unavailable (404, MOD-09),
// indistinguishable, like GET /users/:id.
//
// PROF-03 OMISSION (exactly as drawn):
//  • friend hides HOURS      → every `theirHours` (games + totals) + `totals.leader` (the hours face-off
//                              winner) + the whole `leaderboard` are OMITTED; the games axis still
//                              compares (your own hours + the card-vs-card matchup survive).
//  • friend hides COLLECTION → `games` (the shared set) + `totals.theirGames` are OMITTED; your own
//                              totals survive.
// At M6 the data model carries no per-facet hide toggle (privacy is friends|public only, OQ-117
// deferred), so a friend always exposes both axes to a friend — the omission branches are BUILT + unit-
// tested against each posture, and the one seam (resolveCompareVisibility) is where a future per-facet
// privacy setting wires in. Flagged to the orchestrator as the P2 privacy-model gap.
//
// SEAM (avatarRef vs avatarUrl): the api-contract draws `avatarRef`, but every BUILT serializer emits
// `avatarUrl` (see response/social.ts). This shape stays consistent with the live wire — `avatarUrl`.

/** The face-off leader on an axis — you're ahead, they're ahead, or a tie. */
export const compareLeaderSchema = z.enum(['you', 'them', 'tie']);
export type CompareLeader = z.infer<typeof compareLeaderSchema>;

/**
 * One shared-set matchup (the collection INTERSECTION): the game + both displayed cards (CARD-07/22 —
 * the card-vs-card matchup) + per-game hours. `theirHours` is omitted when the friend hides hours.
 */
export const compareGameSchema = z
  .object({
    gameId: z.string().uuid(),
    title: z.string(),
    yourCard: friendCollectionCardSchema, // your displayed card for this game (flattened + equipped)
    theirCard: friendCollectionCardSchema, // their displayed card (flattened + equipped, never composition)
    yourHours: z.number().int().nonnegative(),
    theirHours: z.number().int().nonnegative().optional(), // omitted when the friend hides hours (PROF-03)
    leader: compareLeaderSchema, // the per-game hours leader (a tie when hours are hidden)
  })
  .strict();
export type CompareGame = z.infer<typeof compareGameSchema>;

/** One friend-cohort leaderboard row (the friend circle ranked; `isMe` flags your own row). */
export const compareLeaderboardRowSchema = z
  .object({
    rank: z.number().int().positive(),
    user: z
      .object({
        userId: z.string().uuid(),
        username: z.string(),
        avatarUrl: z.string().url().nullable(),
        // PROF-08 (W-4 Monogram Forge) — the mutual-cohort leaderboard row renders each member's
        // forged monogram beside avatarUrl; null ⇒ the default monogram.
        avatarConfig: avatarConfigSchema.nullable(),
      })
      .strict(),
    hours: z.number().int().nonnegative(),
    games: z.number().int().nonnegative(),
    isMe: z.boolean(),
  })
  .strict();
export type CompareLeaderboardRow = z.infer<typeof compareLeaderboardRowSchema>;

/**
 * The face-off totals. `yourHours`/`yourGames` are ALWAYS present (your own data). `theirHours` +
 * `leader` are omitted when the friend hides hours; `theirGames` is omitted when they hide collection.
 */
export const compareTotalsSchema = z
  .object({
    yourHours: z.number().int().nonnegative(),
    theirHours: z.number().int().nonnegative().optional(),
    yourGames: z.number().int().nonnegative(),
    theirGames: z.number().int().nonnegative().optional(),
    leader: compareLeaderSchema.optional(), // the overall hours leader; omitted when hours are hidden
  })
  .strict();
export type CompareTotals = z.infer<typeof compareTotalsSchema>;

export const compareResponseSchema = z
  .object({
    friend: z
      .object({
        userId: z.string().uuid(),
        username: z.string(),
        avatarUrl: z.string().url().nullable(),
        // PROF-08 (W-4 Monogram Forge) — the face-off hero renders the friend's forged monogram beside
        // avatarUrl; null ⇒ the default monogram.
        avatarConfig: avatarConfigSchema.nullable(),
      })
      .strict(),
    totals: compareTotalsSchema,
    /** The shared-set matchups — omitted when the friend hides their collection (PROF-03). */
    games: z.array(compareGameSchema).optional(),
    /** The friend-cohort hours leaderboard — omitted when the friend hides hours (PROF-03). */
    leaderboard: z.array(compareLeaderboardRowSchema).optional(),
  })
  .strict();
export type CompareResponse = z.infer<typeof compareResponseSchema>;
