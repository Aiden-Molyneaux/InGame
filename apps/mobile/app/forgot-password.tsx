import { useEffect, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { ScreenHead, SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../src/components/ScreenHead';
import { TextField } from '../src/components/TextField';
import { ScreenButton } from '../src/components/ScreenButton';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { themedStyles, useTheme } from '../src/theme';
import {
  useRequestPasswordResetMutation,
  useVerifyResetCodeMutation,
  useConfirmPasswordResetMutation,
} from '../src/store/authApi';

// AUTH-04 (auth-epic P-C) — the FORGOT-PASSWORD flow, ONE route with a 3-step internal state machine
// (the sign-in board's S2 visual language; no dedicated mockup board — the welcome-auth states depict
// the SUPERSEDED emailed-LINK flow, so this DERIVES the code-entry beat from sign-in's field grammar).
// The 6-digit emailed code exchanges IN-APP for a short-lived reset proof that sets the new password:
//
//   S1 email    → requestPasswordReset → ALWAYS advance (enumeration-neutral; never reveals existence)
//   S2 code     → verifyResetCode → holds the proof in COMPONENT STATE ONLY → advance
//   S3 password → confirmPasswordReset { token, password } → success beat → back to sign-in
//
// The reset proof lives in `resetToken` state and is NEVER persisted (no redux, no storage). Rules:
// 0069 non-commerce (no gold — the orange `primary` key), F-06 scale, 0070 themedStyles from birth,
// F-16 hooks unconditional above every early return.

type Step = 'email' | 'code' | 'password' | 'done';

const CODE_LEN = 6;
const RESEND_COOLDOWN_S = 30;

// The api-contract error envelope `{ error: { code, message, reason?, details? } }` as it surfaces
// through RTK Query's rejected value (`{ status, data }`). Mirrors sign-in.tsx's errParts.
type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    reason?: string;
    details?: { path: string; message: string }[];
  };
};
function parseErr(e: unknown): {
  status?: number;
  code?: string;
  reason?: string;
  message: string;
  fieldMsg?: string;
} {
  const rejected = e as { status?: number | string; data?: ApiErrorPayload };
  const err = rejected?.data?.error;
  return {
    status: typeof rejected?.status === 'number' ? rejected.status : undefined,
    code: err?.code,
    reason: err?.reason,
    message: err?.message ?? 'Something went wrong. Please try again.',
    fieldMsg: err?.details?.[0]?.message,
  };
}

