import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Single-source the F32 global-table manifest: parse the actual packages/shared manifest so the
// rule-2 allowlist IS that manifest (decision 0051/F32), never a duplicated copy that could drift.
export function loadGlobalTables(cwd = process.cwd()) {
  const file = join(cwd, 'packages', 'shared', 'src', 'manifests', 'global-tables.ts');
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const block = /GLOBAL_TABLES\s*=\s*\[([\s\S]*?)\]/.exec(text);
  if (!block) return [];
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}
