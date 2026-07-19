import type { EmailMessage, EmailProvider } from './EmailProvider';

// AUTH-12 — the real transport: Resend (owner-nod #1), via the plain HTTPS API. Deliberately NO SDK
// dependency (the jose/zero-dep posture): one fetch POST per send. The API key + from-address are
// owner-provisioned (SYS-03; RESEND_API_KEY in the host secret store, never the repo) and the sending
// domain (mail.ingame.app — SPF/DKIM) is the paired owner sitting item.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export class ResendProvider implements EmailProvider {
  constructor(private readonly opts: { apiKey: string; from: string }) {
    if (!opts.apiKey) {
      // Misconfiguration fails loudly at build time, never as a silent per-send swallow.
      throw new Error("EMAIL_PROVIDER='resend' requires RESEND_API_KEY to be set (SYS-03).");
    }
  }

  async send(msg: EmailMessage): Promise<void> {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.opts.from,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
      }),
    });
    if (!res.ok) {
      // Non-2xx → throw; the CALL SITE decides the posture (neutral-200 on the reset path, AUTH-11).
      // Status only — the vendor body is not folded into the error (it can echo the recipient).
      throw new Error(`Resend send failed: HTTP ${res.status} ${res.statusText}`);
    }
  }
}
