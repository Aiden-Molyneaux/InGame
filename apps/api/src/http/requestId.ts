import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

// Request-ID correlation (product-spec §7 observability). The full pino/Sentry round-trip wiring is
// M2; this stamps an id now so the error middleware can key unhandled-error logs to a request.
export const requestId: RequestHandler = (req, res, next) => {
  const id = req.header('x-request-id') ?? randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
};
