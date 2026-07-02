import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { TextField } from '../src/components/TextField';
import { ScreenButton } from '../src/components/ScreenButton';
import { theme } from '../src/theme';
import {
  useLoginMutation,
  useRegisterMutation,
  useLazyUsernameAvailableQuery,
} from '../src/store/api';
import { useAppDispatch } from '../src/store/hooks';
import { setSession } from '../src/store/authSlice';
import { saveTokens } from '../src/auth/tokenStore';

type Mode = 'signin' | 'create';

// B1 (api-contract 0.46) — split an API error into the top-line message + the sanitized per-field
// details (W4 grammar: field errors render under their inputs; the top line covers the rest).
type ApiErrorPayload = {
  error?: { message?: string; details?: { path: string; message: string }[] };
};
function errParts(e: unknown): { message: string; fields: Record<string, string> } {
  const err = (e as { data?: ApiErrorPayload })?.data?.error;
  const fields: Record<string, string> = {};
  for (const d of err?.details ?? []) {
    if (d.path && !fields[d.path]) fields[d.path] = d.message;
  }
  return { message: err?.message ?? 'Something went wrong. Please try again.', fields };
}

const USERNAME_CHECK_MIN = 3;
const USERNAME_CHECK_DEBOUNCE_MS = 450;

export default function SignIn() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  // W3 (AUTH-11) — the debounced ADVISORY availability beat; never gates submit.
  const [checkUsername, availability] = useLazyUsernameAvailableQuery();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // AUTH-10 (OQ-119) — real acceptance gate; registration cannot submit until this is checked.
  const [accepted, setAccepted] = useState(false);

  const busy = loginState.isLoading || registerState.isLoading;
  const candidate = username.trim();

  useEffect(() => {
    if (mode !== 'create' || candidate.length < USERNAME_CHECK_MIN) return;
    const t = setTimeout(() => void checkUsername(candidate), USERNAME_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [mode, candidate, checkUsername]);

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
      router.replace('/(tabs)/collection');
    } catch (e) {
      const { message, fields } = errParts(e);
      setFieldErrors(fields);
      // W4 — field errors live under their inputs; the top line only carries what has no field.
      setError(Object.keys(fields).length > 0 ? null : message);
    }
  }

  // W3 advisory line state — stale-guarded (only trust a result for the CURRENT candidate).
  const availabilityFresh =
    availability.originalArgs === candidate && !availability.isFetching && availability.data;
  const showAvailability =
    mode === 'create' && candidate.length >= USERNAME_CHECK_MIN && !fieldErrors.username;
  const availabilityText = !availabilityFresh
    ? 'CHECKING…'
    : availability.data?.available
      ? 'USERNAME AVAILABLE'
      : availability.data?.reason === 'taken'
        ? 'USERNAME TAKEN'
        : 'USERNAME NOT ALLOWED';
  const availabilityColor = !availabilityFresh
    ? theme.scr.dim
    : availability.data?.available
      ? theme.brand.success
      : theme.brand.alert;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.wordmark}>INGAME</Text>
        <Text style={styles.tagline}>YOUR COLLECTION, ON DISPLAY</Text>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            error={fieldErrors.email}
          />
          {mode === 'create' ? (
            <View style={styles.usernameBlock}>
              <TextField
                label="Username"
                value={username}
                onChangeText={setUsername}
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
            onChangeText={setPassword}
            placeholder="min 8 characters"
            secureTextEntry
            error={fieldErrors.password}
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
            disabled={busy || (mode === 'create' && !accepted)}
            block
          />
          <ScreenButton
            label={mode === 'signin' ? 'New here? Create account' : 'Have an account? Sign in'}
            variant="secondary"
            onPress={() => {
              setError(null);
              setFieldErrors({});
              setAccepted(false);
              setMode(mode === 'signin' ? 'create' : 'signin');
            }}
            block
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.space.xxl,
    gap: theme.space.sm,
  },
  wordmark: {
    fontFamily: theme.font.shell, // Paytone (the brand voice)
    fontSize: 34, // W2r — cream/34 (mockup --scr-head), not the F-05 shell-only pink
    color: theme.brand.cream,
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.micro,
    color: theme.scr.dim,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: theme.space.xl,
  },
  form: { gap: theme.space.lg },
  usernameBlock: { gap: theme.space.xs },
  availability: {
    fontFamily: theme.font.screenSemi,
    fontSize: theme.type.micro, // 9 — F-06
    letterSpacing: 1,
  },
  error: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.body,
    color: theme.brand.alert,
    textAlign: 'center',
  },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: theme.scr.faint,
    backgroundColor: theme.scr.panel,
    alignItems: 'center',
    justifyContent: 'center', // F-07 — square on-screen chrome (no radius)
  },
  checkboxOn: { backgroundColor: theme.scr.accent, borderColor: theme.scr.accent },
  checkMark: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.body, // 11
    color: theme.scr.accentInk,
    lineHeight: 14,
  },
  consentLabel: {
    flex: 1,
    fontFamily: theme.font.screen,
    fontSize: theme.type.body, // 11 — F-06
    color: theme.scr.dim,
    lineHeight: 16,
  },
  link: { color: theme.scr.accent, fontFamily: theme.font.screenSemi },
});
