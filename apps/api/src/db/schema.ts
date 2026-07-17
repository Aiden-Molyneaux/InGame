import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  bigserial,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import type { StickerComposition } from '@ingame/shared';

// M2 data layer (product-spec §6 entity map). Every table here is USER-OWNED unless it is on the F32
// global-table manifest (packages/shared) — the rule-2 scope-lint treats an unlisted table as
// user-owned and FAILS CLOSED, so a new table needs no lint change to be guarded. Migrations are
// generated + committed + PR-reviewed; all M2 additions are ADDITIVE (new tables / nullable columns),
// never destructive (a destructive/irreversible migration is an owner change-class, decision 0046 #7).

/**
 * `users` — identity + profile (product-spec §6). USER-OWNED (owner key = its own `id`).
 *  - `passwordHash`  AUTH-01 (argon2id); NULL for an Apple-only account (no password set yet).
 *  - `emailVerifiedAt` AUTH-08 soft verification (gates nothing in v2).
 *  - `role ∈ user|admin` + `adminTier ∈ 1..4` (admins only) — SYS-08 / api-contract 0.30. The old
 *    `moderator` value was dropped/burned (decision 0034); it is NOT reintroduced.
 *  - `favouriteGameId` PROF-01 (no FK yet — the `games` catalog is M3; validated as a uuid at the
 *    schema boundary, catalog-existence validation deferred to M3).
 *  - `favouriteGenreIds` PROF-01 (uuid[]; genre-catalog validation deferred to M3 / CAT-04).
 *  - `usernamePending` AUTH-09 — a first Apple sign-in must complete a unique username before entry.
 *  - `deletedAt` AUTH-07 soft-delete → the anonymized-author serializer shape (F06).
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // OQ-124: `username` keeps its typed display casing; uniqueness is enforced on the derived
  // case-folded `usernameNormalized` column (users_username_normalized_idx below).
  username: text('username').notNull(),
  // DB-GENERATED case-fold of username — the uniqueness key, so 'Aiden' and 'aiden' collide. The app
  // never writes it; findByUsername compares against it. Mirrors the games.normalized_name pattern.
  usernameNormalized: text('username_normalized').generatedAlwaysAs(sql`lower("username")`),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  bio: text('bio').notNull().default(''),
  avatarUrl: text('avatar_url'),
  privacy: text('privacy').notNull().default('friends'),
  role: text('role').notNull().default('user'),
  adminTier: integer('admin_tier'),
  // M3: FK'd to the catalog (the deferred-to-M3 existence guarantee the M2 comment promised).
  // (The explicit AnyPgColumn annotations break the users↔games circular type inference.)
  favouriteGameId: uuid('favourite_game_id').references((): AnyPgColumn => games.id, {
    onDelete: 'set null',
  }),
  favouriteGenreIds: uuid('favourite_genre_ids').array().notNull().default([]),
  usernamePending: boolean('username_pending').notNull().default(false),
  usernameChangedAt: timestamp('username_changed_at', { withTimezone: true }), // PROF-06 cooldown
  // WTP-03 — the single Now-Playing pin (one per user; PUT /me/now-playing sets/clears it; the
  // collection items' `nowPlaying` flag derives from it).
  nowPlayingGameId: uuid('now_playing_game_id').references((): AnyPgColumn => games.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  // OQ-124 — case-INSENSITIVE username uniqueness enforced on the generated case-fold column. The
  // app-layer findByUsername pre-check yields the friendly "taken" message; this is the race-safe
  // backstop (mirrors games_normalized_name_live_idx).
  usernameNormalizedIdx: uniqueIndex('users_username_normalized_idx').on(table.usernameNormalized),
}));

/**
 * `auth_identities` — external login identities linked to a user (AUTH-09). One row per
 * (provider, subject); linked to a user by verified-email match. Private-relay emails accepted.
 * USER-OWNED (owner key = `user_id`).
 */
export const authIdentities = pgTable(
  'auth_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'apple' (Google parked, §10)
    subject: text('subject').notNull(), // the provider's stable subject id (Apple `sub`)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerSubjectIdx: uniqueIndex('auth_identities_provider_subject_idx').on(
      table.provider,
      table.subject,
    ),
    userIdx: index('auth_identities_user_idx').on(table.userId),
  }),
);

