import { Pressable, View } from 'react-native';
import { themedStyles } from '../theme';

// Toggle (component-map §1.5 · settings-states `.tgl`) — the square two-position keycap-knob switch:
// a 44×24 track with an 18×18 cream knob; ON = the accent track + knob-right, OFF = the muted track +
// knob-left. Flat + square (F-03/F-07). `disabled` dims + inert (the NOTIF-04 push-off state).
export function Toggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[styles.track, value && styles.trackOn, disabled && styles.disabled]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

const useStyles = themedStyles((t) => ({
  track: {
    width: 44,
    height: 24,
    backgroundColor: t.scr.faint, // the muted OFF track (board `--scr-grip`)
    borderRadius: t.corner.screen, // F-07 square
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: t.scr.accent },
  disabled: { opacity: 0.4 },
  knob: {
    position: 'absolute',
    left: 3,
    width: 18,
    height: 18,
    backgroundColor: t.brand.cream,
  },
  knobOn: { left: 23 },
}));
