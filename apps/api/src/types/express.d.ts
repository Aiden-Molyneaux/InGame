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
    }
  }
}

export {};
