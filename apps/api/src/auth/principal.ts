import type { RequestHandler } from 'express';
import { AuthFailedError } from '../errors/AppError';
import { verifyAccessToken } from './tokens';

// SYS-01 principal resolution — REAL auth (M2). The access token is a short-lived HS256 JWT presented
// as `Authorization: Bearer <accessToken>`; it is verified (signature + issuer + expiry) and its `sub`
// becomes the actor id. The server resolves the actor from this principal ONLY — it never trusts an id
// in the request body. An invalid / expired / malformed token → a NEUTRAL AuthFailedError (401).
export const resolvePrincipal: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !match[1]?.trim()) {
    next(new AuthFailedError());
    return;
  }
  verifyAccessToken(match[1].trim())
    .then((claims) => {
      req.principal = { userId: claims.userId };
      next();
    })
    .catch(next);
};

// SOC-10 (M6 P3) — OPTIONAL principal resolution for token-scoped/bearer reads that do NOT require a
// session (GET /invites/:token — a fresh install with no account may open an invite link). A VALID
// bearer sets `req.principal` (so a resolve can apply the viewer↔sender relationship + block collapse);
// a MISSING header proceeds anonymously (no principal). An INVALID / expired / malformed bearer ALSO
// proceeds anonymously (it never 401s here — presenting a stale session must not break an anonymous
// resolve) rather than failing the request; the endpoint's own token guard is the real gate.
export const optionalPrincipal: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !match[1]?.trim()) {
    next(); // anonymous resolve — no principal
    return;
  }
  verifyAccessToken(match[1].trim())
    .then((claims) => {
      req.principal = { userId: claims.userId };
      next();
    })
    .catch(() => next()); // a bad/expired session must not break an anonymous resolve
};
