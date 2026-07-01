import * as Sentry from '@sentry/node';
import { loadEnv } from '../config/env';
import { logger } from './logger';

// F18 / product-spec §7 — the Sentry sink, ENV-GATED on SENTRY_DSN. Empty DSN ⇒ a no-op (like the
// stubbed email transport): the seam is real, the round-trip lights up the moment the owner
// provisions the DSN (the owner-provisioned-secret carve-out, matching F39). `beforeSend` scrubs
// PII/tokens so the exception sink never receives credentials (SYS-10). Errors are ALWAYS logged
// (pino) keyed by the request-ID — that log line is the round-trip's server half even without a DSN.

let initialized = false;

export function initSentry(): void {
  const { sentryDsn, nodeEnv } = loadEnv();
  if (!sentryDsn || initialized) return;
  Sentry.init({
    dsn: sentryDsn,
    environment: nodeEnv,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      // Never ship a request body to the sink — it may carry a password / token.
      if (event.request) delete event.request.data;
      return event;
    },
  });
  initialized = true;
}

/** Report an error to Sentry (if configured) keyed by the request-ID, and ALWAYS log it (pino). */
export function captureException(err: unknown, context: { requestId?: string } = {}): void {
  if (initialized) {
    Sentry.withScope((scope) => {
      if (context.requestId) scope.setTag('request_id', context.requestId);
      Sentry.captureException(err);
    });
  }
  logger.error({ err, requestId: context.requestId }, 'unhandled error');
}
