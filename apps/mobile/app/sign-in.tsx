import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { TextField } from '../src/components/TextField';
import { ScreenButton } from '../src/components/ScreenButton';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { theme, themedStyles, useTheme } from '../src/theme';
import {
  useLoginMutation,
  useRegisterMutation,
  useLazyUsernameAvailableQuery,
} from '../src/store/api';
import { useAppleSignInMutation } from '../src/store/authApi';
import { useAppDispatch } from '../src/store/hooks';
import { setSession } from '../src/store/authSlice';
import { saveTokens } from '../src/auth/tokenStore';

type Mode = 'signin' | 'create';

// B1 (api-contract 0.46) — split an API error into the top-line message + the sanitized per-field
// details (W4 grammar: field errors render under their inputs; the top line covers the rest).
// `code` rides along too (walk-4 P5-i) so a caller can key off the error CODE (e.g. AUTH_FAILED)
// instead of string-matching the server's message.
type ApiErrorPayload = {
  error?: { code?: string; reason?: string; message?: string; details?: { path: string; message: string }[] };
};
function errParts(e: unknown): {
  code?: string;
  reason?: string;
  message: string;
  fields: Record<string, string>;
} {
  const err = (e as { data?: ApiErrorPayload })?.data?.error;
  const fields: Record<string, string> = {};
  for (const d of err?.details ?? []) {
    if (d.path && !fields[d.path]) fields[d.path] = d.message;
  }
  return {
    code: err?.code,
    reason: err?.reason,
    message: err?.message ?? 'Something went wrong. Please try again.',
    fields,
  };
}

const USERNAME_CHECK_MIN = 3;
const USERNAME_CHECK_DEBOUNCE_MS = 450;

