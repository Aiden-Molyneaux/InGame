import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { ProfileBioCard } from '../src/components/ProfileBioCard';
import { colors } from '../src/theme';

// The M1 dev/test surface — proves the Expo stack + the Chrome (web) loop render on a device/emulator.
// The styled-profile slice + RTK Query binding land in M2 (the catalog component library is M2/OQ-111).
export default function Home() {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.brand}>INGAME</Text>
      <Text style={styles.tagline}>M1 scaffold — the floor is real</Text>
      <ProfileBioCard username="curator" bio="collector of trophies" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  brand: { color: colors.accent, fontSize: 21, letterSpacing: 4, fontWeight: '700' },
  tagline: { color: colors.dim, fontSize: 11 },
});
