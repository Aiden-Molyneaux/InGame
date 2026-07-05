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
