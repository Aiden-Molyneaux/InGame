import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// F04 — the client-bundle secret grep (3-bucket key taxonomy, decision 0051/F04). gitleaks scans the
// git TREE; this scans the BUILT client bundle (EXPO_PUBLIC_* ships to every device by design):
//   (1) SERVER-ONLY secret names must be ABSENT from the bundle;
//   (2) INTENTIONAL-PUBLIC keys are allow-listed BY NAME (kills alert fatigue);
//   (3) a non-allow-listed EXPO_PUBLIC_*_(SECRET|KEY|PASSWORD|TOKEN) is a mis-prefixed secret → FAIL.
// Verify on a REAL built bundle (CI runs `expo export` then points this at the output).

export const INTENTIONAL_PUBLIC = new Set([
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY',
]);

const SERVER_ONLY_SECRET =
  /\b(?:DATABASE_URL|JWT_SIGNING_SECRET|REVENUECAT_SECRET(?:_KEY)?|SMTP_PASSWORD|EMAIL_TRANSPORT_API_KEY|AWS_SECRET_ACCESS_KEY)\b\s*[:=]/;
const MISPREFIXED = /\bEXPO_PUBLIC_[A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|KEY)\b/g;

function collectBundleFiles(dir) {
  const out = [];
  const visit = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) visit(full);
      else if (/\.(js|cjs|mjs|map|json|html|txt)$/.test(e.name)) out.push(full);
    }
  };
  visit(dir);
  return out;
}

export function scanBundle(dir) {
  const violations = [];
  for (const file of collectBundleFiles(dir)) {
    const text = readFileSync(file, 'utf8');
    if (SERVER_ONLY_SECRET.test(text)) {
      violations.push({ file, message: 'a SERVER-ONLY secret name appears in the client bundle.' });
    }
    for (const m of text.matchAll(MISPREFIXED)) {
      if (!INTENTIONAL_PUBLIC.has(m[0])) {
        violations.push({
          file,
          message: `mis-prefixed public secret "${m[0]}" in the bundle — a real secret must not ship as EXPO_PUBLIC_* (add to the allow-list only if it is genuinely public).`,
        });
      }
    }
  }
  return violations;
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
  const dir = process.argv[2] ?? 'apps/mobile/dist';
  let exists = false;
  try {
    exists = statSync(dir).isDirectory();
  } catch {
    /* missing */
  }
  if (!exists) {
    console.log(
      `bundle-grep: no built bundle at "${dir}" — run \`npm -w @ingame/mobile run build:web\` first ` +
        `(CI exports the web bundle before this step). Skipping (non-blocking).`,
    );
    process.exit(0);
  }
  const violations = scanBundle(dir);
  for (const v of violations) {
    console.log(`  ✗ ${v.file} — ${v.message}`);
  }
  console.log(`bundle-grep: ${violations.length} violation(s) in ${dir}`);
  process.exit(violations.length > 0 ? 1 : 0);
}
