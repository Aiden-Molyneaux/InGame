import { Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../theme';

// OQ-119 — placeholder in-app legal screens so the AUTH-10 acceptance links resolve today. The final
// ToS/Privacy copy on a hosted domain is a release task (road-to-market §10); this is the interim stub.
export function LegalScreen({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="link" onPress={() => router.back()} hitSlop={8}>
        <Text style={styles.back}>‹ BACK</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>
        DRAFT — placeholder copy. The final policy is published on a hosted domain before launch.
      </Text>
      {paragraphs.map((p, i) => (
        <Text key={i} style={styles.body}>
          {p}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: theme.space.xxl, gap: theme.space.lg },
  back: {
    fontFamily: theme.font.screenSemi,
    fontSize: theme.type.micro, // 9 — F-06
    color: theme.scr.accent,
    letterSpacing: 1,
  },
  title: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.display, // 21 — F-06
    color: theme.scr.ink,
    letterSpacing: 1,
  },
  note: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.micro, // 9
    color: theme.scr.dim,
    letterSpacing: 1,
  },
  body: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.body, // 11
    color: theme.scr.dim,
    lineHeight: 18,
  },
});
