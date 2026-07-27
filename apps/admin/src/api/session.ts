import type { SelfProfile } from '@ingame/shared';

// ── The console's session store ───────────────────────────────────────────────────────────────────
//
// STORAGE TRADEOFF, stated once (the phone app's F14 rule does NOT transfer):
// the mobile client keeps its token pair in expo-secure-store because a phone has a keystore. A
// browser has no equivalent — the honest choices are (a) memory only, (b) sessionStorage, or (c) an
// httpOnly cookie. (c) is the strongest but needs a cookie/session endpoint the API does not have and
// would not be worth minting for an internal tool. (a) alone logs the admin out on every F5, which is
// hostile in a dashboard you refresh constantly. So: MODULE MEMORY is the hot path (no storage read
// per request) with sessionStorage as the reload survivor.
//
// What that costs, honestly: a token in sessionStorage is readable by any script on this origin, so
// an XSS on the console is a full admin-session compromise. Accepted here because the console is a
// single-origin, no-third-party-script, owner-only internal tool, and sessionStorage is TAB-scoped —
// it dies with the tab, never leaks to another tab, and never outlives the browser session the way
// localStorage would. Revisit if the console ever gains untrusted embeds or more than a few operators.

const STORAGE_KEY = 'ingame.admin.session';

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
}

let memory: AdminSession | null = null;

function isSession(value: unknown): value is AdminSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.accessToken === 'string' && typeof v.refreshToken === 'string';
}

/** The current token pair, rehydrated from sessionStorage on the first call after a reload. */
export function getSession(): AdminSession | null {
  if (memory) return memory;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) return null;
    memory = parsed;
    return memory;
  } catch {
    // Private-mode / disabled storage / corrupt JSON — degrade to memory-only, never throw at boot.
    return null;
  }
}

export function setSession(session: AdminSession): void {
  memory = session;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* memory-only is a working session, just not a reload-surviving one */
  }
}

export function clearSession(): void {
  memory = null;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

/** SYS-08 tier names (decision 0081 §4) — the label beside the signed-in identity. */
export function tierLabel(profile: Pick<SelfProfile, 'role' | 'adminTier'>): string {
  if (profile.role !== 'admin') return 'USER';
  switch (profile.adminTier) {
    case 1:
      return 'ADMIN I · CONTENT';
    case 2:
      return 'ADMIN II · CATALOG';
    case 3:
      return 'ADMIN III · SUPPORT';
    case 4:
      return 'ADMIN IV · PLATFORM';
    default:
      return 'ADMIN · NO TIER';
  }
}
