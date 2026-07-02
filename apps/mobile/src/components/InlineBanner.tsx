import { View, Text, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { theme } from '../theme';

// InlineBanner (component-map §6) — an in-flow notice strip (the CAT-03 dedup warning — NEVER a
// toast). Accent-outlined, flat, square (F-07/F-09).
export function InlineBanner({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderColor: theme.scr.accent,
    backgroundColor: theme.scr.panel,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  title: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro, // 9
    color: theme.scr.accent,
    letterSpacing: 1.5,
  },
});
