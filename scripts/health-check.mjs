#!/usr/bin/env node
// InGame project-health check — the single source of check logic for the health dashboard.
// Callers: the `/health` skill now; CI later (same script, new caller).
//
// Run from the repo root:  node scripts/health-check.mjs
// It regenerates docs/PROJECT-HEALTH.md and prints an exception-first summary to stdout.
// No dependencies — plain Node ESM + fs. Read-only except for writing the dashboard.
//
// Design-phase checks (deterministic):
//   1. Docs in sync       — each owning doc's Version vs its 00-INDEX §1 register cell.   [gate]
//   2. Decision trace      — every Resolved OQ traces to a decisions/ record or cites one. [gate]
//   3. Formalization debt  — converged SCREEN-STATUS rows still owing Design-spec/API.     [info]
// Catalog conformance (F-01..F-09) is the `burt` skill's job on changed mockups — linked, not run here.
// Code-phase lights (CI · authz · economy · secrets · DoD · migrations) activate at M1.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => { try { return readFileSync(join(ROOT, p), 'utf8'); } catch { return null; } };

// ---- 1. Docs in sync: register cell vs the doc's own Version -----------------------------------
const REGISTERED = [
  { key: 'product-spec',           needle: 'spec/product-spec.md',            file: 'docs/spec/product-spec.md' },
  { key: 'api-contract',           needle: 'spec/api-contract.md',            file: 'docs/spec/api-contract.md' },
  { key: 'testing-strategy',       needle: 'spec/testing-strategy.md',        file: 'docs/spec/testing-strategy.md' },
  { key: 'design-spec',            needle: 'design/design-spec.md',           file: 'docs/design/design-spec.md' },
  { key: 'ui-design-requirements', needle: 'design/ui-design-requirements.md', file: 'docs/design/ui-design-requirements.md' },
];

function checkDocsSync() {
  const index = read('docs/00-INDEX.md');
  const findings = [];
  if (!index) return { findings: [{ doc: '00-INDEX.md', detail: 'file not found', kind: 'error' }], ok: false };
  const indexLines = index.split('\n');

  for (const doc of REGISTERED) {
    const body = read(doc.file);
    if (!body) { findings.push({ doc: doc.key, detail: `${doc.file} not found`, kind: 'error' }); continue; }

    // register version: the §1 row that names this doc's path
    const row = indexLines.find((l) => l.includes('`' + doc.needle + '`'));
    const registerV = row ? (row.match(/v(\d+\.\d+)/) || [])[1] : null;

    // actual version: the doc header's "Version:" line (search header region only)
    const header = body.split('\n').slice(0, 60).join('\n');
    const actualV = (header.match(/Version[:*\s]+v?(\d+\.\d+)/i) || [])[1];

    if (!registerV) findings.push({ doc: doc.key, detail: 'no version cell in 00-INDEX §1 register', kind: 'warn' });
    else if (!actualV) findings.push({ doc: doc.key, detail: `no "Version:" line found in ${doc.file}`, kind: 'warn' });
    else if (registerV !== actualV)
      findings.push({ doc: doc.key, detail: `register says v${registerV} but the doc is v${actualV} — fix the 00-INDEX §1 cell`, kind: 'drift' });
  }
  return { findings, ok: findings.filter((f) => f.kind === 'drift' || f.kind === 'error').length === 0 };
}

// ---- 2. Decision traceability: resolved OQs → a decisions/ record ------------------------------
function checkTraceability() {
  const oq = read('docs/open-questions.md');
  if (!oq) return { findings: [], ok: true, note: 'open-questions.md not found' };
  const resolved = oq.split(/^##\s+Resolved\s*$/m)[1];
  if (!resolved) return { findings: [], ok: true, note: 'no ## Resolved section' };

  // all decision files concatenated, to grep for an OQ id
  let decisionsText = '';
  try {
    for (const f of readdirSync(join(ROOT, 'docs/decisions')))
      if (f.endsWith('.md')) decisionsText += read('docs/decisions/' + f) || '';
  } catch { /* no decisions dir */ }

  // bullets in the Resolved section, each keyed by its leading OQ id
  const findings = [];
  const lines = resolved.split('\n');
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const tracedInline = /decision\s*\[?(\d{4})/i.test(cur.text);
    const tracedRecord = decisionsText.includes(cur.id);
    if (!tracedInline && !tracedRecord) findings.push({ id: cur.id, detail: 'resolved but no decisions/ record and no inline decision cite' });
  };
  for (const l of lines) {
    const m = l.match(/^- (OQ-\d+)/);
    if (m) { flush(); cur = { id: m[1], text: l }; }
    else if (cur) cur.text += '\n' + l;
  }
  flush();
  return { findings, ok: findings.length === 0 };
}

// ---- 3. Formalization debt: converged SCREEN-STATUS rows still owing -----------------------------
function checkDebt() {
  const ss = read('docs/design/SCREEN-STATUS.md');
  if (!ss) return { rows: [], note: 'SCREEN-STATUS.md not found' };
  const lines = ss.split('\n');
  const headerIdx = lines.findIndex((l) => l.includes('Design-spec') && l.includes('| API ') && l.includes('Screen'));
  if (headerIdx < 0) return { rows: [], note: 'could not locate the screen table header' };

  const cols = lines[headerIdx].split('|').map((c) => c.trim());
  const dsCol = cols.indexOf('Design-spec');
  const apiCol = cols.indexOf('API');
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim().startsWith('|')) break;            // table ended
    if (/^\|[-\s|]+\|$/.test(l.trim())) continue;     // separator row
    const cells = l.split('|').map((c) => c.trim());
    const state = cells[3] || '';
    // Only a CONVERGED / IN-PASS board can owe formalization. A not-started (⬜) screen isn't
    // debt — it's unbuilt, tracked by the M0 audit in road-to-market.md, not here.
    if (!/converged|in ?pass/i.test(state)) continue;
    const owed = [];
    if (/[⬜🔶]/.test(cells[dsCol] || '')) owed.push('Design-spec');
    if (/[⬜🔶]/.test(cells[apiCol] || '')) owed.push('API');
    if (owed.length) rows.push({ section: cells[1] || '?', screen: cells[2] || '?', owed: owed.join(' + '), state });
  }
  return { rows };
}

