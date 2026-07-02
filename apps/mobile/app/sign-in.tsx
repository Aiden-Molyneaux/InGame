import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { TextField } from '../src/components/TextField';
import { ScreenButton } from '../src/components/ScreenButton';
import { theme } from '../src/theme';
import { useLoginMutation, useRegisterMutation } from '../src/store/api';
import { useAppDispatch } from '../src/store/hooks';
import { setSession } from '../src/store/authSlice';
import { saveTokens } from '../src/auth/tokenStore';

type Mode = 'signin' | 'create';

function errMessage(e: unknown): string {
  const data = (e as { data?: { error?: { message?: string } } })?.data;
  return data?.error?.message ?? 'Something went wrong. Please try again.';
}

export default function SignIn() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const busy = loginState.isLoading || registerState.isLoading;

  async function submit() {
    setError(null);
    try {
      const session =
        mode === 'signin'
          ? await login({ email, password }).unwrap()
          : await register({ email, username, password, acceptedTerms: true }).unwrap();
      await saveTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
      dispatch(setSession(session));
      router.replace('/(tabs)/collection');
    } catch (e) {
      setError(errMessage(e));
    }
  }

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
          />
          {mode === 'create' ? (
            <TextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="a–z, 0–9, _"
            />
          ) : null}
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="min 8 characters"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <ScreenButton
            label={busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={submit}
            disabled={busy}
            block
          />
          <ScreenButton
            label={mode === 'signin' ? 'New here? Create account' : 'Have an account? Sign in'}
            variant="secondary"
            onPress={() => {
              setError(null);
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
    fontSize: 40,
    color: theme.brand.accent,
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
  error: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.body,
    color: theme.brand.alert,
    textAlign: 'center',
  },
});
