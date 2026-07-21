// Shared cursor-pagination helpers for the offset-cursor routes (the contributor / gallery VIEW-ALL
// grammar). ONE decode point so the services can never drift on what a cursor is allowed to be.

/** The ONLY accepted offset-cursor shape: 1–9 ASCII digits. Nine digits caps the offset at
 *  999_999_999 — comfortably inside Postgres' bigint AND a sane page depth — so a decoded offset can
 *  never overflow the SQL bind. Deliberately narrow: it also rejects the `Number()` overflow hole
 *  (`1e21`, `10000000000000000000`, `0x…`, `+5`, `1.5`) that `Number.isInteger` waved through. */
const OFFSET_CURSOR_RE = /^\d{1,9}$/;

/**
 * Decode an opaque OFFSET cursor: the response hands back `nextCursor` as a plain non-negative
 * integer string and the next request echoes it verbatim.
 *
 * HOUSE GRAMMAR (owner-call on a stricter direction still pending — do NOT introduce a 422 here): any
 * garbage cursor — non-numeric, negative, over-long, or numerically overflowing — reads as "start of
 * the list" (offset 0 → a silent page 1), never a 500 and never a client error. This closes the
 * numeric-overflow hole where a ≤40-char cursor like `1e21` parsed to a colossal offset and 500'd on
 * the pg bigint bind: `1e21` / `10000000000000000000` / `abc` all resolve to 0 now.
 */
export function decodeOffsetCursor(cursor: string | undefined): number {
  if (!cursor || !OFFSET_CURSOR_RE.test(cursor)) return 0;
  return Number.parseInt(cursor, 10);
}