/**
 * `refresh_tokens` — the server-side refresh-token store backing rotation + reuse-detection (AUTH-02
 * /05, decision §7.1: F15). Refresh tokens are OPAQUE random secrets; only their hash is stored. On
 * refresh the presented token is rotated (a new token replaces it, `rotatedAt` + `replacedById` set).
 * Presenting an ALREADY-ROTATED or REVOKED token = reuse → the WHOLE `familyId` is revoked (forces
 * re-auth). USER-OWNED (owner key = `user_id`).
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedById: uuid('replaced_by_id'),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('refresh_tokens_token_hash_idx').on(table.tokenHash),
    familyIdx: index('refresh_tokens_family_idx').on(table.familyId),
    userIdx: index('refresh_tokens_user_idx').on(table.userId),
  }),
);

/**
 * `auth_tokens` — single-use, time-boxed tokens for password reset (AUTH-04, ~1h) and email
 * verification (AUTH-08). Only the token HASH is stored; `consumedAt` enforces single-use. USER-OWNED.
 */
export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(), // 'password_reset' | 'email_verify'
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('auth_tokens_token_hash_idx').on(table.tokenHash),
    userPurposeIdx: index('auth_tokens_user_purpose_idx').on(table.userId, table.purpose),
  }),
);

/**
 * `invite_tokens` — SOC-10 share/QR invite tokens (M6 P3; decision 0076 §0.6). A token is a BEARER
 * credential (an unguessable server-random ≥32-byte secret rendered base64url) — so ONLY its SHA-256
 * HASH is stored here, never the token itself (the refresh-token / auth-token precedent). The plaintext
 * is returned to the minter ONCE by POST /me/invites; GET /invites/:token resolves it on the AUTH-LOOKUP
 * read class (lookup-by-hash, pre-actor). USER-OWNED (owner key = `user_id`).
 *
 * MECHANICS (decision 0076 §0.6): TTL 7 days (`expires_at`) · ≤5 ACTIVE per user (create-new-
 * invalidates-oldest → `revoked_at` stamped on the surplus, serialized per-user by an advisory lock so
 * parallel mints can't overshoot the cap) · MULTI-REDEMPTION within TTL (the resolve is a READ — a token
 * is never consumed, so a party QR survives many scans). "Active" = `revoked_at IS NULL AND expires_at >
 * now`. The unique index on `token_hash` is the collision backstop (a 256-bit random never collides in
 * practice; the DB guarantees it).
 */
export const inviteTokens = pgTable(
  'invite_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }), // NULL = live; set on create-new-invalidates-oldest
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('invite_tokens_token_hash_idx').on(table.tokenHash),
    userIdx: index('invite_tokens_user_idx').on(table.userId),
  }),
);

/**
 * `gamertags` — per-platform handles managed from the Profile (PROF-02). One handle per
 * (user, platform). USER-OWNED (owner key = `user_id`).
 */
export const gamertags = pgTable(
  'gamertags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(), // controlled list — pc|playstation|xbox|nintendo
    handle: text('handle').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userPlatformIdx: uniqueIndex('gamertags_user_platform_idx').on(table.userId, table.platform),
    userIdx: index('gamertags_user_idx').on(table.userId),
  }),
);

/**
 * `friendships` — the ACCEPTED-bond store (SOC-01). The read substrate GET /users/:id needs to resolve
 * `relationship` + friend-vs-non-friend privacy shapes + mutual-friends count (PROF-03/05); M6 P1 owns
 * the write side (accept forms the bond; block/unfriend sever it). The PENDING lifecycle lives in
 * `friend_requests` (the M6 split) — a row here is `status = 'accepted'`. USER-OWNED. `requesterId`
 * keeps the directional origin (who accepted whom) but the bond itself is UNDIRECTED — hence the
 * canonical one-bond-per-pair guard below.
 *
 * ONE-BOND-PER-PAIR (decision 0076 §0.1, M6 P1): `friendships_canonical_accepted_idx` is a UNIQUE
 * FUNCTIONAL index on `(LEAST(requester_id, addressee_id), GREATEST(...))` filtered to accepted rows —
 * so at most ONE accepted bond exists per pair REGARDLESS of which direction accepted it. It is the
 * F36 backstop for reciprocal accepts (A accepts B→A while B accepts A→B): the second insert hits this
 * index and raises unique_violation, which the service swallows gracefully (one bond survives). The
 * older directional `friendships_pair_idx` stays (it forbids a same-direction duplicate); the new
 * functional index adds the reverse-direction guard the M2 substrate lacked.
 */
