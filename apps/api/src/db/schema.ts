import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
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
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  bio: text('bio').notNull().default(''),
  avatarUrl: text('avatar_url'),
  privacy: text('privacy').notNull().default('friends'),
  role: text('role').notNull().default('user'),
  adminTier: integer('admin_tier'),
  favouriteGameId: uuid('favourite_game_id'),
  favouriteGenreIds: uuid('favourite_genre_ids').array().notNull().default([]),
  usernamePending: boolean('username_pending').notNull().default(false),
  usernameChangedAt: timestamp('username_changed_at', { withTimezone: true }), // PROF-06 cooldown
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

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
