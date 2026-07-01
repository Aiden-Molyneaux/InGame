import express, { type Express } from 'express';
import { mountRoutes } from './http/defineRoute';
import { requestId } from './http/requestId';
import { errorMiddleware } from './http/errorMiddleware';
import { meRoutes } from './routes/me-routes';
import { authRoutes } from './routes/auth-routes';
import { usersRoutes } from './routes/users-routes';

// The Express app factory. All paths mount under `/api` (api-contract base). The error middleware is
// registered LAST so every thrown AppError / ZodError is mapped to the fixed envelope.
export function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(requestId);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', mountRoutes([...authRoutes, ...meRoutes, ...usersRoutes]));

  app.use(errorMiddleware);
  return app;
}
