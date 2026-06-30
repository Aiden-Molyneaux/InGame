import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Generate the stable-spec-ID registry from the specs (CONVENTIONS rule 6 / decision 0051/F35). An
// unknown/unregistered ID in a risk-domain test fails CI. Regenerated in-memory each lint run for
// freshness; `npm run spec:ids` writes the JSON artifact for visibility.

const SPEC_FILES = [
  'docs/spec/product-spec.md',
  'docs/spec/api-contract.md',
  'docs/spec/testing-strategy.md',
];

export const SPEC_ID_PREFIXES = [
  'SYS', 'AUTH', 'PROF', 'CAT', 'COL', 'CARD', 'DEV', 'COSM', 'ECON', 'SOC', 'WTP', 'DISC', 'NOTIF', 'MOD', 'ACH',
];

export const SPEC_ID_RE = new RegExp(`\\b(?:${SPEC_ID_PREFIXES.join('|')})-\\d{1,3}\\b`, 'g');

export function buildIdRegistry(cwd = process.cwd()) {
  const ids = new Set();
  for (const rel of SPEC_FILES) {
    let text = '';
    try {
      text = readFileSync(join(cwd, rel), 'utf8');
    } catch {
      continue;
    }
    for (const m of text.matchAll(SPEC_ID_RE)) ids.add(m[0]);
  }
  return [...ids].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(entry).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  const ids = buildIdRegistry();
  const out = join(process.cwd(), 'tools', 'spec', 'id-registry.json');
  writeFileSync(out, JSON.stringify(ids, null, 2) + '\n', 'utf8');
  console.log(`id-registry: ${ids.length} stable spec IDs → tools/spec/id-registry.json`);
}
