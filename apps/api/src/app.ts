import express, { type Express } from 'express';
import { mountRoutes } from './http/defineRoute';
import { requestId } from './http/requestId';
import { devCors } from './http/devCors';
import { errorMiddleware } from './http/errorMiddleware';
import { meRoutes } from './routes/me-routes';
import { authRoutes } from './routes/auth-routes';
import { usersRoutes } from './routes/users-routes';
import { catalogRoutes } from './routes/catalog-routes';
import { collectionRoutes } from './routes/collection-routes';
import { cardRoutes } from './routes/card-routes';
import { deviceRoutes } from './routes/device-routes';
import { walletRoutes } from './routes/wallet-routes';

// The Express app factory. All paths mount under `/api` (api-contract base). The error middleware is
// registered LAST so every thrown AppError / ZodError is mapped to the fixed envelope.
export function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(requestId);
  app.use(devCors()); // OQ-120 — dev-only; a no-op unless DEV_CORS_ORIGINS is set

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use(
    '/api',
    mountRoutes([
      ...authRoutes,
      ...meRoutes,
      ...usersRoutes,
      ...catalogRoutes,
      ...collectionRoutes,
      ...cardRoutes,
      ...deviceRoutes,
      ...walletRoutes,
    ]),
  );

  app.use(errorMiddleware);
  return app;
}
