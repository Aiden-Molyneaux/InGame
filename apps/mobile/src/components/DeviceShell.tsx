import { View, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '../theme';
import { PipLight } from './PipLight';

// DeviceShell (component-map §5.1) — the 3D device plastic (TEAL) that wraps every screen: the
// faceplate frame, corner screws, and the power LED. The dark Midnight screen sits inset inside it.
// F-07: radius lives on the plastic. (A fuller 3D bevel is a Burt-audit refinement.)
export function DeviceShell({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.plastic, style]}>
      <View style={styles.topRail}>
        <Screw />
        <PipLight size={6} />
        <Screw />
      </View>
      <View style={styles.screen}>{children}</View>
    </View>
  );
}

function Screw() {
  return <View style={styles.screw} />;
}

const styles = StyleSheet.create({
  plastic: {
    flex: 1,
    backgroundColor: theme.shell.plastic,
    padding: theme.space.md,
    paddingTop: theme.space.sm,
  },
  topRail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.sm,
    paddingBottom: theme.space.sm,
  },
  screw: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.shell.lo,
    borderWidth: 1,
    borderColor: theme.shell.hi,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.scr.bg, // the Midnight screen
    borderRadius: theme.corner.screen, // F-07 square screen
    borderWidth: 2,
    borderColor: theme.shell.ink,
    overflow: 'hidden',
  },
});
