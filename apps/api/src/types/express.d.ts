// Express Request augmentation. `principal` is the STUBBED/SEEDED authenticated actor (NOT real
// Sign-in-with-Apple — that is M2). `validated` holds the zod-parsed body. `id` is the request-ID
// for log correlation (Sentry/pino wiring is M2).
import 'express';

declare global {
  namespace Express {
    interface Request {
      principal?: { userId: string };
      validated?: unknown;
      id?: string;
      /**
       * The raw request body Buffer, captured by the `express.json({ verify })` hook in app.ts. Needed
       * by the M5 P2 IAP webhook (signature verification runs over the raw bytes, before JSON parsing —
       * the RC/HMAC seam; the mock verifies the static Authorization header, P2b HMACs this buffer).
       */
      rawBody?: Buffer;
    }
  }
}

export {};