export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // 'accepted' (the M6 split — pending lives in friend_requests)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairIdx: uniqueIndex('friendships_pair_idx').on(table.requesterId, table.addresseeId),
    // ONE-BOND-PER-PAIR — direction-agnostic uniqueness for accepted bonds (decision 0076 §0.1, F36).
    canonicalAcceptedIdx: uniqueIndex('friendships_canonical_accepted_idx')
      .on(sql`LEAST(${table.requesterId}, ${table.addresseeId})`, sql`GREATEST(${table.requesterId}, ${table.addresseeId})`)
      .where(sql`status = 'accepted'`),
    requesterIdx: index('friendships_requester_idx').on(table.requesterId),
    addresseeIdx: index('friendships_addressee_idx').on(table.addresseeId),
  }),
);

/**
 * `friend_requests` — the SOC-08 friend-REQUEST lifecycle (M6 §1 spike / P1). USER-OWNED (both parties;
 * every read is actor-scoped — the actor is `from` OR `to`). `status ∈ pending|accepted|declined|
 * cancelled`; a PENDING row is the live request that drives `outgoing`/`incoming` (getRelationship reads
 * pending direction from HERE, accepted bonds from `friendships`). `cooldownUntil` is the SOC-08
 * re-request cooldown stamp (set on decline OR cancel; enforced at create by the service, config/social.ts).
 * Accepting a request writes the `accepted` bond into `friendships` (the accepted store all the M2/M5
 * readers already consume).
 *
 * PENDING-PAIR UNIQUENESS (decision 0076 §0.1, M6 P1 — the F36 double-POST guard):
 * `friend_requests_pending_pair_idx` is a PARTIAL UNIQUE FUNCTIONAL index on
 * `(LEAST(from_user_id, to_user_id), GREATEST(...)) WHERE status = 'pending'` — so AT MOST ONE pending
 * request can exist between a pair in EITHER direction. The spike's service-layer `findPendingBetween`
 * pre-check was not concurrency-safe (two parallel POSTs both saw no pending, both inserted); this index
 * is the backstop — the second insert raises unique_violation, which the service resolves to either
 * REQUEST_PENDING (same-direction double-POST) or the mutual-pending auto-accept (reverse-direction).
 * A declined/cancelled row is NOT pending, so a post-cooldown re-request inserts a fresh pending row.
 */
export const friendRequests = pgTable(
  'friend_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'), // pending | accepted | declined | cancelled
    cooldownUntil: timestamp('cooldown_until', { withTimezone: true }), // SOC-08 (stamped on decline/cancel; enforced at create)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fromToIdx: index('friend_requests_from_to_idx').on(table.fromUserId, table.toUserId),
    toIdx: index('friend_requests_to_idx').on(table.toUserId),
    // The F36 double-POST guard — one pending request per pair, direction-agnostic (decision 0076 §0.1).
    pendingPairIdx: uniqueIndex('friend_requests_pending_pair_idx')
      .on(sql`LEAST(${table.fromUserId}, ${table.toUserId})`, sql`GREATEST(${table.fromUserId}, ${table.toUserId})`)
      .where(sql`status = 'pending'`),
  }),
);

/**
 * `user_blocks` — the minimal READ substrate for the GET /users/:id non-disclosure collapse (SOC-09).
 * A block in EITHER direction collapses the target to the generic "unavailable" shape. M2 builds the
 * table + read resolver + seed helper ONLY — the block/unblock ENDPOINTS are SOC/M6. USER-OWNED.
 */
export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairIdx: uniqueIndex('user_blocks_pair_idx').on(table.blockerId, table.blockedId),
    blockerIdx: index('user_blocks_blocker_idx').on(table.blockerId),
    blockedIdx: index('user_blocks_blocked_idx').on(table.blockedId),
  }),
);

/**
 * `user_suspensions` — the minimal state backing (a) the AUTH-02 login → ACCOUNT_SUSPENDED contract
 * and (b) the GET /users/:id "unavailable" collapse (MOD-09). An active suspension = a row with no
 * `liftedAt` and (`endsAt` NULL [indefinite] OR `endsAt` in the future). M2 builds the table + read
 * resolver + seed helper ONLY — the suspend/unsuspend ENDPOINTS are MOD-09/M7. USER-OWNED.
 */
export const userSuspensions = pgTable(
  'user_suspensions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id'), // the admin who suspended (nullable for seeded/system)
    reason: text('reason').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }), // NULL = indefinite
    liftedAt: timestamp('lifted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subjectIdx: index('user_suspensions_subject_idx').on(table.subjectId),
  }),
);

