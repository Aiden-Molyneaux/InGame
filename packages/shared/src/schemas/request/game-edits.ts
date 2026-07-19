import { z } from 'zod';
import { boundedText } from '../sanitize';
import { GAME_FIELD_MAX, GAME_GENRES_MAX, isoDateSchema } from './catalog';

// REQUEST/INPUT schema for CAT-13 wiki-live game editing (POST /catalog/games/:id/edits, M6 W-6).
// ONE FIELD PER REQUEST — the request ≅ the `game_edits` history row (the draft's §4 ruling: no
// PATCH-vs-history dual-write to keep honest; multi-field batches are a client loop).
//
// The parse is deliberately TWO-STAGE:
//   1. `gameEditRequestSchema` (here, at the route boundary) — the strict envelope: a bounded `field`
//      string + a bounded raw `newValue` union. `field` is NOT an enum at this stage so that a locked
//      field (`name`) or an unknown one surfaces as the NAMED 422 `uneditable_field` refusal from the
//      service, not a generic zod enum error (the CAT-13 contract row draws that reason explicitly).
//   2. `GAME_EDIT_VALUE_SCHEMAS[field]` (service-side, still shared zod) — the per-field value rules:
//      studio/publisher = sanitized bounded text or null-to-clear; releaseDate = calendar-valid
//      YYYY-MM-DD or null; genres = a non-empty uuid array (the CAT-04 controlled-list membership
//      check rides the service, like create).

export const GAME_EDITABLE_FIELDS = ['studio', 'publisher', 'releaseDate', 'genres'] as const;
export type GameEditableField = (typeof GAME_EDITABLE_FIELDS)[number];

export function isEditableGameField(field: string): field is GameEditableField {
  return (GAME_EDITABLE_FIELDS as readonly string[]).includes(field);
}

/** The wire value of one edit: a string (text/date), null (clear), or a genre-id array. */
export type GameEditValue = string | null | string[];

export const gameEditRequestSchema = z
  .object({
    // Bounded raw string — the editable-set membership check is the service's NAMED refusal (above).
    field: z.string().min(1).max(40),
    // Bounded raw union — hygiene bounds only; the per-field schema below owns the real rules.
    newValue: z.union([
      z.string().max(400),
      z.null(),
      z.array(z.string().max(64)).max(32),
    ]),
  })
  .strict(); // a smuggled editorId/actor id in the body is refused (SYS-01)

export type GameEditRequest = z.infer<typeof gameEditRequestSchema>;

/**
 * Stage-2 per-field value rules (CAT-13). `null` clears the optional text/date fields (CAT-02 keeps
 * them optional); an EMPTY STRING is refused (clearing is explicit, `null`, never ''). Genres are a
 * full-replace set, min 1 (a game never drops to zero genres — same floor as create, CAT-04).
 */
export const GAME_EDIT_VALUE_SCHEMAS: Record<GameEditableField, z.ZodTypeAny> = {
  studio: boundedText(GAME_FIELD_MAX).pipe(z.string().min(1)).nullable(),
  publisher: boundedText(GAME_FIELD_MAX).pipe(z.string().min(1)).nullable(),
  releaseDate: isoDateSchema.nullable(),
  genres: z.array(z.string().uuid()).min(1).max(GAME_GENRES_MAX),
};
