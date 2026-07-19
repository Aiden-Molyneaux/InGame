import { loadEnv } from '../../config/env';
import { logger } from '../../observability/logger';
import { getEmailProvider } from './index';
import { StubEmailProvider, recordStubEmail } from './StubEmailProvider';
import type { EmailMessage } from './EmailProvider';

// AUTH-12 — the SEMANTIC email layer the auth service calls (templates + kind routing), one layer
// above the transport seam. Rules:
//   • Templates live HERE — providers stay transport-only.
//   • The semantic outbox (test hook) is recorded only on the stub/dev lane (StubEmailProvider.ts).
//   • AUTH-08 verification is an EXPLICIT ALLOWLIST EXCEPTION: its real template + client redemption
//     surface are a later packet (nothing in-app can redeem the token yet), so the email_verify kind
//     stays stub/log-only EVEN under a real provider — an explicit branch, not a silent drop.

const APP_NAME = 'InGame';

function minutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

/** AUTH-04 — beta template #1: the 6-digit password-reset code (plain-text-first + minimal HTML). */
export function passwordResetCodeTemplate(to: string, code: string): EmailMessage {
  const ttlMin = minutes(loadEnv().passwordResetTtlSeconds);
  const subject = `${code} is your ${APP_NAME} reset code`;
  const text = [
    `${APP_NAME} — PASSWORD RESET`,
    '',
    'Enter this code in the app to choose a new password:',
    '',
    `    ${code}`,
    '',
    `The code works for ${ttlMin} minutes, once.`,
    '',
    `Didn't ask to reset your password? Ignore this email — your account is unchanged.`,
  ].join('\n');
  const html = [
    `<div style="font-family:monospace;max-width:480px;margin:0 auto;padding:24px;">`,
    `<p style="letter-spacing:2px;margin:0 0 16px;"><strong>${APP_NAME} — PASSWORD RESET</strong></p>`,
    `<p style="margin:0 0 16px;">Enter this code in the app to choose a new password:</p>`,
    `<p style="font-size:32px;letter-spacing:8px;text-align:center;margin:0 0 16px;"><strong>${code}</strong></p>`,
    `<p style="margin:0 0 16px;">The code works for ${ttlMin} minutes, once.</p>`,
    `<p style="margin:0;color:#666;">Didn't ask to reset your password? Ignore this email — your account is unchanged.</p>`,
    `</div>`,
  ].join('');
  return { to, subject, text, html };
}

/** AUTH-04 — send the 6-digit reset code through the provider seam. Throws on transport failure —
 * the caller (requestPasswordReset) catches and stays neutral (AUTH-11). */
export async function sendPasswordResetCode(to: string, code: string): Promise<void> {
  const provider = getEmailProvider();
  if (provider instanceof StubEmailProvider) recordStubEmail('password_reset', to, code);
  await provider.send(passwordResetCodeTemplate(to, code));
}

/**
 * AUTH-08 — email verification. ALLOWLIST EXCEPTION (see header): stays stub/log-only under EVERY
 * provider until the real template + in-app redemption surface land (a later packet) — the token is
 * recorded on the semantic outbox (the standing dev/test flow) and logged, never sent for real.
 */
export async function sendVerification(to: string, token: string): Promise<void> {
  recordStubEmail('email_verify', to, token);
  logger.info({ to, kind: 'email_verify' }, 'verification email held on the stub lane (AUTH-12 allowlist)'); // token redacted by pino
}
