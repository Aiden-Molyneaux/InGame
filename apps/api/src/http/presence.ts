import type { RequestHandler } from 'express';
import { touchLastSeenDetached } from '../auth/last-seen';

/**
 * The `users.last_seen_at` presence stamp (M6 P7 admin console v1, decision 0081) — the substrate for
 * the console's crude `dau24h` tile.
 *
 * It runs AFTER the response has been sent (`res.on('finish')`) and detached, so it adds exactly zero
 * latency to any request and cannot turn a database hiccup into a user-visible failure. It fires only
 * when a principal was resolved — an anonymous request, a bad bearer, and a 401 are not presence.
 *
 * Mounted app-wide (one line in app.ts) rather than inside `resolvePrincipal`, which keeps the auth
 * middleware free of any database dependency.
 */
export const presenceStamp: RequestHandler = (req, res, next) => {
  res.on('finish', () => {
    const userId = req.principal?.userId;
    if (userId) touchLastSeenDetached(userId);
  });
  next();
};
