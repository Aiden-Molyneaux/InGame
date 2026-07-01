import { logger } from '../observability/logger';

// AUTH-04 / AUTH-08 — the transactional-email sender. STUBBED for M2: no real transport is wired. The
// real provider account + SYS-03 secret are OWNER-provisioned (F39 fast-follow), matching the M1-P
// provisioning pattern — the build agent does NOT provision them. The dev/test stub captures each
// "sent" message in an in-memory outbox so the reset/verify flows are exercisable locally (the
// plaintext token is a DEV/TEST convenience against local/scratch data only; production swaps this).

export type EmailKind = 'password_reset' | 'email_verify';

export interface SentEmail {
  to: string;
  token: string;
  kind: EmailKind;
}

export interface Emailer {
  sendPasswordReset(to: string, token: string): Promise<void>;
  sendVerification(to: string, token: string): Promise<void>;
}

const outbox: SentEmail[] = [];

export const stubEmailer: Emailer = {
  async sendPasswordReset(to, token) {
    outbox.push({ to, token, kind: 'password_reset' });
    logger.info({ to, kind: 'password_reset' }, 'stub email queued'); // token is redacted by pino
  },
  async sendVerification(to, token) {
    outbox.push({ to, token, kind: 'email_verify' });
    logger.info({ to, kind: 'email_verify' }, 'stub email queued');
  },
};

/** Test/dev: the most recent stub email of a kind (to retrieve the plaintext token for the flow). */
export function lastEmail(kind: EmailKind, to?: string): SentEmail | undefined {
  for (let i = outbox.length - 1; i >= 0; i--) {
    const msg = outbox[i];
    if (msg && msg.kind === kind && (!to || msg.to === to)) return msg;
  }
  return undefined;
}

export function clearOutbox(): void {
  outbox.length = 0;
}
