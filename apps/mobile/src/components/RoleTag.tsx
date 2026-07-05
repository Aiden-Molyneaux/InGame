import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

// RoleTag (component-map §5.4 · PROF-09) — an accent-OUTLINE chip, 9px, deliberately NOT gold (F-02
// reserves gold for value/acquisitive + the PRESTIGE tier). Self-view shows the tier ("ADMIN II");
// the public/friend view shows a generic "STAFF". Enhancement, not structure — renders only for admins.
export function RoleTag({ label }: { label: string }) {
  return (
    <View style={styles.tag} accessibilityRole="text" accessibilityLabel={`role ${label}`}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

/** The self-view tier label (PROF-09 — tier shown to self only), or null for a normal user. */
export function selfRoleLabel(role: string, adminTier: number | null): string | null {
  if (role !== 'admin') return null;
  const roman = ['I', 'II', 'III', 'IV'][(adminTier ?? 1) - 1] ?? 'I';
  return `ADMIN ${roman}`;
}

const styles = StyleSheet.create({
  tag: {
    borderWidth: 1,
    borderColor: theme.scr.accent,
    borderRadius: theme.corner.screen,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro, // 9 (F-06)
    color: theme.scr.accent,
    letterSpacing: 1,
  },
});