/**
 * `admin_audit_log` — the MOD-10 append-only audit trail (decision 0034/0035; F16). Foundation-phase
 * plumbing: every privileged mutation writes one row INSIDE its own transaction via the `@mutation`
 * seam (`ctx.audit(...)`), so there is no un-auditable history and no retrofit. M2 builds the table +
 * the transactional seam; the privileged OPERATIONS that call it are M7. Append-only.
 */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').notNull(),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorIdx: index('admin_audit_log_actor_idx').on(table.actorId),
    targetIdx: index('admin_audit_log_target_idx').on(table.targetType, table.targetId),
  }),
);

/**
 * `domain_events` — the transactional OUTBOX (decision 0051/F01/F24). Every mutation writes one row
 * here INSIDE its own transaction (via emitOnCommit). Append-only; the relay/consumer that drains it
 * is deferred to M7. `payload` carries the changed field-set + ids, not whole rows (F18).
 */
export const domainEvents = pgTable(
  'domain_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: text('event_type').notNull(),
    eventVersion: integer('event_version').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    actorId: uuid('actor_id').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorIdx: index('domain_events_actor_idx').on(table.actorId),
    typeIdx: index('domain_events_type_idx').on(table.eventType),
  }),
);

/**
 * `genres` — the CAT-04 controlled genre list. GLOBAL (on the F32 manifest) — community reference
 * data, not user-owned. Content is seeded by migration 0003 with FIXED ids so environments agree;
 * the canonical list is owner config (SYS-08 P4) — the seeded set is `ASSUMPTION(OQ-125)`-tagged.
 */
export const genres = pgTable('genres', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * `games` — the community catalog's canonical entry (CAT-02, §6 entity map). GLOBAL (F32 manifest):
 * community data every user reads; writes only via the dedup-guarded create (CAT-03).
 *  - `normalizedName` — the CAT-03 dedup key (case/punctuation-folded, packages/shared normalizer).
 *    UNIQUE among LIVE rows (partial index) so an exact-normalized duplicate is impossible even
 *    under concurrent creates (the F36 race) — near-dups get the 409-warn instead.
 *  - `createdBy` — contributor credit (CAT-05); anonymized on AUTH-07 deletion (M7).
 *  - `deletedAt`/`deletedBy` — the dedup-grace soft delete (admin junk-removal/merge is M7).
 */
export const games = pgTable(
  'games',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    studio: text('studio'), // CAT-02 optional (developer)
    publisher: text('publisher'), // CAT-02 optional
    releaseDate: date('release_date'), // CAT-02 optional; CAT-08 upcoming = a future date
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: uuid('deleted_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    normalizedLiveIdx: uniqueIndex('games_normalized_name_live_idx')
      .on(table.normalizedName)
      .where(sql`deleted_at IS NULL`),
    createdByIdx: index('games_created_by_idx').on(table.createdBy),
  }),
);

/** `game_genres` — games × controlled genres (CAT-02/04). GLOBAL (F32 manifest). */
export const gameGenres = pgTable(
  'game_genres',
  {
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    genreId: uuid('genre_id')
      .notNull()
      .references(() => genres.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.gameId, table.genreId] }),
    genreIdx: index('game_genres_genre_idx').on(table.genreId),
  }),
);

/**
 * `collection_entries` — user × game (COL-01..07, §6 entity map). USER-OWNED (owner key = `user_id`;
 * NOT on the F32 manifest — rule-2 fails closed). One row per (user, game) — the unique pair index
 * also decides the F36 concurrent double-add race (one wins, the rest 4xx).
 *  - `status` — the COL-02 six-status enum; the shared zod schema owns the wire values.
 *  - `hours` — COL-03 manual hours, server-bounded ≤99,999 (decision 0043; the cap alone ships now,
 *    the anomaly pending-review is M7). `hoursSource` keeps the column import-ready.
 *  - `position` — the COL-07 manual order (append on add; `PATCH /me/collection/reorder` rewrites).
 *  - `notes`/`rating` — COL-05/COL-03 PRIVATE personal fields (never serialized to others).
 *  - `activeCardDesignId` — COL-06 equip (M4, decision 0066): the owner's selected design; ON DELETE
 *    SET NULL backs the CARD-18 default-face guarantee behind the 0040 409-guard. NO
 *    `collection_platforms` yet (COL-04 rides the platform work; `platformIds` deferred with it).
 */
