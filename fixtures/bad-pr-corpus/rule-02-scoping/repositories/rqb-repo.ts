// DELIBERATELY BAD (rule-02-scoping — the OQ-118 relational-query hole). Drizzle's relational query
// builder (`db.query.<table>.findFirst/findMany`) reads rows without ever calling `.from(...)`, so
// the old denylist never saw it. `gamertags` is user-owned (not on the F32 global manifest) → an
// unscoped relational read fails closed.
export async function getAnyGamertags(db: any, userId: string) {
  // ❌ no asActor()/ownedBy() — reads another user's rows via the relational API
  return db.query.gamertags.findMany({ where: (t: any, { eq }: any) => eq(t.userId, userId) });
}
