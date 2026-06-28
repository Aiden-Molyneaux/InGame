import fs from 'fs';
const base = 'docs/design/mockups/';
const targets = [
  'settings/settings-states.html', 'game-page/game-page-states.html', 'device/device-states.html',
  'styler/styler-states.html', 'add-game/add-game-states.html', 'report-sheet/report-states.html',
  'store/store-states.html',
];
for (const rel of targets) {
  const p = base + rel;
  let css = fs.readFileSync(p, 'utf8');
  const orig = css;
  // 1) strip .fh-key* fragments from grouped (comma) selectors — keep co-grouped selectors
  css = css.replace(/\.fh-key(:active|\.is-pressed)?,\s*/g, '');
  // 2) remove SOLO .fh-key rules (selector is only .fh-key + optional pseudo), single- or multi-line
  css = css.replace(/^[ \t]*\.fh-key(:active|\.is-pressed)?\s*\{[\s\S]*?\}\n/gm, '');
  fs.writeFileSync(p, css);
  // sanity: no dangling empty selector like ",{" or "{\n ... }" with leading comma
  const danglers = (css.match(/(^|\n)\s*,|,\s*\{/g) || []).length;
  console.log(`${rel.padEnd(40)} changed=${css !== orig} · dangling-selector-checks=${danglers}`);
}
