import { Redirect } from 'expo-router';
import { useAppSelector } from '../src/store/hooks';
import { useGetMeQuery } from '../src/store/api';

// The entry gate: a rehydrated access token (from expo-secure-store, F14) → the tab shell; otherwise
// the Welcome / sign-in screen. AUTH-09 (auth-epic P-E): a session whose self-shape still has
// `usernamePending: true` (a half-completed SIWA account) routes to /choose-username instead — the
// catch-all wall, so such an account can never wander the app (a cold start mid-flow, a killed app
// between /auth/apple and the claim, ANY sign-in path that minted a pending session).
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
    // Defensive: no self-shape yet. On a definitive /me failure fall through to the tabs (pre-P-E
    // behavior — a 401 is already torn down by the reauth layer, which lands on /sign-in itself);
    // while resolving, render nothing (the device shell frames the beat).
    if (me.isError) return <Redirect href="/(tabs)/collection" />;
    return null;
  }
  return (
    <Redirect href={user.usernamePending === true ? '/choose-username' : '/(tabs)/collection'} />
  );
}
