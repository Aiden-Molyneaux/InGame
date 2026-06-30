import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// CONVENTIONS rule 8 [LINT] — the dependency surfacer (widened to runtime OR dev, decision 0051/F44).
// Every dependency across the workspace manifests must carry a written justification in the ledger
// (tools/deps/justifications.json): why needed, why no stdlib/existing path, provenance. A new,
// un-justified manifest entry is surfaced for the G-M owner glance (a malicious dev tool runs in CI
// with FS+secret access — SCA catches known CVEs; this catches the rest). Internal @ingame/* workspace
// packages are auto-justified.

function loadLedger(cwd) {
  try {
    return JSON.parse(readFileSync(join(cwd, 'tools', 'deps', 'justifications.json'), 'utf8'));
  } catch {
    return {};
  }
}

function findManifests(root) {
  const out = [];
  const tryRead = (p) => {
    try {
      return { path: p, json: JSON.parse(readFileSync(p, 'utf8')) };
    } catch {
      return null;
    }
  };
  const rootPkg = tryRead(join(root, 'package.json'));
  if (rootPkg) out.push(rootPkg);
  for (const group of ['apps', 'packages']) {
    let dirs = [];
    try {
      dirs = readdirSync(join(root, group), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      /* group missing */
    }
    for (const d of dirs) {
      const pkg = tryRead(join(root, group, d, 'package.json'));
      if (pkg) out.push(pkg);
    }
  }
  return out;
}

export default {
  id: 'rule-08-deps',
  title: 'dependency surfacer — every runtime/dev dependency carries a written justification',
  conventions: 'CONVENTIONS rule 8',
  severity: 'error',
  /** @param {{ root?: string }} ctx */
  check(ctx) {
    const cwd = process.cwd();
    const ledger = loadLedger(cwd);
    const justified = new Set(Object.keys(ledger));
    const root = ctx.root ?? cwd;
    const violations = [];

    for (const manifest of findManifests(root)) {
      const deps = {
        ...(manifest.json.dependencies ?? {}),
        ...(manifest.json.devDependencies ?? {}),
      };
      for (const name of Object.keys(deps)) {
        if (name.startsWith('@ingame/')) continue; // internal workspace package
        if (!justified.has(name)) {
          violations.push({
            file: manifest.path.split(/[\\/]/).slice(-2).join('/'),
            line: 1,
            message: `dependency "${name}" has no entry in tools/deps/justifications.json — add a written justification (why needed · why no stdlib/existing path · provenance) for the G-M glance.`,
          });
        }
      }
    }
    return violations;
  },
};
