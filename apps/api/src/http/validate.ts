import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

// Body validation middleware (CONVENTIONS rule 3). The schema MUST come from `@ingame/shared` (the
// executable api-contract) — never hand-rolled here. A failure forwards the ZodError to the error
// middleware, which serializes it as VALIDATION_ERROR 422. The server-side parse is the security
// boundary; the parsed value is stashed on `req.validated` for the controller.
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.validated = result.data;
    next();
  };
}
