import pino from 'pino';
import { loadEnv } from '../config/env';

// F18 / product-spec §7 — structured JSON logging (pino) with request-ID correlation. `redact` scrubs
// tokens/secrets/PII out of every log line (the server half of the observability round-trip). Silent
// under NODE_ENV=test so the suite output stays clean.
export const logger = pino({
  level: loadEnv().nodeEnv === 'test' ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'accessToken',
      'refreshToken',
      'token',
      'identityToken',
      'passwordHash',
      'tokenHash',
      '*.password',
      '*.accessToken',
      '*.refreshToken',
      '*.identityToken',
    ],
    censor: '[redacted]',
  },
});
