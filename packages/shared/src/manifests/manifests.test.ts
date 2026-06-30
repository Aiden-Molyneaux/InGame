import { describe, it, expect } from 'vitest';
import { DOMAIN_EVENT_TYPES, isDomainEventType } from '../events/registry';
import { GLOBAL_TABLES, isGlobalTable } from './global-tables';
import { MINIMUM_M1_SPINE, M1_SHIP_BLOCKERS } from './minimum-m1';

describe('ACH-08/F01: domain-event registry', () => {
  it('recognizes registered types and rejects unregistered ones', () => {
    expect(isDomainEventType('profile.bio_updated')).toBe(true);
    expect(isDomainEventType('profile.something_unregistered')).toBe(false);
  });

  it('has no duplicate entries (append-only discipline)', () => {
    expect(new Set(DOMAIN_EVENT_TYPES).size).toBe(DOMAIN_EVENT_TYPES.length);
  });
});

describe('SYS-01/F32: global-table manifest (rule-2 allowlist)', () => {
  it('treats listed tables as global and unlisted tables as user-owned (fail-closed)', () => {
    expect(isGlobalTable('games')).toBe(true);
    expect(isGlobalTable('genres')).toBe(true);
    // user-owned tables are NOT on the manifest → the scope-lint fails closed on them
    expect(isGlobalTable('users')).toBe(false);
    expect(isGlobalTable('collection_entries')).toBe(false);
    expect(isGlobalTable('wallets')).toBe(false);
  });

  it('has no duplicates', () => {
    expect(new Set(GLOBAL_TABLES).size).toBe(GLOBAL_TABLES.length);
  });
});

describe('F37: Minimum-M1 spine manifest', () => {
  it('enumerates exactly the 7-item spine', () => {
    expect(MINIMUM_M1_SPINE).toHaveLength(7);
    expect(MINIMUM_M1_SPINE.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('lists the 6 ship-blockers', () => {
    expect(M1_SHIP_BLOCKERS).toEqual(['F03', 'F06', 'F21', 'F22', 'F29', 'F30']);
  });

  it('keeps the event seam as seam-only (teeth deferred to M7)', () => {
    const events = MINIMUM_M1_SPINE.find((s) => s.n === 4);
    expect(events?.status).toBe('seam-only');
  });
});
