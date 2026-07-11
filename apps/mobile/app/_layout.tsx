import { useEffect, useState, type ReactNode } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  ChakraPetch_500Medium,
  ChakraPetch_600SemiBold,
  ChakraPetch_700Bold,
} from '@expo-google-fonts/chakra-petch';
import { PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
// decision 0068 title fonts — registered as RN families so the Styler FontPreview <Text> renders each
// face (the skia card render uses the separate typeface map in useCardSkiaCtx).
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { Bitter_700Bold } from '@expo-google-fonts/bitter';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { AllertaStencil_400Regular } from '@expo-google-fonts/allerta-stencil';
import { store, persistor } from '../src/store';
import { setTokens } from '../src/store/authSlice';
import { loadTokens } from '../src/auth/tokenStore';
import { DeviceShell } from '../src/components/DeviceShell';
import { BreakoutProvider } from '../src/components/BreakoutContext';
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
    PressStart2P_400Regular,
    Bitter_700Bold,
    SpaceMono_700Bold,
    Pacifico_400Regular,
    AllertaStencil_400Regular,
  });
  if (!fontsLoaded) return <Splash />;

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={<Splash />} persistor={persistor}>
          <AuthBootstrap>
            {/* Fix #1 — ONE persistent DeviceShell frames EVERY screen (sign-in → tabs), mounted at
                the root so it never unmounts across navigation. The NavBand shows its `locked`
                variant pre-auth and drives tab navigation once in the app (see ShellNav).
                BreakoutProvider lets the Canvas posture (§2.5b) tell the shell to hide its chrome so
                the workshop fills the whole device (decision 0014 stage-3). */}
            <BreakoutProvider>
              <DeviceShell>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.scr.bg },
                    animation: 'none',
                  }}
                />
              </DeviceShell>
            </BreakoutProvider>
          </AuthBootstrap>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
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
