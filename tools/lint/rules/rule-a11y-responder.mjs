import { stripComments, lineAt } from '../util/files.mjs';

// Mobile a11y guard [LINT] (CARD-16 · decision 0044 §105). A tappable control must be a `Pressable`,
// never a raw element wired as a button through the low-level responder system
// (`onStartShouldSetResponder={() => true}` + `onResponderRelease={handler}`). That pattern renders the
// control unreliable/invisible to VoiceOver + TalkBack (a bare `View` with responder props is not a
// guaranteed accessibility element and carries no button semantics), and it was the exact defect the
// CARD-16 audit found in the ColorPicker swatches/keys. Real DRAG gestures are unaffected — they use
// `PanResponder` and spread `{...panResponder.panHandlers}`, which never appears as a literal
// `onResponderRelease=` JSX prop. So banning the literal prop in the mobile UI catches the button-via-
// responder anti-pattern without touching legitimate gesture surfaces. Scope: the mobile components +
// app screens. A regression (a new raw-responder button) fails CI.

// Scope by extension: `.tsx`/`.jsx` are the RN UI (the backend is `.ts`), so this catches every mobile
// component + screen (and the corpus fixture) while leaving api/shared source untouched.
const isUiFile = (path) => (path.endsWith('.tsx') || path.endsWith('.jsx')) && !/\.test\./.test(path);
const BANNED_RE = /\bonResponderRelease\s*=/g;

export default {
  id: 'rule-a11y-responder',
  title: 'mobile a11y — tappable controls are Pressable, not raw responder-wired Views',
  conventions: 'CARD-16 / decision 0044 §105',
  severity: 'error',
  /** @param {{ files: import('../util/files.mjs').SourceFile[] }} ctx */
  check(ctx) {
    const violations = [];
    for (const file of ctx.files) {
      if (!isUiFile(file.path)) continue;
      const src = stripComments(file.text);
      for (const m of src.matchAll(BANNED_RE)) {
        violations.push({
          file: file.path,
          line: lineAt(src, m.index),
          message:
            `\`onResponderRelease=\` wires a tap through the raw responder system — a screen reader can't ` +
            `reliably reach or activate it (CARD-16 / 0044 §105). Use a \`<Pressable onPress=…>\` with an ` +
            `accessibilityLabel/role instead. (Drag gestures are exempt — they spread \`PanResponder.panHandlers\`.)`,
        });
      }
    }
    return violations;
  },
};
