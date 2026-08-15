import { createApp } from './app';
import { loadEnv } from './config/env';
import { initSentry } from './observability/sentry';
import { logger } from './observability/logger';

// Server entry. (For dev, `npm -w @ingame/api run dev` runs this under tsx with watch.)
initSentry(); // F18 — env-gated on SENTRY_DSN (no-op without one)
const env = loadEnv();
const app = createApp();
const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, `InGame API listening on http://localhost:${env.port}/api`);
});
// P3 (perf-round2 S2) — Node's keepAliveTimeout DEFAULTS TO 5s: measured live, an idle kept-alive
// socket gets FIN'd at ~6s, which is the observed intermittent connection-reset class on clients
// that reuse sockets (RN fetch does). It is also a guaranteed 502 trap once a load balancer fronts
// this server (the G-C hosting move): every common LB idle timeout (60s) exceeds 5s, so the LB
// routes onto a socket the node just closed. The server's idle window must OUTLIVE the LB's —
// 65s > 60s — and headersTimeout sits just above so a request begun on a kept-alive socket can't
// be guillotined mid-headers (headersTimeout must exceed keepAliveTimeout; nodejs/node#27363).
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
