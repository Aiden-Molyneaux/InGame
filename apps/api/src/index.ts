import { createApp } from './app';
import { loadEnv } from './config/env';
import { initSentry } from './observability/sentry';
import { logger } from './observability/logger';

// Server entry. (For dev, `npm -w @ingame/api run dev` runs this under tsx with watch.)
initSentry(); // F18 — env-gated on SENTRY_DSN (no-op without one)
const env = loadEnv();
const app = createApp();
app.listen(env.port, () => {
  logger.info({ port: env.port }, `InGame API listening on http://localhost:${env.port}/api`);
});
