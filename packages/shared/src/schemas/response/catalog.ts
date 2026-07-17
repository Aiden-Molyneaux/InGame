import { z } from 'zod';

// RESPONSE/VIEW schemas for the catalog (api-contract 0.47) — owned by the F06 serializer side of
// the split (decision 0051/F23). The client binds RTK Query types to these via z.infer (F31).

export const genreViewSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
  })
  .strict();

export type GenreView = z.infer<typeof genreViewSchema>;

/** CAT-05 contributor credit as rendered (ADDED BY …) — ids + username only, never the row. */
export const contributorCreditSchema = z
  .object({
    userId: z.string().uuid(),
    username: z.string(),
  })
  .strict();

export type ContributorCredit = z.infer<typeof contributorCreditSchema>;

/** The 0.47 search-result item shape (search · popular · the created entry). */
export const catalogItemSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    studio: z.string().nullable(),
    publisher: z.string().nullable(),
    releaseDate: z.string().nullable(), // YYYY-MM-DD
    genres: z.array(genreViewSchema),
    collectionsCount: z.number().int().nonnegative(), // CAT-09a — anonymous aggregate
    friendsHaveCount: z.number().int().nonnegative(), // CAT-09b — the caller's friends
    inCollection: z.boolean(), // the add-flow's own-it ✓
    contributor: contributorCreditSchema, // CAT-05
  })
  .strict();

export type CatalogItem = z.infer<typeof catalogItemSchema>;

export const catalogListResponseSchema = z.object({ items: z.array(catalogItemSchema) }).strict();
export type CatalogListResponse = z.infer<typeof catalogListResponseSchema>;

export const genresResponseSchema = z.object({ items: z.array(genreViewSchema) }).strict();
export type GenresResponse = z.infer<typeof genresResponseSchema>;

// ── CAT-09c — the Game-page friends-who-own named list (decision 0036; api-contract row /catalog/games/:id) ──
// The named list of the VIEWER's friends who own a game + their hours. PROF-03-gated (hours present only
// where exposed — at M6 a friend always exposes hours to a friend; the `hours?` optionality is the seam
// for a future per-facet privacy setting). Blocked friends are ABSENT (SOC-09 severs the friendship, so
// they are not in the friend set). `count` is the friends-have-it count (CAT-09b) — shown alone when no
// named friend is visible. SEAM: the contract draws this as a `friendsWhoOwn` FIELD on GET /catalog/
// games/:id; that aggregate game-detail endpoint is not built yet, so P2 serves it as the focused route
// GET /catalog/games/:id/friends-who-own (flagged to the orchestrator — folds into game-detail when it lands).
export const friendWhoOwnsSchema = z
  .object({
    userId: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().url().nullable(),
    hours: z.number().int().nonnegative().optional(), // PROF-03-gated (present when the friend exposes it)
  })
  .strict();
export type FriendWhoOwns = z.infer<typeof friendWhoOwnsSchema>;

export const friendsWhoOwnResponseSchema = z
  .object({
    friendsWhoOwn: z.array(friendWhoOwnsSchema),
    count: z.number().int().nonnegative(), // the friends-have-it count (CAT-09b) — the count-only fallback
  })
  .strict();
export type FriendsWhoOwnResponse = z.infer<typeof friendsWhoOwnResponseSchema>;
