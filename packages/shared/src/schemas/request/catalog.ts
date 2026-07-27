import { z } from 'zod';
import { boundedText } from '../sanitize';

// REQUEST/INPUT schemas for the catalog (rule-3 field-for-field fidelity to api-contract 0.47).
// The server-side parse IS the security boundary; every string is bounded + trimmed + sanitized.

export const GAME_NAME_MAX = 120;
export const GAME_FIELD_MAX = 80; // studio / publisher
export const GAME_GENRES_MAX = 8; // input-bound hygiene (rule 3), not a CAT-04 behavior cap
export const CATALOG_SEARCH_MAX = 100;

/** CAT-02 releaseDate — a plain calendar date (YYYY-MM-DD), upcoming allowed (CAT-08). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date (YYYY-MM-DD).')
  // Round-trip the components so a calendar-IMPOSSIBLE date (2026-02-30) is REJECTED, not rolled over
  // by Date.parse (→ Mar 2) — else it reaches the Postgres `date` column and 500s (22008) at INSERT.
  .refine((s) => {
    // The regex above already guaranteed YYYY-MM-DD, so the split yields exactly three numbers.
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, 'Must be a valid calendar date.');

/**
 * POST /catalog/games body (api-contract 0.47):
 *   { name, genreIds, studio?, publisher?, releaseDate?, dedupOverride? }
 * `.strict()` — a smuggled `createdBy`/actor id in the body is refused (SYS-01: contributor credit
 * comes from the authenticated principal ONLY, CAT-05).
 */
export const createGameRequestSchema = z
  .object({
    name: boundedText(GAME_NAME_MAX).pipe(z.string().min(1)),
    // CAT-04 controlled list. NOT required (product-spec 0.68, walk-4 P2-c): CAT-02 always read
    // "name (required), genre(s), studio/developer (optional)…" — genres were never marked required;
    // the M3 build resolved that ambiguity as `.min(1)` and it blocked the create form. An empty
    // array is valid; CAT-13 wiki editing adds genres later.
    genreIds: z.array(z.string().uuid()).max(GAME_GENRES_MAX),
    studio: boundedText(GAME_FIELD_MAX).pipe(z.string().min(1)).optional(),
    publisher: boundedText(GAME_FIELD_MAX).pipe(z.string().min(1)).optional(),
    releaseDate: isoDateSchema.optional(),
    dedupOverride: z.boolean().optional(), // CAT-03 create-anyway (decision 0058)
  })
  .strict();

export type CreateGameRequest = z.infer<typeof createGameRequestSchema>;

/** The ordered field set of the POST /catalog/games body — the F09 fidelity snapshot reads this. */
export const CREATE_GAME_FIELDS = Object.keys(createGameRequestSchema.shape) as Array<
  keyof CreateGameRequest
>;

/** GET /catalog/search?q= (CAT-01) — non-strict: stray query params are stripped, q is the contract. */
export const catalogSearchQuerySchema = z.object({
  q: boundedText(CATALOG_SEARCH_MAX).pipe(z.string().min(1)),
});

export type CatalogSearchQuery = z.infer<typeof catalogSearchQuerySchema>;
