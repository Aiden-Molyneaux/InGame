import type { PatchMeRequest, SelfProfile } from '@ingame/shared';

// A thin, typed API client for the F29 slice — the executable api-contract crossing FE↔BE at the TYPE
// level (request body + response shape come from @ingame/shared). The richer RTK Query layer bound to
// z.infer (F31) is M2-foundation. The base URL is the intentional-public EXPO_PUBLIC_API_BASE_URL
// (allow-listed in the F04 bundle-grep).
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export async function getMe(accessToken: string): Promise<SelfProfile> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`getMe failed: ${res.status}`);
  return (await res.json()) as SelfProfile;
}

export async function patchMe(accessToken: string, body: PatchMeRequest): Promise<SelfProfile> {
  const res = await fetch(`${API_BASE}/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patchMe failed: ${res.status}`);
  return (await res.json()) as SelfProfile;
}
