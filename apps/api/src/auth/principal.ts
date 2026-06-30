import type { RequestHandler } from 'express';
import { AuthFailedError } from '../errors/AppError';

// STUB/SEED principal resolution — NOT real Sign-in-with-Apple (that is M2). The authenticated user
// id arrives as `Authorization: Bearer <userId>` where `<userId>` is a SEEDED user id. Token
// issuance, refresh-token rotation, password hashing, and POST /auth/apple are deliberately NOT
// built here (the F29 scope guard: exactly one entity, no second feature). SYS-01 still holds: the
// server resolves the actor from this principal ONLY — it never trusts an id in the request body.
export const resolvePrincipal: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !match[1]?.trim()) {
    next(new AuthFailedError());
    return;
  }
  req.principal = { userId: match[1].trim() };
  next();
};
