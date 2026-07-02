// MOD-07 — text/glyph screening (a banned-word pass on user-entered text rendered to other users:
// usernames, gamertag handles, bios, …). M2 ships the MECHANISM + a minimal reserved-name list; the
// full operator-managed banned-word list is P4 Config/Authoring (SYS-08 / the external tool, OQ-080)
// and is server-configurable without a release (SYS-04). Input is NFC-normalized upstream (SYS-02);
// here we case-fold + strip separators so trivial evasions (a-d-m-i-n) still match.

// Reserved impersonation / system names (a normal user may not claim these). Profanity/slur screening
// rides the operator-managed list (P4) — deliberately not hardcoded here.
const RESERVED = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'staff',
  'moderator',
  'ingame',
  'system',
  'help',
]);

function normalize(input: string): string {
  return input.toLowerCase().replace(/[\s._-]+/g, '');
}

/** True if the text passes screening (is allowed). */
export function screenText(input: string): boolean {
  const normalized = normalize(input);
  if (RESERVED.has(normalized)) return false;
  return true;
}

export function isUsernameAllowed(username: string): boolean {
  return screenText(username);
}