export const collectionEntries = pgTable(
  'collection_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id),
    status: text('status').notNull().default('backlog'),
    hours: integer('hours').notNull().default(0),
    hoursSource: text('hours_source').notNull().default('manual'),
    percentComplete: integer('percent_complete'),
    ownedSince: date('owned_since'), // COL-03 date acquired — defaults to the add date in code
    rating: integer('rating'), // COL-03 private ⭐ (1..5)
    notes: text('notes'), // COL-05 (column now; the write path rides later scope)
    // COL-06 (M4, decision 0066 §5) — the equipped design; SET NULL degrades to the CARD-18 default.
    activeCardDesignId: uuid('active_card_design_id').references((): AnyPgColumn => cardDesigns.id, {
      onDelete: 'set null',
    }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), // recently-added
  },
  (table) => ({
    userGameIdx: uniqueIndex('collection_entries_user_game_idx').on(table.userId, table.gameId),
    userIdx: index('collection_entries_user_idx').on(table.userId),
    userPositionIdx: index('collection_entries_user_position_idx').on(table.userId, table.position),
  }),
);

/**
 * `card_designs` — the CARD-24a draft document + saved designs (M4, decision 0066 §3). USER-OWNED
 * (owner key = `owner_id`; NOT on the F32 manifest — rule-2 fails closed).
 *  - `status ∈ draft|private|published` — the CARD-14 lifecycle (`published` unused until M5 publish;
 *    kept now so M5 needs no migration). The shared zod schema owns the wire values.
 *  - `composition` — the CARD-15 source of truth (shared compositionSchema-validated at the boundary);
 *    OWNER-ONLY on the wire (0066 §2 — viewers get flattened images at M5, never layers).
 *  - `compositionHash` — the version-aware content hash (CARD-19's dedup substrate).
 *  - `imageUrl`/`thumbUrl` — NULL until the M5 flatten-to-storage (0066 §1).
 *  - `isPremium` — CARD-06 derived; always false on the M4 free baseline (COSM-02/0063).
 *  - Adoption grants deliberately DO NOT live here (a separate M5 table — 0066 §3).
 */
export const cardDesigns = pgTable(
  'card_designs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id),
    name: text('name').notNull(),
    status: text('status').notNull().default('draft'),
    composition: jsonb('composition').notNull().$type<Record<string, unknown>>(),
    compositionHash: text('composition_hash').notNull(),
    imageUrl: text('image_url'),
    thumbUrl: text('thumb_url'),
    isPremium: boolean('is_premium').notNull().default(false),
    // CARD-13/decision 0072 (M5 P3) — the DENORMALIZED premium component ids this card carries, set at
    // PUBLISH (from the composition's premium cosmetic refs, after the reconcile gate proved the
    // DESIGNER owns them all). Empty until publish + empty in real data (roster all-free until P10).
    // The gallery's personalized `priceForYou` and adopt's component-acquire read THIS — so no
    // cross-user read of the private `composition` is ever needed (the OQ-122 composition-exclusion
    // guarantee holds for the whole publish/adopt/gallery surface).
    premiumComponentIds: text('premium_component_ids').array().notNull().default([]),
    // CARD-22 / OQ-146 (decision 0076 §0.2, M6 P2) — the DENORMALIZED equipped-readout DISPLAY LABELS
    // ({ base?, frame?, effect?, finish?, nameplate?, font? }, ALL slots incl. free), snapshotted at
    // PUBLISH from the composition (after the CARD-13 reconcile). This is what makes the CARD-22 readout
    // computable CROSS-USER (gallery · adopted switcher · friend collection · compare) WITHOUT ever
    // reading the private `composition` (the OQ-122 exclusion holds — the same denormalization seam as
    // `premium_component_ids`). Empty `{}` until publish; backfilled for existing published cards by the
    // tested src/db/backfill-equipped-labels.ts (mirrors the 0015 worn-premium-reset pattern).
    equippedLabels: jsonb('equipped_labels')
      .notNull()
      .$type<Record<string, string>>()
      .default({}),
    // CARD-24a copy-on-write (decision 0067): editing a committed card spins a draft COPY that
    // points here at its origin. NULL for from-scratch drafts. ON DELETE SET NULL — if the origin
    // is deleted the copy degrades to a standalone draft, never a broken ref (belt-and-braces).
    derivedFromCardId: uuid('derived_from_card_id').references(
      (): AnyPgColumn => cardDesigns.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerGameIdx: index('card_designs_owner_game_idx').on(table.ownerId, table.gameId),
  }),
);

