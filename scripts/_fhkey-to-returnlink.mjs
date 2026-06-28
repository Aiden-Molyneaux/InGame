import fs from 'fs';
// Swap the in-header .fh-key back button for an under-header .return-link (sibling flex child),
// matching the established `‹ RETURN TO …` convention. Per-board destination labels.
const base = 'docs/design/mockups/';
const rules = {
  'settings/settings-states.html': (h2) => h2.trim().toUpperCase() === 'SETTINGS' ? 'RETURN TO PROFILE' : 'RETURN TO SETTINGS',
  'game-page/game-page-states.html': () => 'RETURN TO COLLECTION',
  'device/device-states.html': () => 'RETURN TO PROFILE',
  'styler/styler-states.html': () => 'RETURN TO COLLECTION',
  'add-game/add-game-states.html': () => 'RETURN TO COLLECTION',
  'report-sheet/report-states.html': (h2) => /CARD/i.test(h2) ? 'RETURN TO CARD' : 'RETURN TO GAME',
  'store/store-states.html': () => 'RETURN TO STORE',
};
for (const [rel, labelFn] of Object.entries(rules)) {
  const p = base + rel;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const out = [];
  let removed = 0, inserted = 0;
  for (const line of lines) {
    if (line.includes('class="fh-key"')) {
      const m = line.match(/<h2[^>]*>(.*?)<\/h2>/);
      const h2 = m ? m[1] : '';
      const label = labelFn(h2);
      const indent = (line.match(/^(\s*)/) || ['', ''])[1];
      out.push(line.replace('<button class="fh-key">&#9666;</button>', ''));
      out.push(`${indent}<a class="return-link" href="#">&lsaquo; ${label}</a>`);
      removed++; inserted++;
    } else {
      out.push(line);
    }
  }
  fs.writeFileSync(p, out.join('\n'));
  console.log(`${rel.padEnd(40)} removed ${removed} fh-key · inserted ${inserted} return-link`);
}
