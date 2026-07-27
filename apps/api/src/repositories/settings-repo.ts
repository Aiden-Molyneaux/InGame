import { eq } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { serverSettings } from '../db/schema';

// `server_settings` — the GLOBAL owner-curated config kv (M6 P7 admin console v1, decision 0081).
// GLOBAL on the F32 manifest, so rule-2 actor-scoping does not apply (there is no owner column to
// scope by): the wall on the WRITE side is the route's `requireAdminTier(4)` gate + the MOD-10 audit
// row, not a SYS-01 predicate. Reads are unauthenticated-internal (GET /store resolves through them).
//
// Deliberately dumb: get/put a jsonb blob by key. Interpreting a value is the SERVICE's job (see
// services/admin/spotlight-service.ts) — this file must never learn what a setting means, or the next
// lever will grow a repository method instead of a service.

/** Setting keys are enumerated so a typo can never silently create a phantom setting. */
export const SETTING_KEYS = {
  /** SYS-04 — the curated Spotlight ids, in display order (a `string[]`). */
  spotlightIds: 'spotlight_ids',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** The raw stored value for a key, or `null` when nothing has ever been written. */
export async function getSetting(key: SettingKey, exec: Executor = getDb()): Promise<unknown | null> {
  const rows = await exec
    .select({ value: serverSettings.value })
    .from(serverSettings) // SYS-01-EXEMPT: server_settings (F32 global — server config, no owner key)
    .where(eq(serverSettings.key, key))
    .limit(1);
  return rows.length > 0 ? (rows[0]!.value ?? null) : null;
}

/** Upsert a setting (last write wins — the console is a single-operator surface at v1). */
export async function putSetting(
  key: SettingKey,
  value: unknown,
  exec: Executor = getDb(),
): Promise<void> {
  await exec
    .insert(serverSettings) // SYS-01-EXEMPT: server_settings (F32 global — server config, no owner key)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: serverSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