/**
 * `style_presets` — CARD-24b reusable game-agnostic closed-attribute recipes (M4, decision 0066 §4).
 * USER-OWNED (owner key = `owner_id`). The cap-30 (SYS-04) is SERVICE-enforced (409 PRESET_LIMIT),
 * not a DB constraint; `style` is the api-contract 0.51 recipe shape (shared zod-validated).
 */
export const stylePresets = pgTable(
  'style_presets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    style: jsonb('style').notNull().$type<Record<string, unknown>>(),
    isPremium: boolean('is_premium').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index('style_presets_owner_idx').on(table.ownerId),
  }),
);

/**
 * `device_configs` — the user's LIVE device (M4 §3.5, DEV-01/02/03/04 · decision 0030). USER-OWNED
 * (owner key = `user_id`; one row per user — `user_id` is UNIQUE so the ARCH-3 write pipeline UPSERTs).
 * A user with NO row reads the free DEFAULTS (teal · midnight · empty) — the service never creates a
 * row on read (DEV-03: a free default device always renders). NOT on the F32 manifest — rule-2 fails
 * closed. All roster ids are client constants at M4 (cosmetic entities later, 0063); everything free
 * (0068), so `/me/device` only ever references owned items by construction.
 *  - `stickerComposition` — the OQ-062 versioned shape (shared stickerCompositionSchema-validated at
 *    the boundary + a rotated-bounds re-check in the service); stickers ride the PLASTIC zones only.
 */
export const deviceConfigs = pgTable('device_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  activeShellId: text('active_shell_id').notNull().default('teal'),
  screenThemeId: text('screen_theme_id').notNull().default('midnight'),
  stickerComposition: jsonb('sticker_composition')
    .notNull()
    .$type<StickerComposition>()
    .default({ version: 1, stickers: [] }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * `device_looks` — saved device "looks" (DEV-05/OQ-064 · decision 0030). USER-OWNED (owner key =
 * `user_id`). Each row is a SNAPSHOT of the three device facets; NO name (identified by shell·theme,
 * owner ruling). SAVE CURRENT snapshots the live config into a new row; apply = the client PATCHes the
 * snapshot's facets onto `/me/device` (no dedicated apply endpoint); the ON NOW badge is computed
 * client-side (facets == the live device), never stored. Capped ~12 (SERVICE-enforced → 422
 * LOOK_CAP_REACHED; the F36 parallel-save race is serialized by a per-actor advisory lock).
 */
export const deviceLooks = pgTable(
  'device_looks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activeShellId: text('active_shell_id').notNull(),
    screenThemeId: text('screen_theme_id').notNull(),
    stickerComposition: jsonb('sticker_composition').notNull().$type<StickerComposition>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('device_looks_user_idx').on(table.userId),
  }),
);

/**
 * `wallets` — the ECON-07 currency balance (one per user). USER-OWNED (owner key = `user_id`, UNIQUE
 * so the lazy get-or-create UPSERTs; NOT on the F32 manifest — rule-2 fails closed). Lazy-materialized
 * on the first wallet-touching mutation (decision 0072/0074: the 10-PX `starting_grant` row is written in
 * the same transaction, ECON-02). `balance` is always derivable from `currency_ledger` (the reconcile
 * invariant, ECON-07) and MAY go negative to the SYS-04 refund floor (ECON-09). Never written raw —
 * every change funnels through the ledger service (SELECT … FOR UPDATE + one ledger row per delta).
 */
export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * `currency_ledger` — the ECON-07 append-only earn/spend history (auditability + the user-facing
 * ledger). USER-OWNED (owner key = `user_id`; NOT on the F32 manifest — rule-2 fails closed).
 * APPEND-ONLY: the codebase exposes NO update/delete path — every economic effect is a NEW row, and
 * `sum(delta) == wallets.balance` is the standing reconcile invariant (ECON-07).
 *  - `reason` — the pinned enum (decision 0073; shared `LEDGER_REASONS`), validated in the service.
 *  - `refType`/`refId` — nullable polymorphic context (`refId` is TEXT so it holds a uuid card id, a
 *    text cosmetic roster id (0063), or an external receipt id). Not a DB FK (polymorphic).
 *  - `periodKey` — period-scoped idempotency key: the daily bonus stamps the UTC-day (`YYYY-MM-DD`)
 *    so a partial-unique index makes a second same-day claim impossible even under the F36 race.
 */
