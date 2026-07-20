import { Redirect } from 'expo-router';
import { useAppSelector } from '../src/store/hooks';
import { useGetMeQuery } from '../src/store/api';

// The entry gate: a rehydrated access token (from expo-secure-store, F14) → the tab shell; otherwise
// the Welcome / sign-in screen. AUTH-09 (auth-epic P-E): a session whose self-shape still has
// `usernamePending: true` (a half-completed SIWA account) routes to /choose-username instead. The wall
// also stands in the (tabs) layout (owner ruling 2026-07-19 — every entry path), so a pending account
// is walled wherever the self-shape is KNOWN. Known limit, owner-blessed: a cold start whose /me fails
// NON-401 (offline, 500) falls open to the tabs with cached state — fail-open beats stranding an
// offline user on choose-username (which needs the network); the wall re-arms on the next resolved /me.
export default function Index() {
  const token = useAppSelector((s) => s.auth.accessToken);
  const storedUser = useAppSelector((s) => s.auth.user);
  // Cold start rehydrates TOKENS only (AuthBootstrap) — the slice's `user` is null until a sign-in
  // dispatches setSession. The gate then reads GET /me for the live self-shape; skipped whenever the
  // slice already holds it (fresh sign-in) or there is no session at all. Hook is unconditional (F-16).
  const me = useGetMeQuery(undefined, { skip: !token || storedUser != null });

  if (!token) return <Redirect href="/sign-in" />;

  const user = storedUser ?? me.data ?? null;
  if (user == null) {
    // No self-shape yet. On a definitive NON-401 /me failure, FAIL OPEN to the tabs with cached state
    // (owner-blessed 2026-07-19: offline-first — a 401 is already torn down by the reauth layer, which
    // lands on /sign-in itself); while resolving, render nothing (the device shell frames the beat).
    if (me.isError) return <Redirect href="/(tabs)/collection" />;
    return null;
  }
  return (
    <Redirect href={user.usernamePending === true ? '/choose-username' : '/(tabs)/collection'} />
  );
}
