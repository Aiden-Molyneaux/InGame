import { useCallback, useEffect, useState } from 'react';
import type { SelfProfile } from '@ingame/shared';
import { fetchMe, logout } from './api/client';
import { clearSession, getSession, setSession, tierLabel } from './api/session';
import { describeError, onSessionExpired } from './lib/errors';
import { Banner } from './components/Banner';
import { Shell, type OpsView } from './components/Shell';
import { SignInScreen } from './screens/SignInScreen';
import { StatsScreen } from './screens/StatsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SpotlightScreen } from './screens/SpotlightScreen';

// ── The gate ──────────────────────────────────────────────────────────────────────────────────────
//
// TWO WALLS, and only one of them is real. The server's `requireAdminTier(n)` is the wall: it reads
// the role/tier from the user row on EVERY request, so a revoked admin loses the console on their
// next call. THIS check — `role === 'admin'` off GET /me — is a courtesy: it exists so a non-admin
// sees a clear sentence instead of a wall of 403s. Nothing here is trusted by the server, and nothing
// here should ever be mistaken for authorization.
//
// The tier is deliberately NOT gated on in the client either: a tier-I admin can open the Spotlight
// screen and will get an honest 403 explaining which tier it needs. Hiding sections by tier would put
// a second, drift-prone copy of the SYS-08 permission map in the client.

type Phase =
  | { kind: 'boot' }
  | { kind: 'signed-out'; notice?: string }
  | { kind: 'denied'; me: SelfProfile }
  | { kind: 'ready'; me: SelfProfile };

export default function App() {
  const [phase, setPhase] = useState<Phase>(() => (getSession() ? { kind: 'boot' } : { kind: 'signed-out' }));
  const [view, setView] = useState<OpsView>('stats');

  const verify = useCallback(async (): Promise<void> => {
    try {
      const me = await fetchMe();
      setPhase(me.role === 'admin' ? { kind: 'ready', me } : { kind: 'denied', me });
    } catch (err) {
      clearSession();
      setPhase({ kind: 'signed-out', notice: describeError(err) });
    }
  }, []);

  // A session that expired mid-call (the one refresh retry failed) bounces the whole console back to
  // the sign-in card rather than leaving a screen full of stale numbers and an error banner.
  useEffect(() => {
    onSessionExpired(() => {
      clearSession();
      setPhase({ kind: 'signed-out', notice: 'Your session expired. Sign in again.' });
    });
    return () => onSessionExpired(null);
  }, []);

  useEffect(() => {
    if (phase.kind === 'boot') void verify();
  }, [phase.kind, verify]);

  const signOut = useCallback(async (): Promise<void> => {
    await logout();
    clearSession();
    setPhase({ kind: 'signed-out' });
  }, []);

  if (phase.kind === 'boot') {
    return (
      <div className="centered">
        <p className="note">Checking your session…</p>
      </div>
    );
  }

  if (phase.kind === 'signed-out') {
    return (
      <SignInScreen
        notice={phase.notice}
        onSignedIn={(session) => {
          setSession({ accessToken: session.accessToken, refreshToken: session.refreshToken });
          // The login response already carries the self-shape, but the gate re-reads GET /me with the
          // bearer: it proves the token works before the console renders, and keeps ONE source of
          // truth for role/tier instead of two code paths that could disagree.
          setPhase({ kind: 'boot' });
        }}
      />
    );
  }

  if (phase.kind === 'denied') {
    return (
      <div className="centered">
        <div className="card">
          <div className="brand">
            <b>INGAME</b>
            <span>Admin console</span>
          </div>
          <Banner kind="error">This account isn’t an admin.</Banner>
          <p style={{ margin: 0 }}>
            You are signed in as <b>{phase.me.username}</b> ({tierLabel(phase.me).toLowerCase()}). Admin
            rights are granted out-of-band by the owner — there is no request button here, by design.
          </p>
          <button type="button" className="btn" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <Shell me={phase.me} view={view} onView={setView} onSignOut={() => void signOut()}>
      {view === 'stats' && <StatsScreen />}
      {view === 'reports' && <ReportsScreen />}
      {view === 'spotlight' && <SpotlightScreen />}
    </Shell>
  );
}
