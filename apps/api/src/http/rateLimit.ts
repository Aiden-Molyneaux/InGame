import type { Request, RequestHandler } from 'express';
import { RateLimitedError } from '../errors/AppError';
import { getRule } from '../config/rate-limits';

// SYS-05 rate-limiter (F17) — a fixed-window, in-memory limiter wired on the abuse-prone auth routes.
// Over-limit → RateLimitedError → the RATE_LIMITED / 429 envelope. Keyed by (bucket, client IP). This
// is single-instance (correct for the M2 local/scratch loop); a shared-store (Redis) limiter is later
// infra. The numbers are SYS-04-tunable + G-K-signed (config/rate-limits).

interface Counter {
  count: number;
  resetAt: number;
}

const store = new Map<string, Counter>();

function clientKey(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

export function rateLimit(bucket: string): RequestHandler {
  return (req, _res, next) => {
    const rule = getRule(bucket);
    const key = `${bucket}:${clientKey(req)}`;
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + rule.windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > rule.limit) {
      next(new RateLimitedError());
      return;
    }
    next();
  };
}

/** Test-only: clear the counters between tests so limiter state doesn't leak across cases. */
export function resetRateLimitStore(): void {
  store.clear();
}
