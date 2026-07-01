import { useEffect, useState, type ReactNode } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useFonts,
  ChakraPetch_500Medium,
  ChakraPetch_600SemiBold,
  ChakraPetch_700Bold,
} from '@expo-google-fonts/chakra-petch';
import { PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { store, persistor } from '../src/store';
import { setTokens } from '../src/store/authSlice';
import { loadTokens } from '../src/auth/tokenStore';
import { theme } from '../src/theme';

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={theme.brand.accent} />
    </View>
  );
}

// Rehydrate the access/refresh tokens from expo-secure-store (F14) into the in-memory auth slice on
// launch, BEFORE the first routed screen decides signed-in vs sign-in.
function AuthBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void (async () => {
      const tokens = await loadTokens();
      if (tokens) store.dispatch(setTokens(tokens));
      setReady(true);
    })();
  }, []);
  return ready ? <>{children}</> : <Splash />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ChakraPetch_500Medium,
    ChakraPetch_600SemiBold,
    ChakraPetch_700Bold,
    PaytoneOne_400Regular,
  });
  if (!fontsLoaded) return <Splash />;

  return (
    <Provider store={store}>
      <PersistGate loading={<Splash />} persistor={persistor}>
        <AuthBootstrap>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.shell.lo },
            }}
          />
        </AuthBootstrap>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: theme.scr.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
