import { View, Text } from 'react-native';
import type { ReactNode } from 'react';
import { themedStyles } from '../theme';

// InlineBanner (component-map §6) — an in-flow notice strip (the CAT-03 dedup warning — NEVER a
// toast). Accent-outlined, flat, square (F-07/F-09).
export function InlineBanner({ title, children }: { title: string; children?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  banner: {
    borderWidth: 1,
    borderColor: t.scr.accent,
    backgroundColor: t.scr.panel,
    padding: t.space.lg,
    gap: t.space.md,
  },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    color: t.scr.accent,
    letterSpacing: 1.5,
  },
}));
