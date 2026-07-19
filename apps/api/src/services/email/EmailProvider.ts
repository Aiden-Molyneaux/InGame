// AUTH-12 — the transactional-email provider seam (auth-epic P-A · the IAP_PROVIDER pattern,
// services/iap/ mirrored file-for-file). The API never talks to a mail vendor directly — call sites
// depend on the semantic email-service one layer up, which depends only on this TRANSPORT interface,
// so the StubEmailProvider (dev/test) and the real ResendProvider are interchangeable and a vendor
// swap touches nothing else. The provider is chosen by config/env (`EMAIL_PROVIDER`, default 'stub'
// outside production; production fail-closes on unset/'stub' — see resolveEmailProvider).

/** One outbound transactional email — transport only, no template knowledge. */
export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body — always present (plain-text-first; HTML is the progressive enhancement). */
  text: string;
  html?: string;
}

export interface EmailProvider {
  /** Deliver one message. Throws on transport failure — CALL SITES decide the posture (the
   * reset-request path catches + stays neutral so a provider outage never becomes an
   * account-enumeration oracle, AUTH-11). */
  send(msg: EmailMessage): Promise<void>;
}
