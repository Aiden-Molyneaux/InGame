// Driver-level Postgres error classification (node-postgres; drizzle may wrap with `cause`).

/** 23505 — unique_violation (e.g. the CAT-03 partial unique index deciding a same-title race, F36). */
export function isUniqueViolation(e: unknown): boolean {
  const direct = (e as { code?: string })?.code;
  const wrapped = (e as { cause?: { code?: string } })?.cause?.code;
  return direct === '23505' || wrapped === '23505';
}

/** 23503 — foreign_key_violation (e.g. a block targeting a userId that isn't a real account). */
export function isForeignKeyViolation(e: unknown): boolean {
  const direct = (e as { code?: string })?.code;
  const wrapped = (e as { cause?: { code?: string } })?.cause?.code;
  return direct === '23503' || wrapped === '23503';
}
