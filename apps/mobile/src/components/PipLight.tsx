import { View } from 'react-native';
import { theme } from '../theme';

// PipLight (component-map §5.1) — a SHELL LED: round + pink (brand.accent), with glow. F-05 — this is
// the shell light (NavBand active · power), distinct from the on-screen orange StateMark.
export function PipLight({ size = 6, on = true }: { size?: number; on?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2, // ROUND (F-05, shell LED) — the one place radius is not shell-corner
        backgroundColor: on ? theme.brand.accent : theme.shell.pipOff, // off = shell pip, not a screen token
        shadowColor: theme.brand.accent,
        shadowOpacity: on ? 0.9 : 0,
        shadowRadius: on ? 4 : 0,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}
