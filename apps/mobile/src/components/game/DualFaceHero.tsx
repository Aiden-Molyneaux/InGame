import { View, Text, Pressable } from 'react-native';
import { EntryCard } from '../EntryCard';
import { StatsBack } from './StatsBack';
import { themedStyles } from '../../theme';
import type { CardComposition } from '../../render/composition';

// DualFaceHero (component-map §9) — the Game-page hero: your card's FACE + the standardized stats
// BACK side-by-side, no flip (the dual-face survives the merge, board `:465–485`). Tapping the FACE
// enlarges it to the CardDetail inspect (CARD-23 mode 3 INSPECT / decision 0048 — the whole card is
// the tap-target). At M4 the FACE renders the CARD-18 default placeholder (decision 0058 §6 — the
// composed CARD-15 render is EXPECTED). `statsLabel` becomes "↻ UPDATES LIVE" in EDIT so the back
// visibly reflects the in-progress form.
export function DualFaceHero({
  title,
  composition = null,
  imageUrl,
  thumbUrl,
  hours,
  percent,
  status,
  since,
  artist,
  statsLabel = 'YOUR STATS',
  statsTitle,
  faceLabel = 'THE FACE',
  faceA11yLabel,
  onInspect,
}: {
  title: string;
  /** The equipped design's composition (owner-side live render, 0066) — null → the default face. */
  composition?: CardComposition | null;
  /** Flattened image for an equipped ADOPTED card (no composition; F-8 E3-1a) — CardFace renders it. */
  imageUrl?: string | null;
  /** The plateless thumb sibling (W-A2) — both urls ride; EntryCard picks by rendered size. */
  thumbUrl?: string | null;
  hours: number;
  percent: number | null;
  status: string;
  since: string | null;
  artist: string | null;
  /** The OUTER label under the back card. Default OWN "YOUR STATS"; a friend passes "{NAME}'S STATS". */
  statsLabel?: string;
  /** The INNER StatsBack heading (W-D1 D-1) — defaults to the StatsBack OWN value ("YOUR STATS"). */
  statsTitle?: string;
  /** The OUTER label under the face card (default "THE FACE"; a friend passes "{NAME}'S FACE"). */
  faceLabel?: string;
  /** Accessibility name for the face tap-target (default the OWN "Inspect your {title} card"). */
  faceA11yLabel?: string;
  /** The face-tap handler. UNDEFINED → the face is INERT: a plain non-button View, no "button" SR role,
   *  no no-op double-tap (F3 — a friend whose card isn't adopt-able). A real handler → the Pressable. */
  onInspect?: () => void;
}) {
  const styles = useStyles();
  const face = (
    <>
      {/* /grid (161×225) — one size up from /pick per the owner's gate-5 B.5. `animate`: the
          game-page hero is the shelf's showpiece — animated cosmetics run here (0068 opt-in).
          EntryCard owns the own-composition vs adopted-flattened branch (F-8/F-19 class). */}
      <EntryCard title={title} card={{ composition, imageUrl, thumbUrl }} size="grid" animate />
      <Text style={styles.label}>{faceLabel}</Text>
    </>
  );
  return (
    <View style={styles.wrap}>
      {onInspect ? (
        <Pressable
          style={styles.face}
          accessibilityRole="button"
          accessibilityLabel={faceA11yLabel ?? `Inspect your ${title} card`}
          onPress={onInspect}
        >
          {face}
        </Pressable>
      ) : (
        // F3 — inert face: a plain View (no button role, no press). Keep the descriptive a11y label
        // (an image-like readout) but drop the interactive affordance a screen reader would announce.
        <View style={styles.face} accessibilityLabel={faceA11yLabel ?? `${title} card`}>
          {face}
        </View>
      )}
      <View style={styles.face}>
        <StatsBack hours={hours} percent={percent} status={status} since={since} artist={artist} statsTitle={statsTitle} width={161} height={225} />
        <Text style={[styles.label, styles.labelAcc]}>{statsLabel}</Text>
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: t.space.lg,
    paddingVertical: t.space.sm, // tightened toward the title/facts block (gate-5 B.5)
  },
  face: { alignItems: 'center', gap: t.space.sm },
  label: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  labelAcc: { color: t.scr.accent },
}));
