import express, { type Express } from 'express';
import { mountRoutes } from './http/defineRoute';
import { requestId } from './http/requestId';
import { devCors } from './http/devCors';
import { errorMiddleware } from './http/errorMiddleware';
import { meRoutes } from './routes/me-routes';
import { authRoutes } from './routes/auth-routes';
import { usersRoutes } from './routes/users-routes';
import { friendsRoutes } from './routes/friends-routes';
import { inviteRoutes } from './routes/invite-routes';
import { catalogRoutes } from './routes/catalog-routes';
import { collectionRoutes } from './routes/collection-routes';
import { cardRoutes } from './routes/card-routes';
import { discoverRoutes } from './routes/discover-routes';
import { deviceRoutes } from './routes/device-routes';
import { walletRoutes } from './routes/wallet-routes';
import { iapRoutes } from './routes/iap-routes';
import { cosmeticRoutes } from './routes/cosmetic-routes';
import { mediaRoot, MEDIA_URL_PREFIX, PUBLIC_MEDIA_PREFIXES } from './storage';
import { join } from 'node:path';

// The Express app factory. All paths mount under `/api` (api-contract base). The error middleware is
// registered LAST so every thrown AppError / ZodError is mapped to the fixed envelope.
export function createApp(): Express {
  const app = express();
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
    app.use(`${MEDIA_URL_PREFIX}/${prefix}`, express.static(join(mediaRoot(), prefix)));
  }

  app.use(
    '/api',
    mountRoutes([
      ...authRoutes,
      ...meRoutes,
      ...usersRoutes,
      ...friendsRoutes,
      ...inviteRoutes,
      ...catalogRoutes,
      ...collectionRoutes,
      ...cardRoutes,
      ...discoverRoutes,
      ...deviceRoutes,
      ...walletRoutes,
      ...iapRoutes,
      ...cosmeticRoutes,
    ]),
  );

  app.use(errorMiddleware);
  return app;
}
