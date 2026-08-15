import express, { type Express } from 'express';
import compression from 'compression';
import { mountRoutes } from './http/defineRoute';
import { requestId } from './http/requestId';
import { devCors } from './http/devCors';
import { errorMiddleware } from './http/errorMiddleware';
import { meRoutes } from './routes/me-routes';
import { authRoutes } from './routes/auth-routes';
import { usersRoutes } from './routes/users-routes';
import { friendsRoutes } from './routes/friends-routes';
import { recommendationRoutes } from './routes/recommendation-routes';
import { inviteRoutes } from './routes/invite-routes';
import { catalogRoutes } from './routes/catalog-routes';
import { collectionRoutes } from './routes/collection-routes';
import { cardRoutes } from './routes/card-routes';
import { discoverRoutes } from './routes/discover-routes';
import { deviceRoutes } from './routes/device-routes';
import { walletRoutes } from './routes/wallet-routes';
import { iapRoutes } from './routes/iap-routes';
import { cosmeticRoutes } from './routes/cosmetic-routes';
import { queueRoutes } from './routes/queue-routes';
import { listRoutes } from './routes/list-routes';
import { achievementRoutes } from './routes/achievement-routes';
import { reportRoutes } from './routes/report-routes';
import { adminRoutes } from './routes/admin-routes';
import { presenceStamp } from './http/presence';
import { wireAchievementsEngine } from './achievements/engine';
import { mediaRoot, MEDIA_URL_PREFIX, PUBLIC_MEDIA_PREFIXES } from './storage';
import { join } from 'node:path';

/**
 * P6/R7 (perf-investigation §R7 · fix-wave #5, server half) — the far-future cache posture for the
 * public flattened renders. `express.static`'s default is `Cache-Control: public, max-age=0`, i.e. every
 * remount of every thumb pays a conditional GET before the (unchanged) bytes are reused — pure waste for
 * content that is immutable by design, and it multiplies with gallery/feed scale.
 *
 * WHY THIS IS SAFE HERE: a card's render lives at a per-card key (`cards/<cardId>/full.png|thumb.png`),
 * and a committed design is never edited in place — CARD-24a copy-on-write mints a NEW card id (and so a
 * new key) for any edit of a private/published card, and CARD-20 unpublish leaves the bytes alone for the
 * adopters. So a given URL's bytes do not change through any product path.
 *
 * THE HONEST CAVEAT (reflatten staleness): MAINTENANCE paths *do* rewrite in place —
 * `apps/api/scripts/reflatten.ts` and `src/db/regenerate-thumbs.ts` re-render every stored card at the
 * SAME keys. regenerate-thumbs already busts the URL for exactly this reason (`THUMB_URL_BUSTER = '?v=2'`,
 * and it states the law: "NEVER change a served image's content under an unchanged URL without busting");
 * `reflatten.ts` does NOT bust today, which was harmless under max-age=0 and is NOT under a year. Any
 * in-place rewrite must now bump the stored url (a `?v=N` marker — the static mount is path-keyed, so the
 * query never reaches the file lookup while every client treats it as a new URL).
 *
 * `immutable` is deliberately OMITTED: ETag/Last-Modified stay on, so a client that DOES revalidate (a
 * browser hard-reload on the :8082 dev lane, a CDN purge probe) can still pick up rewritten bytes. That
 * escape hatch is worth more than the last revalidation round-trip until the R2/CDN move (decision 0073
 * §0.5) enforces the bust discipline at the edge.
 */
export const MEDIA_STATIC_OPTIONS = {
  maxAge: '1y',
  immutable: false,
  etag: true,
  lastModified: true,
} as const;

// The Express app factory. All paths mount under `/api` (api-contract base). The error middleware is
// registered LAST so every thrown AppError / ZodError is mapped to the fixed envelope.
export function createApp(): Express {
  const app = express();
  // M6 P6 — register the ACH-02 post-commit evaluator so a mutation's committed events unlock
  // achievements in-process (idempotent; a no-op until definitions are seeded). See achievements/engine.
  wireAchievementsEngine();
  // P2 (perf-round2 S1) — response compression, library defaults (1KB threshold, gzip/deflate by
  // Accept-Encoding). Measured 5.9× on the app's largest JSON payloads (N=2000 collection
  // 3.5MB→599KB @ ~30ms CPU); RN fetch decompresses transparently on both platforms. The /media
  // static mounts below pass through it HARMLESSLY: the default filter keys off `compressible`
  // (Content-Type), and image/png|jpeg are NOT compressible (verified against the installed
  // module) — only text/JSON bodies are encoded, the flattened renders ship raw as before.
  app.use(compression());
  // The raw request bytes are captured on parse so the M5 P2 IAP webhook can verify the RevenueCat
  // signature over them BEFORE trusting the parsed JSON (the RC/HMAC seam; the mock verifies the static
  // Authorization header). Harmless for every other route — a small buffer reference, no behavior change.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  app.use(requestId);
  app.use(devCors()); // OQ-120 — dev-only; a no-op unless DEV_CORS_ORIGINS is set
  // M6 P7 (decision 0081) — the `users.last_seen_at` presence stamp behind the admin console's crude
  // DAU. Runs AFTER the response is sent and detached, so it is off the request path entirely.
  app.use(presenceStamp);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Flattened published renders are served statically (no auth — the flattened image is the public
  // artifact by design; the private `composition` never leaves the owner shape). Local-disk impl now,
  // R2 + CDN before the M6 beta (decision 0073 §0.5). Under `/media`, outside the `/api` mount.
  // The mount is scoped to the PUBLIC prefixes only (P9 review ruling): the CARD-21 `share/`
  // composites are NOT statically served — they exist only behind GET /cards/:id/share-image, which
  // resolves authz before proxying the cached bytes (a private card's share image must never become
  // publicly fetchable just because its owner generated it once).
  for (const prefix of PUBLIC_MEDIA_PREFIXES) {
    app.use(`${MEDIA_URL_PREFIX}/${prefix}`, express.static(join(mediaRoot(), prefix), MEDIA_STATIC_OPTIONS));
  }

  app.use(
    '/api',
    mountRoutes([
      ...authRoutes,
      ...meRoutes,
      ...usersRoutes,
      ...friendsRoutes,
      ...recommendationRoutes,
      ...inviteRoutes,
      ...catalogRoutes,
      ...collectionRoutes,
      ...cardRoutes,
      ...discoverRoutes,
      ...deviceRoutes,
      ...walletRoutes,
      ...iapRoutes,
      ...cosmeticRoutes,
      ...queueRoutes,
      ...listRoutes,
      ...achievementRoutes,
      ...reportRoutes,
      ...adminRoutes,
    ]),
  );

  app.use(errorMiddleware);
  return app;
}
