import { ApiError, SessionExpiredError } from '../api/client';

// Error → operator-readable string, plus the one piece of global plumbing the console needs: an
// expired session has to bounce the whole app back to the sign-in card, and it can be discovered by
// ANY call from ANY screen. A single module-level subscriber (set once by App) is the smallest thing
// that works; a context/provider would be ceremony for one event.

let expiredHandler: (() => void) | null = null;

export function onSessionExpired(handler: (() => void) | null): void {
  expiredHandler = handler;
}

/**
 * The one place errors become text. The server's own `message` is used VERBATIM — the 422s this
 * console has to explain (an unknown/free/duplicate Spotlight id, a blank takedown reason) are
 * phrased by the service that refused, and paraphrasing them here would drift from the truth.
 *
 * `requiredTier` is the console's own addition: a 403 on an admin route is almost always "your tier
 * doesn't reach this section" (the gate returns a bare FORBIDDEN with no detail, on purpose — it must
 * not tell a prober how close they were), so the console supplies the context the server won't.
 */
const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

export function describeError(err: unknown, requiredTier?: number): string {
  if (err instanceof SessionExpiredError) {
    expiredHandler?.();
    return err.message;
  }
  if (err instanceof ApiError) {
    if (err.status === 403 && requiredTier) {
      return `${err.message} — this section needs Admin ${ROMAN[requiredTier] ?? requiredTier} or higher.`;
    }
    return err.reason ? `${err.message} [${err.reason}]` : err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
