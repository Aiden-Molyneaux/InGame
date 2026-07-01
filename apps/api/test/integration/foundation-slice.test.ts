import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

// G-E — the un-retrofittable foundation lock-in. Proves the MOD-10 audit row writes TRANSACTIONALLY
// with a privileged mutation via the ONE `@mutation` seam (F16/F43): on commit BOTH the domain-event
// outbox row AND the audit row land; on failure NEITHER does (atomic rollback) — so there is no
// un-auditable privileged history and the emit/audit path can't be bypassed. Tags: MOD-10, SYS-07, ACH-08.

let container: StartedPostgreSqlContainer;

async function countRows() {
  const { getDb } = await import('../../src/db/client');
  const { domainEvents, adminAuditLog } = await import('../../src/db/schema');
  const events = await getDb().select().from(domainEvents);
  const audits = await getDb().select().from(adminAuditLog);
  return { events: events.length, audits: audits.length };
}

/** A synthetic PRIVILEGED mutation exercising the seam (emit + audit in one tx). */
async function privilegedOp(actorId: string, fail: boolean): Promise<void> {
  const { mutation } = await import('../../src/db/mutation');
  const op = mutation(
    { name: 'test.privileged', specIds: ['MOD-10'] },
    async (ctx, id: string) => {
      await ctx.emit({ eventType: 'profile.updated', entityRef: { type: 'user', id }, payload: {} });
      await ctx.audit({ action: 'test.privileged_action', target: { type: 'user', id }, reason: 'gate-E' });
      if (fail) throw new Error('boom AFTER emit + audit'); // forces a rollback of the whole tx
    },
  );
  await op(actorId);
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  const { runMigrations } = await import('../../src/db/migrate');
  await runMigrations();
}, 120_000);

afterAll(async () => {
  const { closeDb } = await import('../../src/db/client');
  await closeDb();
  if (container) await container.stop();
});

beforeEach(async () => {
  const { resetDb } = await import('../../src/db/reset');
  await resetDb();
});

describe('G-E · MOD-10: the audit row + the outbox event commit atomically via the @mutation seam', () => {
  it('on COMMIT: both the domain-event row AND the MOD-10 audit row are written', async () => {
    await privilegedOp(randomUUID(), false);
    expect(await countRows()).toEqual({ events: 1, audits: 1 });
  });

  it('on FAILURE after emit+audit: NEITHER row survives (transactional rollback — no un-auditable history)', async () => {
    await expect(privilegedOp(randomUUID(), true)).rejects.toThrow();
    expect(await countRows()).toEqual({ events: 0, audits: 0 });
  });
});
