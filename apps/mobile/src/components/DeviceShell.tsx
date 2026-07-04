import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { ShellNav } from './ShellNav';

// DeviceShell (component-map §5.1 · design-spec §1.5) — the F-03 teal plastic that **wraps every
// screen**. ONE persistent instance is mounted at the ROOT layout so the device frame containerizes
// the whole application (sign-in → tabs), never unmounting across navigation. The routed screen
// renders inside the Midnight `.screen`, framed by the fixed chrome:
//   top-band (56) · screen-bezel (pad 6, r20) → screen (r13) · nav-band (content, the NavBand).
// The fixed band/inset heights come from the canonical device in profile-states.html, so the USABLE
// screen area (viewport − top-band − nav-band − bezel padding) is correct now and every screen builds
// into the right space. Decorative F-03 chrome (grille slats, embossed logo, 3D screw/bevel
// gradients) is simplified this pass (iteration lane) — the structure + dimensions are what matter.
export function DeviceShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.plastic}>
      {/* top-band (56px): power LED (left) · INGAME logo (center) · grille (right). The top safe-area
          inset extends the band up into the notch without shrinking its 56px content area. */}
      <View style={[styles.topBand, { height: TOP_BAND + insets.top, paddingTop: TOP_PAD + insets.top }]}>
        <View style={styles.power}>
          <View style={styles.led} />
          <Text style={styles.powerLbl}>POWER</Text>
        </View>
        {/* the logo overlays the CONTENT box (below the notch) so it centres in line with POWER +
            the grille — absolute w/o `top` ignored the inset padding and rode up under the notch */}
        <View pointerEvents="none" style={[styles.logoWrap, { top: TOP_PAD + insets.top }]}>
          <Text style={styles.logo}>INGAME</Text>
        </View>
        <View style={styles.grille}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.slat} />
          ))}
        </View>
      </View>

      {/* screen-bezel (pad 9, r20) holding the Midnight screen (r13) where the routed screen renders */}
      <View style={styles.bezel}>
        <View style={styles.screen}>{children}</View>
      </View>

      {/* nav-band (content-sized): the 5 nav keys — `locked` (gray, non-interactive) until signed in */}
      <ShellNav bottomInset={insets.bottom} />
    </View>
  );
}

// S1-a (M3-R shell polish): top bar up ~¼cm. The band is fixed-height with vertically-CENTRED
// content, so paddingTop alone shifts content by only half the change — TOP_BAND and TOP_PAD drop
// together (64→56 · 16→8) to move the engraving/grille/POWER up a clean ~8px with alignment kept.
// ¼cm is a device-feel target; final magnitude is the owner's R2 device judgment.
const TOP_BAND = 56;
const TOP_PAD = 8;

const styles = StyleSheet.create({
  plastic: {
    flex: 1, // fills the viewport (the shell IS the device body)
    backgroundColor: theme.shell.plastic,
    borderRadius: theme.corner.device, // ~30 (mockup `.device`)
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  topBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  power: { alignItems: 'flex-start', gap: 3 },
  led: {
    width: 9,
    height: 9,
    borderRadius: 5, // round LED (F-05 shell light)
    backgroundColor: theme.shell.led,
  },
  powerLbl: {
    fontFamily: theme.font.shell, // Paytone One on the plastic (F-08)
    fontSize: theme.type.micro, // 9
    color: theme.shell.silk,
    opacity: 0.75,
    letterSpacing: 0.5,
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: theme.font.shell, // Paytone One (F-08)
    fontSize: theme.type.display, // 21
    letterSpacing: 7,
    color: theme.shell.lo, // faint emboss on the plastic (full 3D emboss = iteration lane)
  },
  grille: { flexDirection: 'row', gap: 6 },
  slat: {
    width: 5,
    height: 23,
    borderRadius: 2,
    backgroundColor: theme.shell.lo,
    transform: [{ skewX: '-22deg' }],
  },
  bezel: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.shell.bezel,
    borderRadius: theme.corner.bezel, // 20 (mockup `.screen-bezel`)
    padding: 6, // S6-b (M3-R): thinner black frame/screen border (board is 9) — R2-tunable
  },
  screen: {
    flex: 1,
    backgroundColor: theme.scr.bg, // the Midnight screen
    borderRadius: theme.corner.glass, // 13 (mockup `.screen`)
    overflow: 'hidden',
  },
});
