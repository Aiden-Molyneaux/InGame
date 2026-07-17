import { Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { themedStyles } from '../theme';
import { TertiaryLink } from './TertiaryLink';

// OQ-119 — placeholder in-app legal screens so the AUTH-10 acceptance links resolve today. The final
// ToS/Privacy copy on a hosted domain is a release task (road-to-market §10); this is the interim stub.
export function LegalScreen({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  const styles = useStyles();
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* S2-b — the ‹ BACK return-seam sits UNDER the screen title (was above it). */}
      <Text style={styles.title}>{title}</Text>
      <TertiaryLink label="Back" chevron="leading-back" onPress={() => router.back()} />
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

const useStyles = themedStyles((t) => ({
  content: { flexGrow: 1, padding: t.space.xxl, gap: t.space.lg },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.display, // 21 — F-06
    color: t.scr.ink,
    letterSpacing: 1,
  },
  note: {
    fontFamily: t.font.screen,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 1,
  },
  body: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11
    color: t.scr.dim,
    lineHeight: 18,
  },
}));