export default function ForgotPassword() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();
  const [requestReset, requestState] = useRequestPasswordResetMutation();
  const [verifyCode, verifyState] = useVerifyResetCodeMutation();
  const [confirmReset, confirmState] = useConfirmPasswordResetMutation();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  // The reset PROOF — component state ONLY, never redux / storage (AUTH-04 P-C).
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // the top-line strip
  const [fieldError, setFieldError] = useState<string | null>(null); // under the active input
  const [resendLeft, setResendLeft] = useState(0); // seconds until RESEND re-enables

  // A one-second countdown driving the RESEND cooldown. Unconditional (F-16); no-ops at 0.
  useEffect(() => {
    if (resendLeft <= 0) return;
    const id = setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendLeft]);

  const emailTrimmed = email.trim();
  const busy = requestState.isLoading || verifyState.isLoading || confirmState.isLoading;

  function clearMessages() {
    setError(null);
    setFieldError(null);
  }

  // S1 — SEND CODE. ALWAYS advances on a 2xx (a known and an unknown email get the byte-identical
  // neutral 200 → the same advance), so the screen never discloses whether the account exists.
  async function sendCode() {
    clearMessages();
    try {
      await requestReset({ email: emailTrimmed }).unwrap();
      setCode('');
      setResendLeft(RESEND_COOLDOWN_S);
      setStep('code');
    } catch (e) {
      const { status, message, fieldMsg } = parseErr(e);
      // A 429 is NOT account-existence disclosure — stay on S1 with a calm strip (no code was sent).
      if (status === 429) setError('Too many requests — wait a moment and try again.');
      // A malformed email is a zod 422 with a `path: 'email'` detail — that belongs UNDER the field.
      else if (fieldMsg) setFieldError(fieldMsg);
      else setError(message);
    }
  }

  // S2 — RESEND re-fires the neutral request; disabled during the client cooldown.
  async function resend() {
    if (resendLeft > 0 || busy) return;
    clearMessages();
    try {
      await requestReset({ email: emailTrimmed }).unwrap();
      setResendLeft(RESEND_COOLDOWN_S);
    } catch (e) {
      const { status, message } = parseErr(e);
      setError(status === 429 ? 'Too many requests — wait a moment and try again.' : message);
    }
  }

  // S2 — VERIFY. A match returns the proof (held in state) → S3. Every miss is the neutral
  // invalid_code inline error; a 429 is the calm rate-limit strip.
  async function verify() {
    clearMessages();
    const pending = verifyCode({ email: emailTrimmed, code });
    try {
      const { resetToken: proof } = await pending.unwrap();
      setResetToken(proof);
      // RTK caches a mutation's `data` in the store until its entry is evicted — remove THIS mutation
      // result immediately so the reset PROOF lives ONLY in component state (AUTH-04 P-C: never redux,
      // never storage). `.reset()` on the trigger promise dispatches removeMutationResult by requestId.
      pending.reset();
      setPassword('');
      setStep('password');
    } catch (e) {
      const { status, reason, code: errCode, message } = parseErr(e);
      if (status === 429) {
        setError('Too many attempts — wait a moment and try again.');
      } else if (reason === 'invalid_code' || errCode === 'VALIDATION_ERROR') {
        setFieldError(message); // "That code is invalid or has expired."
      } else {
        setError(message);
      }
    }
  }

  // S3 — SET PASSWORD. Confirms with the HELD proof (not the code). An expired proof (invalid_token)
  // bounces back to S2 with a resend nudge; a breached/too-weak password is an inline field error.
  async function setNewPassword() {
    if (!resetToken) {
      // No proof in state — the only way back in is a fresh code (defensive; UI can't reach here).
      setStep('code');
      setError('That code expired — request a new one.');
      return;
    }
    clearMessages();
    try {
      await confirmReset({ token: resetToken, password }).unwrap();
      setResetToken(null); // proof spent — drop it
      setStep('done');
    } catch (e) {
      const { status, reason, message, fieldMsg } = parseErr(e);
      if (reason === 'invalid_token') {
        setResetToken(null);
        setCode('');
        setStep('code');
        setError('That code expired — request a new one.');
      } else if (status === 429) {
        setError('Too many requests — wait a moment and try again.');
      } else {
        // password_breached (reason) or a zod length miss both carry a `password` field detail.
        setFieldError(fieldMsg ?? message);
      }
    }
  }

  // The context-aware back seam: S1 → sign-in; deeper steps → the previous step (in-flow back nav).
  function goBack() {
    clearMessages();
    if (step === 'code') setStep('email');
    else if (step === 'password') {
      setResetToken(null); // leaving S3 abandons the proof
      // The code shown on S2 was CONSUMED by the successful verify (server single-use) — re-pressing
      // VERIFY with it is a guaranteed invalid_code dead end. Clear it, lift the cooldown so RESEND is
      // immediately available (the server's own rate bucket still governs), and say why.
      setCode('');
      setResendLeft(0);
      setStep('code');
      setError('That code was already used — resend a fresh one to continue.');
    } else router.back(); // S1 — back to sign-in
  }

  const codeDigits = code.replace(/\D/g, '').slice(0, CODE_LEN); // 6-digit clamp (TextField has no maxLength)
  const canSend = !busy && emailTrimmed.length > 0;
  const canVerify = !busy && codeDigits.length === CODE_LEN;
  const canSet = !busy && password.length >= 8;

  const backLabel =
    step === 'code' ? 'Email' : step === 'password' ? 'Code' : 'Sign in';

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.pad}>
        <ScreenHead title="Reset password" />
      </View>
      {step !== 'done' ? (
        <View style={styles.retlink}>
          <TertiaryLink label={backLabel} chevron="leading-back" onPress={goBack} />
        </View>
      ) : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'email' ? (
          <View style={styles.form}>
            <Text style={styles.intro}>
              Enter the email on your account and we&apos;ll send a 6-digit code to reset your password.
            </Text>
            <TextField
              label="Email"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                clearMessages();
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              error={fieldError}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <ScreenButton label={busy ? '…' : 'Send code'} onPress={sendCode} disabled={!canSend} block />
          </View>
        ) : null}

        {step === 'code' ? (
          <View style={styles.form}>
            <Text style={styles.intro}>
              If that address has an account, a 6-digit code is on its way. Enter it below — it expires in
              about 30 minutes.
            </Text>
            <TextField
              label="6-digit code"
              value={codeDigits}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, CODE_LEN));
                clearMessages();
              }}
              placeholder="000000"
              keyboardType="number-pad"
              error={fieldError}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <ScreenButton label={busy ? '…' : 'Verify code'} onPress={verify} disabled={!canVerify} block />
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn&apos;t get it?</Text>
              {resendLeft > 0 ? (
                <Text style={styles.resendWait}>RESEND IN {resendLeft}S</Text>
              ) : (
                <TertiaryLink label="Resend code" chevron="none" onPress={resend} />
              )}
            </View>
          </View>
        ) : null}

        {step === 'password' ? (
          <View style={styles.form}>
            <Text style={styles.intro}>Almost done — choose a new password. At least 8 characters.</Text>
            <TextField
              label="New password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clearMessages();
              }}
              placeholder="min 8 characters"
              secureTextEntry
              error={fieldError}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <ScreenButton
              label={busy ? '…' : 'Set password'}
              onPress={setNewPassword}
              disabled={!canSet}
              block
            />
          </View>
        ) : null}

        {step === 'done' ? (
          <View style={styles.sealBlock}>
            <View style={styles.seal}>
              <Svg viewBox="0 0 24 24" width={32} height={32}>
                <Circle cx={12} cy={12} r={10} fill="none" stroke={t.scr.accent} strokeWidth={1.8} />
                <Path
                  d="M8 12.5l2.6 2.6L16 9.5"
                  fill="none"
                  stroke={t.scr.accent}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={styles.sealEyebrow}>ALL SET</Text>
            <Text style={styles.sealTitle}>PASSWORD UPDATED</Text>
            <Text style={styles.sealSub}>
              Your password is changed and every other session was signed out. Sign in with your new
              password.
            </Text>
            <View style={styles.sealAction}>
              <ScreenButton label="Return to sign in" onPress={() => router.replace('/sign-in')} block />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  flex: { flex: 1 },
  pad: { ...SCREEN_HEADER_PAD },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.xl, paddingBottom: t.space.xxl },
  form: { gap: t.space.lg },
  intro: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11 — F-06
    color: t.scr.dim,
    lineHeight: 18,
  },
  error: {
    fontFamily: t.font.screen,
    fontSize: t.type.body,
    color: t.brand.alert,
    textAlign: 'center',
  },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: t.space.xs },
  resendText: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11
    color: t.scr.dim,
    letterSpacing: 0.3,
  },
  resendWait: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9
    color: t.scr.faint,
    letterSpacing: 1,
  },
  // the terminal success seal (welcome-auth seal-block grammar — accent-stroked line glyph, F-06)
  sealBlock: { alignItems: 'center', gap: t.space.sm, paddingTop: t.space.xxl },
  seal: { marginBottom: t.space.sm },
  sealEyebrow: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 2,
  },
  sealTitle: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.title, // 15
    color: t.scr.ink,
    letterSpacing: 1,
  },
  sealSub: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11
    color: t.scr.dim,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  sealAction: { alignSelf: 'stretch', marginTop: t.space.lg },
}));
