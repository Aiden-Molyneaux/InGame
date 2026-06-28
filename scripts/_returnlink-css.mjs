import fs from 'fs';
const base = 'docs/design/mockups/';
const targets = [
  'settings/settings-states.html', 'game-page/game-page-states.html', 'device/device-states.html',
  'styler/styler-states.html', 'add-game/add-game-states.html', 'report-sheet/report-states.html',
  'store/store-states.html',
];
const RULE = '  /* .return-link — under-header back-seam (replaces the retired in-header .fh-key back key) */\n' +
  '  .return-link { flex: 0 0 auto; align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; margin: 0 16px 8px; font: 600 11px var(--pk); letter-spacing: .5px; color: var(--scr-accent); text-decoration: none; }\n';
for (const rel of targets) {
  const p = base + rel;
  let css = fs.readFileSync(p, 'utf8');
  let note = [];
  // 1) add .return-link rule if absent
  if (!/\.return-link\s*\{/.test(css)) {
    css = css.replace('</style>', RULE + '</style>');
    note.push('added .return-link css');
  } else {
    note.push('.return-link css already present');
  }
  // 2) strip the now-dead base `.fh-key { ... }` rule (single-line)
  const before = css;
  css = css.replace(/^[ \t]*\.fh-key \{[^\n]*\}\n/m, '');
  if (css !== before) note.push('removed dead .fh-key rule');
  // 3) drop `.fh-key` / `.fh-key:active` from any grouped (comma) selectors, keeping the rest
  css = css
    .replace(/\.fh-key:active,\s*/g, '')
    .replace(/\.fh-key,\s*/g, '');
  fs.writeFileSync(p, css);
  console.log(`${rel.padEnd(40)} ${note.join(' · ')}`);
}
