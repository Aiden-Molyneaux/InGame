import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Stack } from 'expo-router';
import { Provider, useSelector, useDispatch } from 'react-redux';
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
import { store, persistor, type RootState } from '../src/store';
import { setTokens } from '../src/store/authSlice';
import { loadTokens } from '../src/auth/tokenStore';
import { useGetDeviceQuery } from '../src/store/api';
import { setShellId, setThemeId, setStickerComposition } from '../src/store/prefsSlice';
import { DeviceShell } from '../src/components/DeviceShell';
import { CelebrationHost } from '../src/components/achievements/CelebrationHost';
import { StoreThemePreviewProvider } from '../src/components/StoreThemePreview';
import { SheetLockProvider } from '../src/components/SheetLock';
import { BreakoutProvider } from '../src/components/BreakoutContext';
import { DeviceStickerProvider } from '../src/components/device/DeviceStickerContext';
import { theme, useTheme, SCREEN_THEMES, DEFAULT_THEME_ID, resolveShellId, resolveScreenThemeId } from '../src/theme';

// Splash renders BEFORE the redux Provider (the fonts-loading early return) — so it can't read the
// live theme; it uses the DEFAULT screen bg (pre-rehydration we don't know the user's theme anyway).
const SPLASH_BG = SCREEN_THEMES[DEFAULT_THEME_ID].bg;

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={theme.brand.accent} />
    </View>
  );
}

// The routed Stack lives INSIDE the Provider (below), so it CAN read the live theme — its `contentStyle`
// backdrop re-renders on a theme switch (DEV-04). Kept a child component so the hook sits under the store.
function ThemedStack() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.scr.bg },
        animation: 'none',
        // R5 (P6 §6 row 4) — retained stack screens FREEZE while blurred (react-freeze via
        // react-native-screens): a push chain (game → contributor → user → …) keeps every
        // intermediate screen mounted with live query subscriptions, and without freeze each RTK
        // invalidation re-rendered the whole retained chain (the R2 fan-out multiplier). Freeze
        // stops the re-renders only — effects/timers/unmount-cleanups are untouched, so the styler
        // autosave (setTimeout-driven flush) and the device editor's exit flush (unmount cleanup)
        // fire exactly as before; deferred state renders catch up on refocus. Verified against the
        // P6 "Checked and CLEARED" effect list. unmountOnBlur was considered for the heavy
        // FlowTakeovers (styler/device) and deliberately NOT applied: it isn't a native-stack
        // option, and unmounting a blurred styler would destroy the live edit session (draft +
        // undo history) — freeze gives the render-cost win without that risk.
        freezeOnBlur: true,
      }}
    />
  );
}

// DEVICE HYDRATOR (Fable §3.5 walk find — DEV-01/ARCH 2): the wearable device state must follow the
// ACCOUNT, not the browser. Logout purges the prefs slice (the per-user-namespace guarantee), and
// before this existed nothing re-applied the server's device facets until the user happened to open
// the /device editor — a fresh login (or a second device) wore the teal/midnight defaults while the
// server held the user's real shell/theme/stickers. This hydrates prefs from GET /me/device ONCE per
// auth session (re-arming when the token drops), at the root so every screen wears it immediately.
// The editor's own hydrate-once + optimistic dispatches run later and are never fought (this fires at
// login, before any editing).
function DeviceHydrator() {
  const authed = useSelector((s: RootState) => s.auth.accessToken != null);
  const dispatch = useDispatch();
  const { data } = useGetDeviceQuery(undefined, { skip: !authed });
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!authed) {
      hydratedRef.current = false; // next login re-hydrates (a different account may sign in)
      return;
    }
    if (!data || hydratedRef.current) return;
    hydratedRef.current = true;
    dispatch(setShellId(resolveShellId(data.activeShellId)));
    dispatch(setThemeId(resolveScreenThemeId(data.screenThemeId)));
    dispatch(setStickerComposition(data.stickerComposition));
  }, [authed, data, dispatch]);
  return null;
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
              {/* SheetLockProvider (C2, F-13) — a root counter so an open PulledSheet freezes the
                  background screen's scroll regardless of where the sheet is mounted. */}
              <SheetLockProvider>
              {/* DeviceStickerProvider sits ABOVE DeviceShell so the /device editor (a descendant) can
                  publish its edit session UP to the shell's plastic-band sticker layers (ARCH 2). */}
              <DeviceStickerProvider>
                <DeviceHydrator />
                {/* C7 (F-13) — StoreThemePreview wraps the DeviceShell so a store shell/theme sheet can
                    live-preview on the real device chrome (subtree override, never a prefs write). */}
                <StoreThemePreviewProvider>
                  <DeviceShell>
                    <ThemedStack />
                    {/* ACH-06 — the in-app unlock celebration overlays the screen area from the root
                        (an absolute-fill sibling of the routed Stack inside the DeviceShell screen
                        slot), so an unlock celebrates app-wide. Renders null when nothing's pending. */}
                    <CelebrationHost />
                  </DeviceShell>
                </StoreThemePreviewProvider>
              </DeviceStickerProvider>
              </SheetLockProvider>
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
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
