import { loadEnv } from '../../config/env';
import type { EmailProvider } from './EmailProvider';
import { StubEmailProvider } from './StubEmailProvider';
import { ResendProvider } from './ResendProvider';

// The email-provider singleton (auth-epic P-A · AUTH-12 — the exact `getIapProvider` shape). One
// provider per process, chosen by `EMAIL_PROVIDER` (default 'stub' OUTSIDE production). Call sites
// (the semantic email-service) depend only on `EmailProvider`. Overridable in tests via
// `setEmailProvider`. PRODUCTION FLOOR (F03 fail-closed): a stub-emailing production process would
// silently swallow every password reset — `loadEnv` throws first (unset OR 'stub'); the check here
// is defense-in-depth for any differently-constructed env / future refactor.

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    const env = loadEnv();
    if (env.emailProvider === 'stub') {
      if (env.nodeEnv === 'production') {
        // Unreachable via loadEnv (which already throws) — kept fail-closed at the build site too.
        throw new Error(
          "EMAIL_PROVIDER='stub' is refused in production — the stub only logs, so every password " +
            'reset would silently vanish. Set EMAIL_PROVIDER to a real provider.',
        );
      }
      provider = new StubEmailProvider();
    } else if (env.emailProvider === 'resend') {
      provider = new ResendProvider({ apiKey: env.resendApiKey, from: env.emailFrom });
    } else {
      throw new Error(
        `EMAIL_PROVIDER='${env.emailProvider}' is not a known provider — 'stub' (dev/test) or 'resend'.`,
      );
    }
  }
  return provider;
}

/** Test/seam hook — inject an alternate provider (e.g. one that throws, for the neutrality tests). */
export function setEmailProvider(next: EmailProvider): void {
  provider = next;
}

/** Test hook — drop the singleton so the next `getEmailProvider()` rebuilds from env. */
export function resetEmailProvider(): void {
  provider = null;
}

export type { EmailProvider, EmailMessage } from './EmailProvider';
export {
  StubEmailProvider,
  lastEmail,
  clearOutbox,
  recordStubEmail,
  type EmailKind,
  type SentEmail,
} from './StubEmailProvider';
export { ResendProvider } from './ResendProvider';
