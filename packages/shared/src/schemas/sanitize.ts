import { z } from 'zod';

// SYS-02 free-text sanitization (decision 0043) + the Unicode-NFC clause (decision 0051/F19):
// NFC-normalize, then strip control / bidi-control / zero-width / BOM code points, then trim — on
// free-text feeding the skia render + the MOD-07 screen, so screening sees the same string the
// renderer draws. The SERVER-SIDE parse is the security boundary (CONVENTIONS rule 3) — client-side
// validation is never enforcement.

// C0/C1 controls (minus the ones already handled by trim), bidi controls, zero-width + word-joiner,
// and the BOM. Tabs/newlines are stripped from these single-line fields.
const STRIP_RE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

export function sanitizeText(input: string): string {
  return input.normalize('NFC').replace(STRIP_RE, '').trim();
}

/**
 * A trimmed, sanitized, length-bounded free-text field. Every user-supplied string is
 * length-bounded + trimmed in the schema (CONVENTIONS rule 3). The bound is applied AFTER
 * normalization so a normalized string can never exceed `max`.
 */
export function boundedText(max: number) {
  return z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(max));
}