export default function SignIn() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const [appleSignIn, appleState] = useAppleSignInMutation();
  // W3 (AUTH-11) — the debounced ADVISORY availability beat; never gates submit.
  const [checkUsername, availability] = useLazyUsernameAvailableQuery();
  const styles = useStyles();
  const t = useTheme();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // AUTH-10 (OQ-119) — real acceptance gate; registration cannot submit until this is checked.
  const [accepted, setAccepted] = useState(false);
  // S2-i (AUTH-03) — the Apple control renders only where the native module reports availability
  // (real iOS with the entitlement; false on web/Android/Expo Go — AUTH-03: Android registers via email).
  const [appleAvailable, setAppleAvailable] = useState(false);

  const busy = loginState.isLoading || registerState.isLoading || appleState.isLoading;
  const candidate = username.trim();

  useEffect(() => {
    if (mode !== 'create' || candidate.length < USERNAME_CHECK_MIN) return;
    const t = setTimeout(() => void checkUsername(candidate), USERNAME_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [mode, candidate, checkUsername]);

  // F-16 — hooks unconditional, above every early return. The Platform gate lives INSIDE the effect
  // (never around the hook); a resolve-after-unmount is dropped via the `alive` flag.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => {
        if (alive) setAppleAvailable(ok);
      })
      .catch(() => {
        // availability probe failed (e.g. simulator quirk) — treat as unavailable, never crash sign-in
        if (alive) setAppleAvailable(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // S2-f — a field's error (and the top-line auth error) clears the moment the user edits it; for the
  // username field that also un-gates the advisory availability line (which hides while it errors).
  function editField(setter: (v: string) => void, field: string) {
    return (v: string) => {
      setter(v);
      setError(null);
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    };
  }

  function toggleMode() {
    setError(null);
    setFieldErrors({});
    setAccepted(false);
    setMode((m) => (m === 'signin' ? 'create' : 'signin'));
  }

  // S2-i (AUTH-03/09, auth-epic P-E) — the real SIWA flow. NONCE SHAPE: the RAW nonce (a random UUID)
  // goes to OUR server; its SHA-256 hex goes on the NATIVE request, so Apple's identity token carries
  // the hash and the server verifier can assert sha256hex(raw) === token.nonce (apple-verifier.ts) —
  // a replayed token can't be bound to a fresh exchange. Session establishment mirrors submit() below
  // byte-for-byte (saveTokens → setSession); the only fork is the AUTH-09 usernamePending route.
  // `busy` (RTK isLoading) only flips once the POST dispatches — it does NOT cover the digest + native
  // signInAsync phase, so a rapid double-tap could race two Apple flows (the loser rejects with a
  // non-CANCELED code and would flash a spurious error strip). A ref is synchronous, so the second tap
  // bails before the first sheet even mounts.
  const appleFlightRef = useRef(false);
  async function signInWithApple() {
    if (appleFlightRef.current) return;
    appleFlightRef.current = true;
    setError(null);
    setFieldErrors({});
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        // Apple resolved without a token (documented edge) — name the cause, don't POST garbage.
        setError('Apple didn’t return an identity token. Please try again.');
        return;
      }
      const session = await appleSignIn({
        identityToken: credential.identityToken,
        nonce: rawNonce,
      }).unwrap();
      await saveTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
      dispatch(setSession(session));
      // AUTH-09 — a first Apple sign-in has no handle yet; complete it before entering the app.
      router.replace(session.user.usernamePending ? '/choose-username' : '/(tabs)/collection');
    } catch (e) {
      const err = e as { code?: string; status?: number | string };
      // The user closed Apple's sheet — an intentional exit, not an error (silent no-op).
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      if (err?.status === 401) {
        // The server refused the identity token (neutral AUTH_FAILED) — name the failure mode.
        setError('Apple sign-in couldn’t be verified. Please try again.');
      } else if (err?.status === 'FETCH_ERROR') {
        setError('Couldn’t reach the server — check your connection and try again.');
      } else {
        setError(errParts(e).message);
      }
    } finally {
      // Always release — a canceled sheet or a failed POST must re-arm the button.
      appleFlightRef.current = false;
    }
  }

  async function submit() {
    setError(null);
    setFieldErrors({});
    try {
      const session =
        mode === 'signin'
          ? await login({ email, password }).unwrap()
          : // AUTH-10 (OQ-119): reachable only with `accepted` true — the Create button is disabled otherwise.
            await register({ email, username, password, acceptedTerms: true }).unwrap();
      await saveTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
      dispatch(setSession(session));
      // AUTH-09 — same fork as the SIWA path: a usernamePending account (e.g. a SIWA user who
      // password-reset their relay email, then email-signed-in) completes its handle before the tabs.
      router.replace(session.user.usernamePending ? '/choose-username' : '/(tabs)/collection');
    } catch (e) {
      const { code, reason, message, fields } = errParts(e);
      // P5-h (the forgot-password S3 precedent) — CREATE (registration) shares the passwordSchema
      // strength floor with the reset confirm (auth-service.ts), so the same generic zod too_small
      // message lands here ("Must be at least 8 characters.") without naming which field it's about;
      // front it with "Password" so the inline error reads standalone. The breach-specific reason
      // (`password_breached`) already reads standalone on its own — left verbatim, never re-prefixed.
      if (mode === 'create' && reason !== 'password_breached' && fields.password) {
        fields.password = `Password ${fields.password.charAt(0).toLowerCase()}${fields.password.slice(1)}`;
      }
      setFieldErrors(fields);
      // W4 — field errors live under their inputs; the top line only carries what has no field.
      if (Object.keys(fields).length > 0) {
        setError(null);
      } else if (mode === 'signin' && code === 'AUTH_FAILED') {
        // walk-4 P5-i (walk finding #27) — the server's neutral AUTH_FAILED copy ("Authentication
        // failed.") read as cold and unhelpful. This still stays AUTH-11 enumeration-neutral: a
        // wrong password and an unknown/unverified account all share the ONE AUTH_FAILED code (see
        // NEUTRAL_AUTH_FAILED_MESSAGE in packages/shared), so this copy never says which case it is.
        setError('That email and password don’t match. Check both, or reset your password.');
      } else {
        setError(message);
      }
    }
  }

  // S2-a — the primary is disabled while busy, while a required field is empty, or while any field is
  // erroring (create additionally needs the AUTH-10 acceptance). Not only the checkbox, as before.
  const requiredFilled =
    mode === 'signin'
      ? email.trim().length > 0 && password.length > 0
      : email.trim().length > 0 && candidate.length > 0 && password.length > 0 && accepted;
  const canSubmit = !busy && requiredFilled && Object.keys(fieldErrors).length === 0;

  // W3 advisory line state — stale-guarded (only trust a result for the CURRENT candidate).
  const availabilityFresh =
    availability.originalArgs === candidate && !availability.isFetching && availability.data;
  const showAvailability =
    mode === 'create' && candidate.length >= USERNAME_CHECK_MIN && !fieldErrors.username;
  const availabilityText = !availabilityFresh
    ? 'CHECKING…'
    : availability.data?.available
      ? 'USERNAME AVAILABLE'
      : // S2-c — a name that's simply taken reads "NOT AVAILABLE"; only a MOD-07 screened/reserved
        // name reads "NOT ALLOWED" (a rule, not a coincidence of who registered first).
        availability.data?.reason === 'taken'
        ? 'USERNAME NOT AVAILABLE'
        : 'USERNAME NOT ALLOWED';
  const availabilityColor = !availabilityFresh
    ? t.scr.dim
    : availability.data?.available
      ? theme.brand.success
      : theme.brand.alert;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.wordmark}>INGAME</Text>
        <Text style={styles.tagline}>YOUR COLLECTION, ON DISPLAY</Text>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={editField(setEmail, 'email')}
            placeholder="you@example.com"
            keyboardType="email-address"
            error={fieldErrors.email}
          />
          {mode === 'create' ? (
            <View style={styles.usernameBlock}>
              <TextField
                label="Username"
                value={username}
                onChangeText={editField(setUsername, 'username')}
                placeholder="A–Z, a–z, 0–9, _"
                error={fieldErrors.username}
              />
              {showAvailability ? (
                <Text style={[styles.availability, { color: availabilityColor }]}>
                  {availabilityText}
                </Text>
              ) : null}
            </View>
          ) : null}
          <TextField
            label="Password"
            value={password}
            onChangeText={editField(setPassword, 'password')}
            placeholder="min 8 characters"
            secureTextEntry
            error={fieldErrors.password}
            // S2-h — FORGOT? rides the password label row on sign-in only (create has the hint instead).
            labelRight={
              mode === 'signin' ? (
                <TertiaryLink
                  label="Forgot?"
                  chevron="none"
                  onPress={() => router.push('/forgot-password')}
                />
              ) : undefined
            }
          />

          {mode === 'create' ? (
            <View style={styles.consentRow}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: accepted }}
                onPress={() => setAccepted((a) => !a)}
                hitSlop={8}
                style={[styles.checkbox, accepted && styles.checkboxOn]}
              >
                {accepted ? <Text style={styles.checkMark}>✓</Text> : null}
              </Pressable>
              <Text style={styles.consentLabel}>
                I&apos;m 13 or older and agree to the{' '}
                <Text style={styles.link} onPress={() => router.push('/legal/terms')}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={styles.link} onPress={() => router.push('/legal/privacy')}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <ScreenButton
            label={busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={submit}
            disabled={!canSubmit}
            block
          />

          {/* S2-i — SIWA (AUTH-03, P-E live): sign-in mode only, and only where the native module
              reports availability (real iOS — the board's platform fork: W1 has it, W1b Android does
              not; web/Android/Expo Go never render it). */}
          {mode === 'signin' && appleAvailable ? (
            <>
              <View style={styles.orDiv}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR CONTINUE WITH</Text>
                <View style={styles.orLine} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in with Apple"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={signInWithApple}
                style={({ pressed }) => [styles.appleBtn, pressed && styles.applePressed]}
              >
                {/* Apple HIG-mandated control — black/white are token-exempt (board OQ-035). */}
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path
                    d="M17.05 12.7c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.88 2.65 3.22 2.6 1.29-.05 1.78-.83 3.34-.83 1.55 0 2 .83 3.37.81 1.39-.03 2.27-1.27 3.12-2.53.98-1.45 1.39-2.85 1.41-2.93-.03-.01-2.7-1.04-2.72-4.13zM14.6 5.1c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z"
                    fill="#fff"
                  />
                </Svg>
                <Text style={styles.appleText}>Sign in with Apple</Text>
              </Pressable>
            </>
          ) : null}

          {/* S2-g — the mode swap is a quiet footer text link, not a full button. */}
          <View style={styles.swapFoot}>
            <Text style={styles.swapText}>
              {mode === 'signin' ? 'New to InGame?' : 'Already have one?'}
            </Text>
            <TertiaryLink
              label={mode === 'signin' ? 'Create account' : 'Sign in'}
              chevron="none"
              onPress={toggleMode}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: t.space.xxl,
    gap: t.space.sm,
  },
  wordmark: {
    fontFamily: t.font.shell, // Paytone (the brand voice)
    fontSize: 34, // W2r — cream/34 (mockup --scr-head), not the F-05 shell-only pink
    color: t.brand.cream,
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: t.font.screen,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: t.space.xl,
  },
  form: { gap: t.space.lg },
  usernameBlock: { gap: t.space.xs },
  availability: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9 — F-06
    letterSpacing: 1,
  },
  error: {
    fontFamily: t.font.screen,
    fontSize: t.type.body,
    color: t.brand.alert,
    textAlign: 'center',
  },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space.md },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: t.scr.faint,
    backgroundColor: t.scr.panel,
    alignItems: 'center',
    justifyContent: 'center', // F-07 — square on-screen chrome (no radius)
  },
  checkboxOn: { backgroundColor: t.scr.accent, borderColor: t.scr.accent },
  checkMark: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.body, // 11
    color: t.scr.accentInk,
    lineHeight: 14,
  },
  consentLabel: {
    flex: 1,
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11 — F-06
    color: t.scr.dim,
    lineHeight: 16,
  },
  link: { color: t.scr.accent, fontFamily: t.font.screenSemi },
  // S2-i — the OR divider + compact Apple stub (board `.ordiv` / `.apple.compact`).
  orDiv: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, marginVertical: t.space.xs },
  orLine: { flex: 1, height: 1, backgroundColor: t.scr.hairline },
  orText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    color: t.scr.faint,
    letterSpacing: 2,
  },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space.md,
    alignSelf: 'center', // hugs its content + centred (board `.apple.compact`), not a full slab
    backgroundColor: '#000', // HIG-mandated (token-exempt, board OQ-035)
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.xl,
  },
  applePressed: { opacity: 0.85 },
  appleText: {
    fontFamily: t.font.screenBold, // R2 (4a) — match the SIGN IN button label's weight so the two read the same size (both 11px)
    fontSize: t.type.body, // 11 — same as the ScreenButton label
    color: '#fff', // HIG-mandated (token-exempt)
    letterSpacing: 0.3,
  },
  // S2-g — the quiet swap footer (board `.swap-foot`: soft text + accent text link).
  swapFoot: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: t.space.xs,
    marginTop: t.space.sm,
  },
  swapText: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11
    color: t.scr.dim,
    letterSpacing: 0.3,
  },
}));