// ---- render ------------------------------------------------------------------------------------
const sync = checkDocsSync();
const trace = checkTraceability();
const debt = checkDebt();

const light = (ok) => (ok ? '🟢' : '🔴');
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const overallRed = !sync.ok || !trace.ok;
const overall = overallRed ? '🔴 needs attention' : (debt.rows.length ? '🟢 healthy · debt tracked' : '🟢 healthy');

const attention = [];
if (!sync.ok)
  for (const f of sync.findings.filter((x) => x.kind === 'drift' || x.kind === 'error'))
    attention.push(`- 🔴 **Docs in sync** — \`${f.doc}\`: ${f.detail}`);
if (!trace.ok)
  attention.push(`- 🟠 **Decision traceability** — ${trace.findings.length} resolved OQ(s) with no decision record: ${trace.findings.map((f) => f.id).join(', ')}. Fix: add/extend a \`decisions/\` record citing them.`);

const lines = [];
lines.push('# InGame — Project Health');
lines.push('');
lines.push('> **Generated by `scripts/health-check.mjs` — do not edit by hand.** Run `/health` (or `node scripts/health-check.mjs`) to refresh.');
lines.push('');
lines.push(`**Generated:** ${stamp} · **Overall:** ${overall}`);
lines.push('');
lines.push('## ⚠ Needs attention');
lines.push(attention.length ? attention.join('\n') : '_Nothing — all clear._ ✅');
lines.push('');
lines.push('## Design phase');
lines.push('| Light | State | Detail |');
lines.push('|---|---|---|');
lines.push(`| Docs in sync | ${light(sync.ok)} | each owning doc's Version vs its 00-INDEX §1 register cell |`);
lines.push(`| Decision traceability | ${light(trace.ok)} | ${trace.ok ? 'every Resolved OQ traces to a decision' : trace.findings.length + ' untraced'} |`);
lines.push(`| Formalization debt | ${debt.rows.length ? '🟠 tracked' : '🟢'} | ${debt.rows.length} converged row(s) owing Design-spec/API (list below) |`);
lines.push('| Catalog conformance (F-01..F-09) | ⚪ manual | run the `burt` skill on changed mockups |');
lines.push('| Audit-clean (R1–R5) | ⚪ manual | re-run the audit rubric at each milestone exit |');
lines.push('| Task grounded / no hand-patch | ⚪ judgment | per-task receipt + review (CLAUDE.md) |');
lines.push('');
lines.push('## Code phase — dormant until M1');
lines.push('| Light | State |');
lines.push('|---|---|');
lines.push('| CI green · Authz SYS-01/07 · Economy ECON-* · Secrets SYS-03 · DoD · Migrations | ⚪ not started — activates at M1 (road-to-market.md) |');
lines.push('');
lines.push('## Formalization debt — tracked outstanding work (not drift)');
if (debt.rows.length) {
  lines.push('| § | Screen | Owed | State |');
  lines.push('|---|---|---|---|');
  for (const r of debt.rows) lines.push(`| ${r.section} | ${r.screen} | ${r.owed} | ${r.state} |`);
} else lines.push('_None — every converged board is formalized._ ✅');
lines.push('');
lines.push('## Decision-traceability holes');
lines.push(trace.findings.length ? trace.findings.map((f) => `- ${f.id} — ${f.detail}`).join('\n') : '_None — every Resolved OQ traces to a decision._ ✅');
lines.push('');

const out = lines.join('\n') + '\n';
writeFileSync(join(ROOT, 'docs/PROJECT-HEALTH.md'), out, 'utf8');

// ---- stdout summary (for the /health skill to relay) ------------------------------------------
console.log(`Overall: ${overall}`);
console.log(`  Docs in sync:          ${light(sync.ok)}${sync.ok ? '' : '  -> ' + sync.findings.filter((f) => f.kind === 'drift' || f.kind === 'error').map((f) => f.doc).join(', ')}`);
console.log(`  Decision traceability: ${light(trace.ok)}${trace.ok ? '' : '  -> ' + trace.findings.map((f) => f.id).join(', ')}`);
console.log(`  Formalization debt:    ${debt.rows.length ? '🟠 ' + debt.rows.length + ' tracked' : '🟢 none'}`);
console.log(`Dashboard written: docs/PROJECT-HEALTH.md`);
process.exit(overallRed ? 1 : 0);