export const currencyLedger = pgTable(
  'currency_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Monotonic insertion order — the stable newest-first key. `created_at` is `now()` (transaction
    // time), so rows written in ONE transaction (the first-touch grant + a claim, or P3's multi-row
    // adopt) share a timestamp; `seq` breaks the tie deterministically by insertion order.
    seq: bigserial('seq', { mode: 'number' }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull(),
    refType: text('ref_type'),
    refId: text('ref_id'),
    periodKey: text('period_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Newest-first paginated reads (ECON-07) — ordered by the monotonic seq (the wallet history view).
    userSeqIdx: index('currency_ledger_user_seq_idx').on(table.userId, table.seq),
    // Period-scoped idempotency (ECON-02): one row per (user, reason, period) among period-stamped
    // rows — the daily-claim race backstop behind the wallet-row FOR UPDATE lock.
    userReasonPeriodIdx: uniqueIndex('currency_ledger_user_reason_period_idx')
      .on(table.userId, table.reason, table.periodKey)
      .where(sql`period_key IS NOT NULL`),
  }),
);

/**
 * `store_products` — the IAP product catalog (currency packs, ECON-10). GLOBAL (on the F32 manifest —
 * product definitions, not per-user state). Seeded from the decision 0072 pricing sheet by P10.
 *  - `productId` — the store SKU (`px_pack_starter` / `px_pack_010` …), UNIQUE; matches App Store
 *    Connect / RevenueCat product ids.
 *  - `oneTime` — the ECON-10 Starter Pack (once/account, enforced server-side by P2, not here).
 */
export const storeProducts = pgTable('store_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: text('product_id').notNull().unique(),
  pixels: integer('pixels').notNull(),
  oneTime: boolean('one_time').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * `iap_receipts` — validated IAP receipts (ECON-06, P2's grant-idempotency substrate). USER-OWNED
 * (owner key = `user_id`; NOT on the F32 manifest — rule-2 fails closed). `receiptId` is UNIQUE so a
 * replayed receipt can never double-grant (the ECON-06 invariant). Built now (P1 migration); the
 * validation/grant path that writes it is P2.
 */
export const iapReceipts = pgTable(
  'iap_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(), // 'ios' | 'android'
    receiptId: text('receipt_id').notNull().unique(),
    productId: text('product_id').notNull(),
    pixelsGranted: integer('pixels_granted').notNull(),
    raw: jsonb('raw').notNull().$type<Record<string, unknown>>(),
    validatedAt: timestamp('validated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('iap_receipts_user_idx').on(table.userId),
  }),
);

/**
 * `card_adoptions` — the CARD-04 adoption grant (M5 P3 / the §1 spike substrate; the separate grants
 * table 0066 §3 promised — grants deliberately do NOT live on `card_designs`). USER-OWNED (owner key =
 * `adopter_id`; NOT on the F32 manifest — rule-2 fails closed). One row per (adopter, cardDesign) — the
 * unique pair backs `ALREADY_ADOPTED` idempotency (OQ-101) and decides the F36 parallel-adopt race.
 *  - `currencyPaid` — the PX the adopter paid for the card's premium components (decision 0072); 0 on
 *    the free path (no premium / all owned) — the whole M5 §1 spike surface.
 *  - The card's public adoption count is DERIVED (`count(card_adoptions)` per card, an anonymous
 *    cross-user aggregate — SYS-01-COMMUNITY-AGGREGATE), never a denormalized counter, so the adopter
 *    never writes the card owner's row (a cross-owner write the SYS-01 scope-lint would rightly refuse).
 *  - `revokedAt` (M5 F-2b, migration 0012) — the UN-ADOPT soft flag (CARD-14/20: deleting an adopted
 *    card removes only the caller's copy, "no effect on the adoption count"). A revoked row vanishes
 *    from the adopter's OWN surfaces (switcher/rider/equip/share) but STAYS in the derived count +
 *    the designer's clout (count = all-time adoptions — the honest reading of the count-unaffected
 *    clause). Re-adopting REACTIVATES the row (clears the flag; the acquire re-runs, charging only
 *    components no longer owned — normally 0, entitlements persist). Rows are never hard-deleted.
 */
export const cardAdoptions = pgTable(
  'card_adoptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adopterId: uuid('adopter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cardDesignId: uuid('card_design_id')
      .notNull()
      .references(() => cardDesigns.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id),
    currencyPaid: integer('currency_paid').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }), // null = active grant (M5 F-2b un-adopt)
  },
  (table) => ({
    adopterCardIdx: uniqueIndex('card_adoptions_adopter_card_idx').on(
      table.adopterId,
      table.cardDesignId,
    ),
    cardIdx: index('card_adoptions_card_idx').on(table.cardDesignId),
    adopterIdx: index('card_adoptions_adopter_idx').on(table.adopterId),
  }),
);

