import { StyleSheet, Text, View } from 'react-native';
import type { SelfProfile } from '@ingame/shared';
import { colors } from '../theme';

// The FE↔BE contract crosses the seam at the TYPE level here (the props are derived from the shared
// SelfProfile shape — a type-only import, erased at runtime). The runtime RTK Query binding to the
// same z.infer types is M2-foundation (F31), deliberately NOT pulled into the M1 spine.
export interface ProfileBioCardProps {
  username: SelfProfile['username'];
  bio: SelfProfile['bio'];
}

export function ProfileBioCard({ username, bio }: ProfileBioCardProps) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.name}>@{username}</Text>
      <Text style={styles.bio}>{bio}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minWidth: 240,
    gap: 6,
  },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  bio: { color: colors.dim, fontSize: 11 },
});
