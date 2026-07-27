import { useState, type FormEvent } from 'react';
import type { AuthSession } from '@ingame/shared';
import { login } from '../api/client';
import { describeError } from '../lib/errors';
import { Banner } from '../components/Banner';

// The sign-in card. Email/password only — SIWA is a phone affordance and there is no console-side
// Apple flow to build. The credential goes straight to POST /api/auth/login (AUTH-02) and is never
// stored; only the returned token pair is kept (see api/session.ts for that tradeoff).
//
// The refusal is whatever the server said. AUTH-11's anti-enumeration means a wrong password and an
// unknown account return the SAME neutral AUTH_FAILED — the console must not "helpfully" guess which.

interface SignInScreenProps {
  notice?: string;
  onSignedIn: (session: AuthSession) => void;
}

export function SignInScreen({ notice, onSignedIn }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await login(email.trim(), password));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered">
      <form className="card" onSubmit={(e) => void submit(e)}>
        <div className="brand">
          <b>INGAME</b>
          <span>Admin console</span>
        </div>
        <p className="note" style={{ margin: 0 }}>
          Staff only. Admin rights are granted out-of-band — signing in with a normal account will not
          get you in.
        </p>

        {notice && <Banner kind="warn">{notice}</Banner>}
        {error && <Banner kind="error">{error}</Banner>}

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn primary" disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
