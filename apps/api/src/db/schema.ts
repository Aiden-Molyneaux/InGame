import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

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
 * `friendships` — the minimal READ substrate GET /users/:id needs to resolve `relationship` +
 * friend-vs-non-friend privacy shapes + mutual-friends count (PROF-03/05, SOC-01). M2 builds the
 * table + read resolvers + seed helpers ONLY — the friend request/accept/decline ENDPOINTS are SOC/M6
 * (not built here). USER-OWNED. `status ∈ pending|accepted`; a pending row's requester→addressee
 * direction drives `outgoing`/`incoming`.
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
    status: text('status').notNull(), // 'pending' | 'accepted'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairIdx: uniqueIndex('friendships_pair_idx').on(table.requesterId, table.addresseeId),
    requesterIdx: index('friendships_requester_idx').on(table.requesterId),
    addresseeIdx: index('friendships_addressee_idx').on(table.addresseeId),
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

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type AuthIdentityRow = typeof authIdentities.$inferSelect;
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type AuthTokenRow = typeof authTokens.$inferSelect;
export type GamertagRow = typeof gamertags.$inferSelect;
export type FriendshipRow = typeof friendships.$inferSelect;
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
export type GameGenreRow = typeof gameGenres.$inferSelect;
export type CollectionEntryRow = typeof collectionEntries.$inferSelect;
export type NewCollectionEntryRow = typeof collectionEntries.$inferInsert;