/**
 * `user_entitlements` — the COSM-03 account-wide cosmetic ownership grant (M5 P4, decision 0072/0073).
 * USER-OWNED (owner key = `user_id`; NOT on the F32 manifest — rule-2 fails closed; `cosmetic_items` IS
 * on that manifest — the GLOBAL catalog definition table P10 seeds — this table is the per-user grant,
 * a different concern). One row per (user, cosmeticId) — the unique pair backs idempotent acquire
 * (a re-acquire of an owned item is a no-op) and decides the F36 parallel-acquire race under the
 * wallet-row lock (P1's single serialization point — acquireComponents locks the wallet FIRST, so a
 * second concurrent acquire for the same actor/item queues behind it and re-reads "already owned").
 *  - `cosmeticId` — TEXT (not a FK — the `cosmetic_items` catalog table doesn't exist yet; P10 seeds
 *    the real roster). Matches the roster item id (COSM-01) once P10 formalizes it.
 *  - `source` — `purchase` (Store BUY / adopt's component acquire) · `earned` (ACH-04, M7) ·
 *    `operator_grant` (ECON-11 service-layer op). Never updated in place — a clawback DELETEs the row
 *    (the v2 exception to ECON-09's "not clawed back").
 */
export const userEntitlements = pgTable(
  'user_entitlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cosmeticId: text('cosmetic_id').notNull(),
    source: text('source').notNull(), // 'purchase' | 'earned' | 'operator_grant'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCosmeticIdx: uniqueIndex('user_entitlements_user_cosmetic_idx').on(
      table.userId,
      table.cosmeticId,
    ),
    userIdx: index('user_entitlements_user_idx').on(table.userId),
  }),
);

export type UserEntitlementRow = typeof userEntitlements.$inferSelect;
export type NewUserEntitlementRow = typeof userEntitlements.$inferInsert;

export type WalletRow = typeof wallets.$inferSelect;
export type CurrencyLedgerRow = typeof currencyLedger.$inferSelect;
export type NewCurrencyLedgerRow = typeof currencyLedger.$inferInsert;
export type StoreProductRow = typeof storeProducts.$inferSelect;
export type IapReceiptRow = typeof iapReceipts.$inferSelect;
export type CardAdoptionRow = typeof cardAdoptions.$inferSelect;
export type NewCardAdoptionRow = typeof cardAdoptions.$inferInsert;

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type AuthIdentityRow = typeof authIdentities.$inferSelect;
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type AuthTokenRow = typeof authTokens.$inferSelect;
export type InviteTokenRow = typeof inviteTokens.$inferSelect;
export type GamertagRow = typeof gamertags.$inferSelect;
export type FriendshipRow = typeof friendships.$inferSelect;
export type FriendRequestRow = typeof friendRequests.$inferSelect;
export type NewFriendRequestRow = typeof friendRequests.$inferInsert;
export type UserBlockRow = typeof userBlocks.$inferSelect;
export type UserSuspensionRow = typeof userSuspensions.$inferSelect;
export type AdminAuditRow = typeof adminAuditLog.$inferSelect;
export type AdminAuditInsert = typeof adminAuditLog.$inferInsert;
export type DomainEventInsert = typeof domainEvents.$inferInsert;
export type GenreRow = typeof genres.$inferSelect;
export type GameRow = typeof games.$inferSelect;
export type NewGameRow = typeof games.$inferInsert;
export type CardDesignRow = typeof cardDesigns.$inferSelect;
export type StylePresetRow = typeof stylePresets.$inferSelect;
export type DeviceConfigRow = typeof deviceConfigs.$inferSelect;
export type DeviceLookRow = typeof deviceLooks.$inferSelect;
export type GameGenreRow = typeof gameGenres.$inferSelect;
export type CollectionEntryRow = typeof collectionEntries.$inferSelect;
export type NewCollectionEntryRow = typeof collectionEntries.$inferInsert;
