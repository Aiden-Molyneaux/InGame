import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import rule from './rule-02-scoping.mjs';
import { collectFiles } from '../util/files.mjs';

// Guards the security-sensitive rule-2 extension: the // SYS-01-AUTH-LOOKUP marker (pre-auth /
// bearer-credential lookup) is EXEMPT only inside an auth-layer repo, and FAILS CLOSED everywhere
// else — so it can never become a cross-user bypass for an ordinary repository (gate-3 / OQ-115).
// It is ALSO reads-only: it exempts a `.from` select, never a `.update`/`.delete` (M2 lead-audit).

function run(files) {
  return rule.check({ files, root: process.cwd() });
}
function file(path, text) {
  return { path, abs: path, text };
}

const lookupBody = (marker) => `
import { eq } from 'drizzle-orm';
export async function find(email, exec) {
  ${marker}
  const rows = await exec.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}
`;

describe('rule-02 SYS-01-AUTH-LOOKUP marker (auth-layer-confined)', () => {
  it('EXEMPTS a marked pre-auth lookup inside an auth-layer repo', () => {
    const v = run([
      file('apps/api/src/repositories/auth-repo.ts', lookupBody('// SYS-01-AUTH-LOOKUP: by email')),
    ]);
    expect(v).toHaveLength(0);
  });

  it('does NOT exempt the same marked read in a NON-auth repo (fails closed)', () => {
    const v = run([
      file('apps/api/src/repositories/wallet-repo.ts', lookupBody('// SYS-01-AUTH-LOOKUP: by email')),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('still flags an UNMARKED user read inside an auth-layer repo', () => {
    const v = run([file('apps/api/src/repositories/auth-repo.ts', lookupBody(''))]);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('rule-02 SYS-01-AUTH-LOOKUP marker is READS-ONLY (a marked write fails closed)', () => {
  const authRepo = (text) => file('apps/api/src/repositories/auth-repo.ts', text);

  it('FAILS CLOSED on a marked .update inside an auth-layer repo (marker exempts reads only)', () => {
    const v = run([
      authRepo(`
import { eq } from 'drizzle-orm';
export async function rename(id, email, exec) {
  // SYS-01-AUTH-LOOKUP: (abused) claims a pre-auth lookup, but this is an unscoped write
  return exec.update(users).set({ email }).where(eq(users.id, id));
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('FAILS CLOSED on a marked .delete inside an auth-layer repo', () => {
    const v = run([
      authRepo(`
import { eq } from 'drizzle-orm';
export async function remove(id, exec) {
  // SYS-01-AUTH-LOOKUP: (abused) claims a pre-auth lookup, but this is an unscoped delete
  return exec.delete(users).where(eq(users.id, id));
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('rejects the on-disk bad-pr-corpus marked-write fixture (auth-write-repo.ts)', () => {
    const dir = join(process.cwd(), 'fixtures', 'bad-pr-corpus', 'rule-02-scoping');
    const offending = collectFiles([dir], { exts: ['.ts'], cwd: process.cwd() }).filter((f) =>
      f.path.endsWith('auth-write-repo.ts'),
    );
    expect(offending).toHaveLength(1);
    expect(run(offending).length).toBeGreaterThan(0);
  });
});

// OQ-118 — detection flipped from the 3-verb denylist to an ALLOWLIST of recognized query verbs
// (fail closed on the holes the M2 lead-audit named: upserts via .onConflictDoUpdate, raw
// db.execute / sql`` writes, plus the relational query builder and user-owned JOINs).
describe('rule-02 OQ-118 — allowlist detection closes the denylist holes', () => {
  const repo = (text) => file('apps/api/src/repositories/collection-repo.ts', text);

  it('flags an UNSCOPED .insert(...).onConflictDoUpdate(...) upsert on a user-owned table', () => {
    const v = run([
      repo(`
import { gamertags } from '../db/schema';
export async function upsertAny(exec, userId, handle) {
  return exec
    .insert(gamertags)
    .values({ userId, handle })
    .onConflictDoUpdate({ target: gamertags.userId, set: { handle } });
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('EXEMPTS a SCOPED upsert (asActor/ownedBy signal in the window)', () => {
    const v = run([
      repo(`
import { gamertags } from '../db/schema';
import { asActor, ownedBy } from '../db/scoped';
export async function upsertOwned(actorId, exec, handle) {
  const actor = asActor(actorId);
  return exec
    .insert(gamertags)
    .values({ userId: actor.actorId, handle })
    .onConflictDoUpdate({
      target: gamertags.userId,
      set: { handle },
      setWhere: ownedBy(actor, gamertags.userId),
    });
}
`),
    ]);
    expect(v).toHaveLength(0);
  });

  it('still EXEMPTS a bare .insert (no conflict-update chain — cannot IDOR a new row)', () => {
    const v = run([
      repo(`
import { gamertags } from '../db/schema';
export async function insertNew(exec, userId, handle) {
  return exec.insert(gamertags).values({ userId, handle });
}
`),
    ]);
    expect(v).toHaveLength(0);
  });

  it('flags raw .execute(sql``) in a repository file EVEN WITH a scope signal nearby', () => {
    const v = run([
      repo(`
import { sql } from 'drizzle-orm';
import { asActor } from '../db/scoped';
export async function rawWrite(exec, actorId, email) {
  const actor = asActor(actorId); // a nearby signal must NOT launder raw SQL
  return exec.execute(sql\`UPDATE users SET email = \${email} WHERE id = \${actor.actorId}\`);
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('does NOT apply the raw-SQL ban to db/ infra (reset.ts is rule-f03 surface)', () => {
    const v = run([
      file(
        'apps/api/src/db/reset.ts',
        `
import { sql } from 'drizzle-orm';
export async function resetDb(db) {
  await db.execute(sql\`TRUNCATE TABLE users RESTART IDENTITY CASCADE\`);
}
`,
      ),
    ]);
    expect(v).toHaveLength(0);
  });

  it('flags an unscoped db.query.<userOwnedTable>.findMany relational read', () => {
    const v = run([
      repo(`
export async function getAny(db, userId) {
  return db.query.gamertags.findMany({ where: (t, { eq }) => eq(t.userId, userId) });
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('EXEMPTS db.query.<globalTable>.findMany (real F32 manifest)', () => {
    const v = run([
      repo(`
export async function listGames(db) {
  return db.query.games.findMany();
}
`),
    ]);
    expect(v).toHaveLength(0);
  });

  it('flags an unscoped user-owned .leftJoin even when the FROM table is global', () => {
    const v = run([
      repo(`
import { eq } from 'drizzle-orm';
import { games, collectionEntries } from '../db/schema';
export async function leak(exec, gameId) {
  return exec
    .select()
    .from(games)
    .leftJoin(collectionEntries, eq(collectionEntries.gameId, games.id))
    .where(eq(games.id, gameId));
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('EXEMPTS a global-to-global join (games × game_genres × genres)', () => {
    const v = run([
      repo(`
import { eq } from 'drizzle-orm';
import { games, gameGenres, genres } from '../db/schema';
export async function listWithGenres(exec) {
  return exec
    .select()
    .from(games)
    .leftJoin(gameGenres, eq(gameGenres.gameId, games.id))
    .leftJoin(genres, eq(genres.id, gameGenres.genreId));
}
`),
    ]);
    expect(v).toHaveLength(0);
  });

  it('rejects each on-disk OQ-118 fixture (upsert · raw-sql · rqb · join-leak)', () => {
    const dir = join(process.cwd(), 'fixtures', 'bad-pr-corpus', 'rule-02-scoping');
    const all = collectFiles([dir], { exts: ['.ts'], cwd: process.cwd() });
    for (const name of ['upsert-repo.ts', 'raw-sql-repo.ts', 'rqb-repo.ts', 'join-leak-repo.ts']) {
      const fixture = all.filter((f) => f.path.endsWith(name));
      expect(fixture, `${name} missing from the corpus`).toHaveLength(1);
      expect(run(fixture).length, `${name} was not flagged`).toBeGreaterThan(0);
    }
  });
});

// OQ-126 — the CAT-09 community-aggregate read class (interim, pre-OQ-122's M4-entry model):
// `// SYS-01-COMMUNITY-AGGREGATE` exempts a READ of a user-owned table ONLY when the window also
// contains an aggregate call (count() — anonymous aggregates, never row reads), and NEVER a write.
// Guard-surface change → gate-3 review, like the OQ-115 AUTH-LOOKUP marker.
describe('rule-02 SYS-01-COMMUNITY-AGGREGATE marker (aggregate reads only — OQ-126)', () => {
  const repo = (text) => file('apps/api/src/repositories/collection-repo.ts', text);

  it('EXEMPTS a marked COUNT-aggregate read of a user-owned table (CAT-09)', () => {
    const v = run([
      repo(`
import { count } from 'drizzle-orm';
import { collectionEntries } from '../db/schema';
export async function collectionsCountByGame(exec, gameIds) {
  // SYS-01-COMMUNITY-AGGREGATE: CAT-09a — an anonymous cross-user COUNT per game (spec-sanctioned)
  return exec
    .select({ gameId: collectionEntries.gameId, n: count() })
    .from(collectionEntries)
    .groupBy(collectionEntries.gameId);
}
`),
    ]);
    expect(v).toHaveLength(0);
  });

  it('does NOT exempt a marked read with NO aggregate call in the window (row reads fail closed)', () => {
    const v = run([
      repo(`
import { collectionEntries } from '../db/schema';
export async function leakRows(exec, userId) {
  // SYS-01-COMMUNITY-AGGREGATE: (ABUSED) claims an aggregate but selects raw rows
  return exec.select().from(collectionEntries);
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('does NOT exempt a marked WRITE even with count() nearby (reads-only contract)', () => {
    const v = run([
      repo(`
import { count, eq } from 'drizzle-orm';
import { collectionEntries } from '../db/schema';
export async function abuse(exec, entryId) {
  const n = count();
  // SYS-01-COMMUNITY-AGGREGATE: (ABUSED) claims an aggregate but mutates a row
  return exec.update(collectionEntries).set({ hours: 0 }).where(eq(collectionEntries.id, entryId));
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('rejects the on-disk marked-write corpus fixture (aggregate-abuse-repo.ts)', () => {
    const dir = join(process.cwd(), 'fixtures', 'bad-pr-corpus', 'rule-02-scoping');
    const offending = collectFiles([dir], { exts: ['.ts'], cwd: process.cwd() }).filter((f) =>
      f.path.endsWith('aggregate-abuse-repo.ts'),
    );
    expect(offending).toHaveLength(1);
    expect(run(offending).length).toBeGreaterThan(0);
  });
});

// OQ-122 / decision 0073 §0.1 — the third read class. `// SYS-01-PUBLIC-READ` exempts a cross-user
// READ of a user-owned table ONLY when the window carries an explicit `'published'` visibility
// predicate, and NEVER a write. (M5 §1 spike shape; P3 finishes the lint work — widen the predicate
// set + add an on-disk misuse fixture.)
describe('rule-02 SYS-01-PUBLIC-READ marker (published reads only — OQ-122)', () => {
  const repo = (text) => file('apps/api/src/repositories/card-repo.ts', text);

  it('EXEMPTS a marked read of a user-owned table WITH a published predicate (the gallery read)', () => {
    const v = run([
      repo(`
import { eq, and } from 'drizzle-orm';
import { cardDesigns, users } from '../db/schema';
export async function gallery(exec, gameId) {
  // SYS-01-PUBLIC-READ: cross-user gallery — published cards only, flattened images never composition
  return exec
    .select({ id: cardDesigns.id, imageUrl: cardDesigns.imageUrl, designer: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(and(eq(cardDesigns.gameId, gameId), eq(cardDesigns.status, 'published')));
}
`),
    ]);
    expect(v).toHaveLength(0);
  });

  it('does NOT exempt a marked read with NO published predicate in the window (fails closed)', () => {
    const v = run([
      repo(`
import { cardDesigns } from '../db/schema';
export async function leakAll(exec) {
  // SYS-01-PUBLIC-READ: (ABUSED) claims a public read but carries no visibility predicate
  return exec.select().from(cardDesigns);
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('does NOT exempt a marked WRITE even with a published predicate nearby (reads-only contract)', () => {
    const v = run([
      repo(`
import { eq, and } from 'drizzle-orm';
import { cardDesigns } from '../db/schema';
export async function abuse(exec, id) {
  // SYS-01-PUBLIC-READ: (ABUSED) claims a public read but mutates a row
  return exec
    .update(cardDesigns)
    .set({ status: 'published' })
    .where(and(eq(cardDesigns.id, id), eq(cardDesigns.status, 'published')));
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  // P3 finishes the lint work: the composition-exclusion guarantee (CARD-15 / 0066 §2) + a wider,
  // long-select-tolerant predicate window + the on-disk misuse corpus.
  it('FLAGS a public read that SELECTS `composition` even WITH a published predicate (0066 §2 leak)', () => {
    const v = run([
      repo(`
import { eq, and } from 'drizzle-orm';
import { cardDesigns, users } from '../db/schema';
export async function leak(exec, gameId) {
  // SYS-01-PUBLIC-READ: gallery read — but leaks the private layers
  return exec
    .select({ id: cardDesigns.id, composition: cardDesigns.composition, designer: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(and(eq(cardDesigns.gameId, gameId), eq(cardDesigns.status, 'published')));
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((x) => /composition/.test(x.message))).toBe(true);
  });

  it('EXEMPTS a public read that selects `compositionHash` (the dedup read — not the private column)', () => {
    const v = run([
      repo(`
import { count, eq, and, ne } from 'drizzle-orm';
import { cardDesigns } from '../db/schema';
export async function hasDup(exec, hash, selfId) {
  // SYS-01-PUBLIC-READ: cross-published dedup — a COUNT over the published set (never composition)
  return exec
    .select({ n: count() })
    .from(cardDesigns)
    .where(and(eq(cardDesigns.status, 'published'), eq(cardDesigns.compositionHash, hash), ne(cardDesigns.id, selfId)));
}
`),
    ]);
    expect(v).toHaveLength(0);
  });

  it('EXEMPTS a LONG attributed public select whose predicate trails the verb (the wider window)', () => {
    const v = run([
      repo(`
import { eq, desc } from 'drizzle-orm';
import { cardDesigns, users, games } from '../db/schema';
export async function trending(exec) {
  return exec
    .select({
      id: cardDesigns.id,
      name: cardDesigns.name,
      imageUrl: cardDesigns.imageUrl,
      thumbUrl: cardDesigns.thumbUrl,
      isPremium: cardDesigns.isPremium,
      gameId: cardDesigns.gameId,
      gameTitle: games.name,
      designerId: users.id,
      designerUsername: users.username,
    })
    // SYS-01-PUBLIC-READ: cross-user trending — published only, flattened urls, never composition
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .innerJoin(games, eq(games.id, cardDesigns.gameId))
    .where(eq(cardDesigns.status, 'published'))
    .orderBy(desc(cardDesigns.updatedAt));
}
`),
    ]);
    expect(v).toHaveLength(0);
  });

  // P3 REGRESSION — the predicate must belong to the MARKED STATEMENT, not a ±16-line window. Here the
  // marked gallery read has NO predicate, but `publishedOnly` is DEFINED just above AND a sibling marked
  // read calls `publishedOnly(...)` just below. The old window matched the neighbour and passed GREEN;
  // the statement-scoped check correctly fails the predicate-less read closed while keeping the sibling
  // (a genuine `publishedOnly(...)` read) green — one violation, on the stripped read only.
  it('FAILS CLOSED on a predicate-stripped marked read even when a sibling read uses publishedOnly()', () => {
    const v = run([
      repo(`
import { eq, and } from 'drizzle-orm';
import { cardDesigns, users } from '../db/schema';
export function publishedOnly(extra) {
  const pub = eq(cardDesigns.status, 'published');
  return extra ? and(pub, extra) : pub;
}
export async function listForGame(exec, gameId) {
  // SYS-01-PUBLIC-READ: cross-user gallery — published cards only, never composition
  return exec
    .select({ id: cardDesigns.id, name: cardDesigns.name, designer: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(eq(cardDesigns.gameId, gameId));
}
export async function findById(exec, cardId) {
  // SYS-01-PUBLIC-READ: cross-user adopt lookup — published cards only, never composition
  const rows = await exec
    .select({ id: cardDesigns.id, name: cardDesigns.name, designer: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(publishedOnly(eq(cardDesigns.id, cardId)))
    .limit(1);
  return rows[0] ?? null;
}
`),
    ]);
    // The stripped listForGame read fails closed (its `.from`/join carry no visibility predicate). The
    // companion test below proves the sibling findById is NOT falsely flagged once the predicate is
    // present — together they prove the check binds to the statement, not a neighbour's predicate.
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((x) => /cardDesigns|card_designs|users/.test(x.message))).toBe(true);
  });

  // The complement: the SAME two-read file with the predicate RESTORED is fully green (no false
  // positive on a legitimate `publishedOnly(...)` gallery read sitting next to its sibling).
  it('EXEMPTS the gallery read once its publishedOnly() predicate is present (sibling reads, both green)', () => {
    const v = run([
      repo(`
import { eq, and } from 'drizzle-orm';
import { cardDesigns, users } from '../db/schema';
export function publishedOnly(extra) {
  const pub = eq(cardDesigns.status, 'published');
  return extra ? and(pub, extra) : pub;
}
export async function listForGame(exec, gameId) {
  // SYS-01-PUBLIC-READ: cross-user gallery — published cards only, never composition
  return exec
    .select({ id: cardDesigns.id, name: cardDesigns.name, designer: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(publishedOnly(eq(cardDesigns.gameId, gameId)));
}
export async function findById(exec, cardId) {
  // SYS-01-PUBLIC-READ: cross-user adopt lookup — published cards only, never composition
  const rows = await exec
    .select({ id: cardDesigns.id, name: cardDesigns.name, designer: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(publishedOnly(eq(cardDesigns.id, cardId)))
    .limit(1);
  return rows[0] ?? null;
}
`),
    ]);
    expect(v).toHaveLength(0);
  });

  it('rejects each on-disk PUBLIC-READ misuse fixture (no-predicate · marked-write · composition-leak · neighbour-launder)', () => {
    const dir = join(process.cwd(), 'fixtures', 'bad-pr-corpus', 'rule-02-scoping');
    const all = collectFiles([dir], { exts: ['.ts'], cwd: process.cwd() });
    for (const name of [
      'public-read-no-predicate-repo.ts',
      'public-read-write-repo.ts',
      'public-read-composition-repo.ts',
      'public-read-neighbor-launder-repo.ts',
    ]) {
      const fixture = all.filter((f) => f.path.endsWith(name));
      expect(fixture, `${name} missing from the corpus`).toHaveLength(1);
      expect(run(fixture).length, `${name} was not flagged`).toBeGreaterThan(0);
    }
  });
});
