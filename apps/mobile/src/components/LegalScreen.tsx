import { Text, View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { themedStyles } from '../theme';
import { TertiaryLink } from './TertiaryLink';
import { SCREEN_HEADER_PAD, HEADER_SEAM_GAP } from './ScreenHead';

// OQ-119 — placeholder in-app legal screens so the AUTH-10 acceptance links resolve today. The final
// ToS/Privacy copy on a hosted domain is a release task (road-to-market §10); this is the interim stub.
//
// walk2 W-B1/B2 (Terms was a named offender): the title + S2-b under-title ‹ BACK seam now sit in a
// FIXED header block on the shared SCREEN_HEADER_PAD geometry (the title was floating at the xxl
// document inset — off the Collection/Profile grid); the scroll content keeps the lg gutter.
export function LegalScreen({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {/* S2-b — the ‹ BACK return-seam sits UNDER the screen title (was above it). */}
        <TertiaryLink label="Back" chevron="leading-back" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.note}>
          DRAFT — placeholder copy. The final policy is published on a hosted domain before launch.
        </Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.body}>
            {p}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  // W-B1/B2 — the fused under-title seam block on the shared geometry (title → HEADER_SEAM_GAP → link).
  head: { alignItems: 'flex-start', gap: HEADER_SEAM_GAP, ...SCREEN_HEADER_PAD },
  content: { flexGrow: 1, paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },
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
