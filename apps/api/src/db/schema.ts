import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// M1 data layer — the minimum the F29 slice needs to mutate a real row + emit a real outbox event.
// (The full §6 entity map lands incrementally across M2+.)

/**
 * `users` — identity + profile (product-spec §6). USER-OWNED: it is NOT on the F32 global-table
 * manifest, so the rule-2 scope-lint requires the SYS-01 scoped helper for every read/modify. The
 * owner key for this table is its own `id` (see db/scoped + repositories/profile-repo).
 * `deleted_at` backs the AUTH-07 anonymized-author serializer shape (F06).
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  bio: text('bio').notNull().default(''),
  avatarUrl: text('avatar_url'),
  privacy: text('privacy').notNull().default('friends'),
  role: text('role').notNull().default('user'),
  adminTier: integer('admin_tier'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

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
export type DomainEventInsert = typeof domainEvents.$inferInsert;
