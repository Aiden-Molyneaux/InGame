import { useEffect, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { USERNAME_MIN, USERNAME_MAX, USERNAME_RE } from '@ingame/shared';
import { ScreenHead, SCREEN_HEADER_PAD } from '../src/components/ScreenHead';
import { TextField } from '../src/components/TextField';
import { ScreenButton } from '../src/components/ScreenButton';
import { theme, themedStyles, useTheme } from '../src/theme';
import { useLazyUsernameAvailableQuery } from '../src/store/api';
import { usePatchMeMutation } from '../src/store/profileApi';
import { useAppDispatch } from '../src/store/hooks';
import { setUser } from '../src/store/authSlice';

// AUTH-09 (auth-epic P-E) — CHOOSE YOUR HANDLE, the SIWA completion beat. A first Apple sign-in lands
// here with `user.usernamePending: true` (a placeholder handle server-side); the username is chosen
// BEFORE entry — no skip affordance, and the index.tsx gate walls the tabs until it clears. No mockup
// board exists (welcome-auth's states predate this flow) — the screen derives from sign-in's field
// grammar: same TextField + advisory-availability line + primary ScreenButton (the P-C precedent).
//
//   field  → debounced GET /auth/username-available (ADVISORY — never gates submit; AUTH-11)
//   CLAIM  → PATCH /me { username } (authoritative: MOD-07 screening + uniqueness + the AUTH-09
//            usernamePending completion, profile-service). A concurrent-claim race the advisory check
//            missed surfaces as the SAME `username_taken` VALIDATION_ERROR (the server maps the DB
//            unique violation) — handled inline, distinctly from a generic failure.
//
// Rules: 0069 non-commerce (orange primary), F-06 scale, 0070 themedStyles, F-16 hooks unconditional.

// Mirrors sign-in.tsx's advisory beat (same constants — the two screens must feel identical).
const USERNAME_CHECK_MIN = 3;
const USERNAME_CHECK_DEBOUNCE_MS = 450;

// The api-contract error envelope as it surfaces through RTK Query's rejected value (sign-in's errParts
// shape + forgot-password's status/reason split).
type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    reason?: string;
    details?: { path: string; message: string }[];
  };
};
function parseErr(e: unknown): {
  status?: number | string;
  code?: string;
  reason?: string;
  message: string;
  fieldMsg?: string;
} {
  const rejected = e as { status?: number | string; data?: ApiErrorPayload };
  const err = rejected?.data?.error;
  return {
    status: rejected?.status,
    code: err?.code,
    reason: err?.reason,
    message: err?.message ?? 'Something went wrong. Please try again.',
    fieldMsg: err?.details?.find((d) => d.path === 'username')?.message ?? err?.details?.[0]?.message,
  };
}

export default function ChooseUsername() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTheme();
  const styles = useStyles();
  const [patchMe, patchState] = usePatchMeMutation();
  // W3 (AUTH-11) — the debounced ADVISORY availability beat; never gates submit (sign-in's idiom).
  const [checkUsername, availability] = useLazyUsernameAvailableQuery();

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null); // the top-line strip
  const [fieldError, setFieldError] = useState<string | null>(null); // under the input

  const busy = patchState.isLoading;
  const candidate = username.trim();

  useEffect(() => {
    if (candidate.length < USERNAME_CHECK_MIN) return;
    const id = setTimeout(() => void checkUsername(candidate), USERNAME_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [candidate, checkUsername]);

  // AUTH-09 — the authoritative claim. Success clears usernamePending server-side; the returned
  // self-shape (parsed at the seam by profileApi) refreshes the auth slice so the index.tsx gate
  // reads the completion immediately, then we enter the app.
  async function claim() {
    setError(null);
    setFieldError(null);
    try {
      const self = await patchMe({ username: candidate }).unwrap();
      dispatch(setUser(self));
      router.replace('/(tabs)/collection');
    } catch (e) {
      const { status, code: errCode, reason, message, fieldMsg } = parseErr(e);
      if (status === 429) {
        setError('Too many attempts — wait a moment and try again.');
      } else if (reason === 'username_taken') {
        // Includes the concurrent-claim race: the DB unique violation the advisory check couldn't see
        // maps to this same reason server-side (profile-service updateProfile).
        setFieldError(fieldMsg ?? 'That username is taken.');
      } else if (reason === 'username_screened' || errCode === 'VALIDATION_ERROR' || fieldMsg) {
        // errCode (the envelope's `code`), not reason — a reason-less 422 still belongs under the field
        // (forgot-password.tsx's idiom).
        setFieldError(fieldMsg ?? message);
      } else {
        setError(message);
      }
    }
  }

  // The username rules, transcribed from the shared schema (SYS-02/OQ-124: 3–20, [A-Za-z0-9_]).
  // Client-side gating is a convenience only — the PATCH /me parse is the security boundary.
  const wellFormed =
    candidate.length >= USERNAME_MIN &&
    candidate.length <= USERNAME_MAX &&
    USERNAME_RE.test(candidate);
  const canClaim = !busy && wellFormed && !fieldError;

  // The advisory line — stale-guarded (only trust a result for the CURRENT candidate); sign-in's grammar.
  const availabilityFresh =
    availability.originalArgs === candidate && !availability.isFetching && availability.data;
  const showAvailability = candidate.length >= USERNAME_CHECK_MIN && !fieldError;
  const availabilityText = !availabilityFresh
    ? 'CHECKING…'
    : availability.data?.available
      ? 'USERNAME AVAILABLE'
      : availability.data?.reason === 'taken'
        ? 'USERNAME NOT AVAILABLE'
        : 'USERNAME NOT ALLOWED';
  const availabilityColor = !availabilityFresh
    ? t.scr.dim
    : availability.data?.available
      ? theme.brand.success
      : theme.brand.alert;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.pad}>
        <ScreenHead title="Choose your handle" />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <Text style={styles.intro}>
            One last thing — pick the name other players will know you by. 3–20 characters: letters,
            numbers, and underscores.
          </Text>
          <View style={styles.usernameBlock}>
            <TextField
              label="Username"
              value={username}
              onChangeText={(v) => {
                setUsername(v);
                setError(null);
                setFieldError(null);
              }}
              placeholder="A–Z, a–z, 0–9, _"
              error={fieldError}
            />
            {showAvailability ? (
              <Text style={[styles.availability, { color: availabilityColor }]}>
                {availabilityText}
              </Text>
            ) : null}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <ScreenButton
            label={busy ? '…' : 'Claim handle'}
            onPress={claim}
            disabled={!canClaim}
            block
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  flex: { flex: 1 },
  pad: { ...SCREEN_HEADER_PAD },
  body: { paddingHorizontal: t.space.xl, paddingBottom: t.space.xxl },
  form: { gap: t.space.lg },
  usernameBlock: { gap: t.space.xs },
  intro: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11 — F-06
    color: t.scr.dim,
    lineHeight: 18,
  },
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
}));
