import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

// MiniDevice (component-map §5.1) — a small device THUMBNAIL (~42×92), the mockup `.mini-dev`: the teal
// plastic body, the inset Midnight screen, and a mini nav row (one gold key). This is the Profile's
// "MY DEVICE" preview cell — NOT the app-wrapping DeviceShell (§5.1). The full F-03 3D-shell treatment
// + real device customization are the iteration lane / DEV-* (M4); this pass renders it small + right.
export function MiniDevice() {
  return (
    <View style={styles.body} accessibilityLabel="device preview">
      <View style={styles.screen} />
      <View style={styles.nav}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.dot, i === 0 && styles.dotGold]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    width: 42,
    height: 92,
    borderRadius: 7,
    padding: 3,
    backgroundColor: theme.shell.plastic,
  },
  screen: {
    flex: 1,
    marginHorizontal: 2,
    marginTop: 5,
    marginBottom: 3,
    backgroundColor: theme.scr.bg,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: theme.shell.bezel,
  },
  nav: {
    height: 9,
    flexDirection: 'row',
    gap: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 4, height: 4, borderRadius: 1.5, backgroundColor: theme.shell.silk },
  dotGold: { backgroundColor: theme.brand.gold },
});
