import { useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { PulledSheet } from '../PulledSheet';
import { InlineBanner } from '../InlineBanner';
import { SaveOption } from '../styler/SaveOption';
import { PixelsMark } from '../commerce/PixelsMark';
import { themedStyles } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';

// PressSheet (component-map §8b / board P7) — the Canvas finish-up sheet: "where does it go?"
// Canonical labels PUBLISH · SAVE PRIVATE · TO THE STYLER (the workshop flavors eyebrows only).
// M5 P7: ◆ PUBLISH goes LIVE with the CARD-19 checklist (complexity · dedup · premium-reconcile). The
// checklist rows mirror the server's 409 grammar (MIN_COMPLEXITY · DUPLICATE_COMPOSITION ·
// PREMIUM_UNRECONCILED); PUBLISH disables only on the client-checkable complexity floor, and the
// premium row routes into the ReconcileSheet (rendered by CanvasSurface). The full P8 PrintRitual fires
// on success (owned by the Styler). SAVE PRIVATE runs the Styler's ONE quiet-exit implementation.
// CR-17 (gate-5): SAVE PRIVATE carries GOLD weight + a LIGHT press beat (distinct from the ritual).

const BEAT_MS = 250;

/** The CARD-19 checklist state (M5 P7) — complexity is live-checkable; unique is server-only (surfaced
 *  on a DUPLICATE_COMPOSITION 409); premium is the reconcile debt (0 = owned/none). */
export interface PublishChecklist {
  complexity: 'ok' | 'fail';
  unique: 'unknown' | 'ok' | 'fail';
  premium: 'ok' | 'debt';
  premiumCost: number;
}

export function PressSheet({
  visible,
  onClose,
  busy,
  onSavePrivate,
  onToStyler,
  checklist,
  onPublish,
  publishBusy,
  publishError,
}: {
  visible: boolean;
  onClose: () => void;
  busy: boolean;
  onSavePrivate: () => void;
  onToStyler: () => void;
  checklist: PublishChecklist;
  onPublish: () => void;
  publishBusy: boolean;
  /** M5 D6 — a publish-path refusal re-homed INTO the sheet (RATE_LIMITED · COMPOSITION_CHANGED ·
   *  MIN_COMPLEXITY · network · generic), rendered as a calm in-flow InlineBanner. DUPLICATE flips the
   *  UNIQUE checklist row instead; PREMIUM_UNRECONCILED routes to the ReconcileSheet. null = clear. */
  publishError?: string | null;
}) {
  const styles = useStyles();
  const beat = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion(); // CARD-16/0044 §104 — the shared gate

  const pressPrivate = () => {
    if (busy) return;
    if (reduceMotion) {
      onSavePrivate(); // reduce-motion: no press beat, straight to the save
      return;
    }
    // a light press beat — dip + settle, then hand off to the save (no full-screen ritual)
    Animated.sequence([
      Animated.timing(beat, { toValue: 0.96, duration: BEAT_MS * 0.4, useNativeDriver: true }),
      Animated.timing(beat, { toValue: 1, duration: BEAT_MS * 0.6, useNativeDriver: true }),
    ]).start(() => onSavePrivate());
  };

  const complexityFails = checklist.complexity === 'fail';
  const publishSub = complexityFails
    ? 'Add a little more first — at least 3 elements, or 2 different kinds.'
    : checklist.premium === 'debt'
      ? `Adoptable by everyone — acquires ${checklist.premiumCost} PX of premium first.`
      : 'Adoptable by everyone — it joins the community gallery.';

  return (
    <PulledSheet visible={visible} onClose={onClose} title="The press — where does it go?">
      <SaveOption
        label={publishBusy ? '…' : '◆ Publish'}
        sub={publishSub}
        gold
        disabled={busy || publishBusy || complexityFails}
        onPress={onPublish}
      />
      {/* M5 D6 — a publish refusal lands HERE, in the sheet's own grammar (calm, in-flow, no toast, no
          layout jump) rather than jarring the screen behind it. DUPLICATE flips the UNIQUE row below. */}
      {publishError ? <InlineBanner title="Couldn't publish"><Text style={styles.errText}>{publishError}</Text></InlineBanner> : null}
      {/* the CARD-19 checklist — what publishing requires (board P7) */}
      <View style={styles.checklist}>
        <CheckRow
          state={checklist.complexity === 'ok' ? 'ok' : 'fail'}
          okText="Enough to stand on its own"
          failText="A published card needs a little more going on — at least 3 elements, or 2 different kinds."
        />
        <CheckRow
          state={checklist.unique === 'fail' ? 'fail' : 'pending'}
          okText="One of a kind"
          failText="This exact card already exists"
          pendingText="Checked against the gallery on publish"
        />
        {checklist.premium === 'debt' ? (
          <View style={styles.premRow}>
            <Text style={styles.checkPending}>◇</Text>
            <Text style={styles.premText}>Premium components — </Text>
            <Text style={styles.premCost}>{checklist.premiumCost}</Text>
            <PixelsMark size={11} />
            <Text style={styles.premTail}> to reconcile</Text>
          </View>
        ) : (
          <CheckRow state="ok" okText="Premium components owned" failText="" />
        )}
      </View>
      <Animated.View style={{ transform: [{ scale: beat }] }}>
        <SaveOption
          label={busy ? '…' : 'Save private'}
          sub="Kept on your shelf — not worn. Back to the game."
          gold
          disabled={busy}
          onPress={pressPrivate}
        />
      </Animated.View>
      <SaveOption
        label="To the Styler"
        sub="Swap posture — same draft, frames and effects live there."
        disabled={busy}
        onPress={onToStyler}
      />
      {/* CR-20 — one document: a save from the Canvas keeps the whole card, Styler work included */}
      <Text style={styles.crossPostureNote}>Saving keeps the whole card — your Styler work too.</Text>
    </PulledSheet>
  );
}

function CheckRow({
  state,
  okText,
  failText,
  pendingText,
}: {
  state: 'ok' | 'fail' | 'pending';
  okText: string;
  failText: string;
  pendingText?: string;
}) {
  const styles = useStyles();
  const glyph = state === 'ok' ? '✓' : state === 'fail' ? '✕' : '◇';
  const text = state === 'ok' ? okText : state === 'fail' ? failText : (pendingText ?? '');
  return (
    <View style={styles.checkRow}>
      <Text style={[styles.checkGlyph, state === 'ok' && styles.checkOk, state === 'fail' && styles.checkFail]}>{glyph}</Text>
      <Text style={[styles.checkText, state === 'fail' && styles.checkFailText]}>{text}</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  crossPostureNote: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
    paddingTop: t.space.sm,
  },
  checklist: {
    gap: t.space.sm,
    paddingVertical: t.space.sm,
    paddingHorizontal: t.space.sm,
    borderLeftWidth: 2,
    borderLeftColor: t.scr.hairline,
    marginLeft: t.space.sm,
    marginBottom: t.space.sm,
  },
  // D4b (M5 type audit) — the checklist rows are the load-bearing copy of this sheet (they say WHY a
  // card can/can't publish). They sat at the F-06 micro floor (9); raised to body (11), the next scale
  // step, so the refusal reads clearly. The SaveOption consequence sub-lines stay at 9 (app convention).
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  checkGlyph: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.faint, width: 14 },
  checkOk: { color: t.brand.gold },
  checkFail: { color: t.brand.alert },
  checkText: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 0.5, flexShrink: 1 },
  checkFailText: { color: t.scr.ink },
  checkPending: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.gold, width: 14 },
  premRow: { flexDirection: 'row', alignItems: 'center', gap: 2, flexWrap: 'wrap' },
  premText: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 0.5 },
  premCost: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.gold, marginLeft: 2 },
  premTail: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.faint, letterSpacing: 0.5 },
  // D6 — the in-sheet publish-error body (inside the accent InlineBanner). Body scale, calm dim ink.
  errText: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.3, lineHeight: 15 },
}));
