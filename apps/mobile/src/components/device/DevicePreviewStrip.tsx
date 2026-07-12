import { Pressable, Text, View } from 'react-native';
import { themedStyles } from '../../theme';

// PreviewStrip (component-map §5.3 · DEV-04) — the theme try-on banner. Shows while the picked screen
// theme differs from the last server-saved theme; EXIT reverts to the saved theme. An accent strip so
// the "you're previewing, not committed" state reads at a glance.
export function DevicePreviewStrip({ name, onExit }: { name: string; onExit: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.strip}>
      <Text style={styles.label}>◆ PREVIEWING — {name}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Exit preview" onPress={onExit} hitSlop={8}>
        <Text style={styles.exit}>EXIT ✕</Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.scr.accent,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
  },
  label: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.accentInk,
    letterSpacing: 1,
  },
  exit: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.accentInk,
    letterSpacing: 1,
  },
}));
