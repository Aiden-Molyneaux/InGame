import { stripComments, lineAt } from '../util/files.mjs';

// Mobile theme-engine guard [LINT] (device-manifest ARCH 1). The `scr.*` (screen theme) and `shell.*`
// (colourway) token layers are LIVE — re-themeable per DEV-02/04 — so they must be read through
// `useTheme()` / `themedStyles((t) => …)`, never off the STATIC `theme` const (which freezes Midnight/
// Teal into module-scope `StyleSheet.create` where no theme switch can repaint it). This rule bans
// `theme.scr` / `theme.shell` member access everywhere EXCEPT the theme module itself (`src/theme/**`,
// where the palettes + the engine legitimately define/compose those layers). The static `theme` keeps
// brand/type/font/space/corner/step legal everywhere — only the two live layers are gated. A single
// leftover `theme.scr`/`theme.shell` (a missed file, or a regression) fails CI.

const BANNED_RE = /\btheme\.(scr|shell)\b/g;
// exempt the theme module (any file under a `theme/` dir) — that's where the layers are authored.
const THEME_MODULE_RE = /(^|\/)theme\//;

export default {
  id: 'rule-theme-tokens',
  title: 'theme engine — live scr/shell tokens read via useTheme, never the static theme const',
  conventions: 'device-manifest ARCH 1',
  severity: 'error',
  /** @param {{ files: import('../util/files.mjs').SourceFile[] }} ctx */
  check(ctx) {
    const violations = [];
    for (const file of ctx.files) {
      if (THEME_MODULE_RE.test(file.path)) continue;
      const src = stripComments(file.text);
      for (const m of src.matchAll(BANNED_RE)) {
        violations.push({
          file: file.path,
          line: lineAt(src, m.index),
          message:
            `\`theme.${m[1]}\` reads a LIVE token layer off the static \`theme\` const — it will not ` +
            `repaint on a theme/shell switch. Read it via \`useTheme()\` (or \`themedStyles((t) => …)\`) ` +
            `and use \`t.${m[1]}\` instead (device-manifest ARCH 1).`,
        });
      }
    }
    return violations;
  },
};
