import * as adminRepo from '../repositories/admin-repo';

// The CRUDE presence stamp behind the admin console's `dau24h` tile (M6 P7, decision 0081 — the
// owner's "yes, give me a rough daily-active number" ruling).
//
// THE WHOLE DESIGN IS "never pay per request":
//   1. an in-process Map remembers when each user was last stamped — a hit is a Map lookup, zero IO;
//   2. only a MISS (never stamped in this process, or stamped > STAMP_INTERVAL_MS ago) issues an
//      UPDATE, and that UPDATE re-checks staleness in SQL, so a race writes once;
//   3. a failure is SWALLOWED — a presence stamp must never fail a user's request.
// So the steady-state cost is one indexed UPDATE per user per 15 minutes, and the worst case after a
// restart is one UPDATE per active user.
//
// This is deliberately NOT analytics. It answers "roughly how many accounts showed up today" for a
// 12-tester beta. True DAU/MAU/retention/funnel rides PostHog on the ACH-08 event spine
// (road-to-market §7) and must not be back-derived from this column.

/** How stale a stamp must be before it is rewritten. */
export const STAMP_INTERVAL_MS = 15 * 60_000;
/** A bound on the throttle map so a long-lived process cannot grow it without limit. */
const MAX_TRACKED = 10_000;

const lastStampedAt = new Map<string, number>();
/** In-flight stamps, so a test can deterministically await what the middleware fired-and-forgot. */
const inFlight = new Set<Promise<void>>();

/**
 * Record that this actor was seen. Cheap on the throttled path (a Map lookup, no IO) and never throws.
 */
export async function touchLastSeen(actorId: string, now = Date.now()): Promise<void> {
  const previous = lastStampedAt.get(actorId);
  if (previous !== undefined && now - previous < STAMP_INTERVAL_MS) return;
  // Optimistically claim the slot BEFORE the await: two concurrent requests for the same actor then
  // issue at most one UPDATE (and the SQL staleness predicate is the backstop if they interleave).
  lastStampedAt.set(actorId, now);
  if (lastStampedAt.size > MAX_TRACKED) {
    // Cheap eviction: drop the oldest-inserted half (Map preserves insertion order). Losing an entry
    // costs at most one redundant UPDATE, never correctness.
    let dropped = 0;
    for (const key of lastStampedAt.keys()) {
      lastStampedAt.delete(key);
      if (++dropped >= MAX_TRACKED / 2) break;
    }
  }
  try {
    await adminRepo.stampLastSeen(actorId, new Date(now - STAMP_INTERVAL_MS));
  } catch {
    // Presence is best-effort. A DB hiccup here must never surface to the user.
    lastStampedAt.delete(actorId); // let the next request retry
  }
}

/**
 * Fire a stamp without awaiting it (the after-response caller), while keeping the promise reachable
 * so `flushLastSeenWrites()` can await it. Never rejects.
 */
export function touchLastSeenDetached(actorId: string): void {
  const p = touchLastSeen(actorId).finally(() => inFlight.delete(p));
  inFlight.add(p);
}

/** Await every stamp fired so far — the deterministic seam the integration tests use. */
export async function flushLastSeenWrites(): Promise<void> {
  while (inFlight.size > 0) {
    await Promise.all([...inFlight]);
  }
}

/** Test-only: clear the throttle so a suite's stamps don't leak across cases. */
export function resetLastSeenThrottle(): void {
  lastStampedAt.clear();
}
