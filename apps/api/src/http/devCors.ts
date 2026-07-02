import type { RequestHandler } from 'express';
import { loadEnv } from '../config/env';

// OQ-120 — a DEV-ONLY CORS allowlist so the Expo-web (Chrome) dev loop (http://localhost:8081/8082)
// can call the API. OFF by default and in the production posture: with DEV_CORS_ORIGINS unset the
// middleware is a pass-through no-op (SYS-03 env-configured, never hardcoded). Defense-in-depth:
// even when set, only exact http://localhost:<port> / http://127.0.0.1:<port> origins are honored —
// a non-local origin in the env var is silently ignored, so this can never quietly become a
// production CORS surface.

const LOCAL_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;

export function devCors(origins: string[] = loadEnv().devCorsOrigins): RequestHandler {
  const allowed = new Set(origins.filter((o) => LOCAL_ORIGIN_RE.test(o)));
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (allowed.size === 0 || typeof origin !== 'string' || !allowed.has(origin)) {
      next();
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Max-Age', '600');
      res.status(204).end();
      return;
    }
    next();
  };
}
