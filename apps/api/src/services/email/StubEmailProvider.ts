import { logger } from '../../observability/logger';
import type { EmailMessage, EmailProvider } from './EmailProvider';

// AUTH-12 — the dev/test transport (absorbs the M2 `auth/email.ts` stub). Two pieces live here:
//   1. StubEmailProvider — the TRANSPORT stub: "delivery" is a pino log line carrying the full text
//      body (the dev loop: no real mail arrives, so the reset code is read from the API log).
//   2. The SEMANTIC outbox + `lastEmail`/`clearOutbox` test hooks (kind-aware, preserved verbatim
//      from M2 — auth-slice.test.ts depends on them to fetch the plaintext code/token mid-flow).
//      The email-service records here ONLY when the active provider is the stub (plus the AUTH-08
//      allowlist path), so a production process never retains plaintext credentials in memory.

export type EmailKind = 'password_reset' | 'email_verify';

export interface SentEmail {
  to: string;
  /** The plaintext credential the email carried (reset code / verify token) — DEV/TEST convenience. */
  token: string;
  kind: EmailKind;
}

const outbox: SentEmail[] = [];

export class StubEmailProvider implements EmailProvider {
  async send(msg: EmailMessage): Promise<void> {
    // The dev loop's "delivery": the body (incl. the reset code) lands in the local API log. Local
    // dev/test only — production refuses the stub at boot (resolveEmailProvider, F03 fail-closed).
    logger.info({ to: msg.to, subject: msg.subject, body: msg.text }, 'stub email "sent" (log-only)');
  }
}

/** Record a semantic outbox entry (stub/dev/test lane only — see the header note). */
export function recordStubEmail(kind: EmailKind, to: string, token: string): void {
  outbox.push({ to, token, kind });
}

/** Test/dev: the most recent stub email of a kind (to retrieve the plaintext code/token for the flow). */
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
