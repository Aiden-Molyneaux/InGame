# QA Lessons Ladder + Doctor Nick Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the QA lessons ladder (runbook → `doctor` → CLAUDE.md law) plus the Doctor Nick enforcement skill in InGame, and its generalized template in shipwright.

**Architecture:** Three tiers of lesson hardness — prose capture in `docs/qa-runbook.md`, deterministic diagnosis in a new read-only `doctor` subcommand of `scripts/dev-stack.mjs`, standing invariants in CLAUDE.md. A skill (`doctor-nick`) enforces preflight / stuck / retro rules. Shipwright gets the project-agnostic versions (runbook template, generalized skill, supervisor contract docs).

**Tech Stack:** Node ESM script (extends existing `dev-stack.mjs` helpers), Claude Code skills (SKILL.md), markdown docs. Two git repos: `C:\personal\InGame` (branch `m4`) and `C:\personal\shipwright`.

**Spec:** [docs/planning/qa-lessons-ladder-design.md](qa-lessons-ladder-design.md) — read it first.

**Testing note:** `dev-stack.mjs` has no test harness and the project's testing-strategy is meaningful-tests-first (no mock-heavy tests for a local diagnostic script). Verification is live-probe based: run `doctor` against the green stack, then against two cheaply-simulated failure states (Task 3). Do NOT build a unit-test rig for this.

**Commit discipline:** one commit per task, staging ONLY the task's files (parallel sessions may be active). InGame commits end with the standard co-author line.

---

## Task 1: Seed `docs/qa-runbook.md` (InGame)

**Files:**
- Create: `C:\personal\InGame\docs\qa-runbook.md`

- [ ] **Step 1: Create the runbook with this exact content**

```markdown
# QA Runbook — the lessons ladder (tier 1: capture)

Workflow lessons for the QA/verify lane (dev stack, preview, screenshot capture, test running).
Owned by the **doctor-nick** skill (`.claude/skills/doctor-nick/`); decision 0065.

**The ladder:** capture instantly here → **twice = automate** into `node scripts/dev-stack.mjs
doctor` → stable invariants become CLAUDE.md law. When stuck on *workflow* (not product bugs):
run `doctor` → check this file → only then investigate from scratch.

**Entry format** (append under Active lessons; zero ceremony, do it mid-task):

    ## <short symptom title>
    - **Symptom:** what you observed (error text, blank page, hang…)
    - **Diagnosis:** actual cause
    - **Fix:** exact commands / steps that resolved it
    - **Verified:** YYYY-MM-DD · **Hits:** 1

Re-hit an existing entry → increment **Hits**, update **Verified**. At **Hits ≥ 2** and
deterministically checkable → promote to a `doctor` check and shrink the entry to a one-liner
under Promoted.

---

## Active lessons

*(none yet — first agent to hit novel QA friction appends here)*

---

## Promoted (owned by `doctor` — run `node scripts/dev-stack.mjs doctor`)

- Postgres container down → `doctor` **db :5432** check.
- API :4000 dead / unhealthy → `doctor` **api :4000** check (restart-safe; env in `apps/api/.env.dev`).
- Web login CORS-blocked → `doctor` **api CORS env** check (`DEV_CORS_ORIGINS` must include `http://localhost:8082`, OQ-120).
- Phone broken after Metro restart → `doctor` **.env.local trap** check (`apps/mobile/.env.local` must NOT exist).
- Preview unreachable / `preview_start` says "port 8082 in use" → `doctor` **metro :8082** check (that error means the standing Metro is UP — never kill it).
- Blank preview page (`scripts: 0`) → `doctor` **web bundle** check (tab loaded before first bundle; reload after "Bundled" appears in `.devstack/metro.log`).
- Leftover parallel API on :4001 → `doctor` **orphan :4001** check.

## Canonized (CLAUDE.md law — the invariants)

- Metro **:8081 is the owner's phone lane — never touch it**; agents use :8082 only.
- **Never create `apps/mobile/.env.local`** (also doctor-checked).
- Behavior checks → **supertest integration tests first**; the :8082 browser lane is for visual/UI verification.
- Destructive DB testing → parallel API on :4001 + disposable DB, killed after.
```

- [ ] **Step 2: Commit**

```powershell
git add docs/qa-runbook.md
git commit -m @'
docs: seed qa-runbook.md — QA lessons ladder tier 1 (capture)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 2: Add the `doctor` subcommand to `scripts/dev-stack.mjs` (InGame)

**Files:**
- Modify: `C:\personal\InGame\scripts\dev-stack.mjs` (header comment ~line 7, new section after `status()` ~line 159, verb dispatch ~line 281)

- [ ] **Step 1: Add `doctor` to the header comment**

In the file-top comment block, after the `status` line (line 7), insert:

```js
//   node scripts/dev-stack.mjs doctor  — read-only diagnosis: probe every KNOWN failure
//                                        signature and print the exact fix. Never mutates state.
```

- [ ] **Step 2: Add path constants**

Directly below `const METRO_BASE = 'http://localhost:8082';` (line 30), add:

```js
const ENV_LOCAL_TRAP = path.join(ROOT, 'apps', 'mobile', '.env.local');
const API_ENV_DEV = path.join(ROOT, 'apps', 'api', '.env.dev');
```

- [ ] **Step 3: Add the `doctor` verb**

Insert this section immediately after the `status()` function (after line 159), before `prewarmBundle()`:

```js
// --- doctor (QA lessons ladder, tier 2 — decision 0065) -------------------------------------
// Read-only diagnostics: probe every KNOWN failure signature and print the exact fix.
// NEVER mutates state — starts/stops/kills nothing, and never touches the phone Metro on :8081.
// New signatures graduate here from docs/qa-runbook.md when an entry reaches Hits >= 2.

async function doctor() {
  const rows = [];
  const check = (sev, name, ok, detail, fix) => rows.push({ sev, name, ok, detail, fix });

  // db
  const db = await dbUp();
  check('FAIL', 'db :5432', db,
    db ? 'postgres answering' : 'no listener on :5432',
    `node scripts/dev-stack.mjs up  (starts docker ${DB_CONTAINER}; still failing -> is Docker Desktop running?)`);

  // api
  const api = await apiUp();
  check('FAIL', 'api :4000', api,
    api ? '/api/health ok' : '/api/health not answering',
    'node scripts/dev-stack.mjs up  (API is restart-safe; env incl. stable JWT secret in apps/api/.env.dev)');

  // api env file + CORS for the :8082 web origin (OQ-120)
  let corsOk = false, corsDetail, corsFix;
  if (!fs.existsSync(API_ENV_DEV)) {
    corsDetail = 'apps/api/.env.dev is MISSING';
    corsFix = 'copy apps/api/.env.example -> apps/api/.env.dev, fill values, then node scripts/dev-stack.mjs up';
  } else {
    corsOk = /^DEV_CORS_ORIGINS=.*http:\/\/localhost:8082/m.test(fs.readFileSync(API_ENV_DEV, 'utf8'));
    corsDetail = corsOk ? 'DEV_CORS_ORIGINS allows :8082' : 'DEV_CORS_ORIGINS missing http://localhost:8082 (web login will CORS-fail)';
    corsFix = 'add http://localhost:8082 to DEV_CORS_ORIGINS in apps/api/.env.dev, then node scripts/dev-stack.mjs up (API restart is safe)';
  }
  check('FAIL', 'api CORS env', corsOk, corsDetail, corsFix);

  // the retired .env.local trap
  const trap = fs.existsSync(ENV_LOCAL_TRAP);
  check('FAIL', '.env.local trap', !trap,
    trap ? 'apps/mobile/.env.local EXISTS — a restarted Metro would point the PHONE at localhost' : 'absent (good)',
    'delete apps/mobile/.env.local and never recreate it (the web bundle needs no base-URL override)');

  // metro :8082 — port ownership + packager health
  const metroPort = await tcpUp(8082);
  const metro = metroPort && (await metroUp());
  check('FAIL', 'metro :8082', metro,
    !metroPort ? 'nothing on :8082' : metro ? 'packager running' : 'port owned but /status unhealthy (booting or wedged)',
    !metroPort
      ? 'node scripts/dev-stack.mjs up  (NOT preview_start — its "port 8082 in use" error means the standing Metro is UP)'
      : 'wait ~60s, re-run doctor; still red -> tail .devstack/metro.log. Do NOT kill :8082 — that re-pays the cold start');

  // web bundle warmth (only meaningful when metro is healthy)
  if (metro) {
    let warm = false, warmDetail;
    const page = await httpGet(`${METRO_BASE}/`, 8000);
    const m = page?.text.match(/src="([^"]*\.bundle[^"]*)"/);
    if (!page) warmDetail = 'index page did not answer in 8s (cold)';
    else if (!m) warmDetail = 'index page has no bundle tag (cold)';
    else {
      warm = (await httpGet(`${METRO_BASE}${m[1]}`, 15000))?.ok === true;
      warmDetail = warm ? 'bundle answers fast (warm)' : 'bundle did not answer in 15s (cold/building)';
    }
    check('WARN', 'web bundle', warm, warmDetail,
      'node scripts/dev-stack.mjs up (pre-warms); blank preview tab = loaded before "Bundled" appeared in .devstack/metro.log -> reload');
  } else {
    check('INFO', 'web bundle', true, 'skipped (metro not healthy)', null);
  }

  // phone lane — report only, NEVER acted on
  const phone = await tcpUp(8081);
  check('INFO', 'phone Metro :8081', true,
    phone ? "up (owner's lane — NEVER touch)" : 'down (fine — owner not running it)', null);

  // orphaned parallel API from destructive-DB testing
  const orphan = await tcpUp(4001);
  check('WARN', 'orphan :4001', !orphan,
    orphan ? 'something listening on :4001 (leftover parallel API — task-stop orphans the tsx child)' : 'clear',
    'netstat -ano | findstr :4001  -> taskkill /PID <pid> /F');

  let blocking = 0;
  for (const r of rows) {
    const mark = r.sev === 'INFO' ? 'INFO' : r.ok ? 'OK  ' : r.sev;
    say(`${mark}  ${r.name} — ${r.detail}`);
    if (!r.ok && r.fix) say(`      fix: ${r.fix}`);
    if (!r.ok && r.sev === 'FAIL') blocking++;
  }
  if (blocking) {
    say(`doctor: ${blocking} blocking issue(s) — apply the fixes above, re-run doctor. Novel failure? -> docs/qa-runbook.md`);
    process.exit(1);
  }
  say('doctor: green board — QA away.');
}
```

- [ ] **Step 4: Wire the verb**

Replace the dispatch block (lines 281–288) with:

```js
const verb = process.argv[2];
if (verb === 'up') await up();
else if (verb === 'status') await status();
else if (verb === 'doctor') await doctor();
else if (verb === 'down') await down();
else {
  console.log('usage: node scripts/dev-stack.mjs <up|status|doctor|down>');
  process.exit(2);
}
```

- [ ] **Step 5: Syntax check**

Run: `node --check scripts/dev-stack.mjs`
Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```powershell
git add scripts/dev-stack.mjs
git commit -m @'
feat: dev-stack doctor — read-only QA diagnostics (lessons ladder tier 2)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 3: Verify `doctor` live (green + simulated reds)

**Files:** none (verification only). Prereq: Task 2.

- [ ] **Step 1: Green-board run**

```powershell
node scripts/dev-stack.mjs up; node scripts/dev-stack.mjs doctor
```
Expected: every FAIL-severity row prints `OK`, `phone Metro :8081` prints as INFO either way, final line `doctor: green board — QA away.`, exit 0. (If `up` itself fails, fix the stack first — that's not a doctor bug.)

- [ ] **Step 2: Simulated red — the `.env.local` trap**

```powershell
Set-Content -Encoding utf8 apps\mobile\.env.local "EXPO_PUBLIC_API_URL=http://localhost:4000"
node scripts/dev-stack.mjs doctor
Remove-Item apps\mobile\.env.local -Confirm:$false
node scripts/dev-stack.mjs doctor
```
Expected: run 1 → `FAIL  .env.local trap` with the delete prescription, exit 1. Run 2 (after removal) → green again, exit 0. **Do not leave the file behind.**

- [ ] **Step 3: Simulated red — API stopped (only if dev-stack owns it)**

Only if `.devstack/api.pid` exists (dev-stack-started API; skip entirely if the API was externally started):

```powershell
taskkill /PID (Get-Content .devstack\api.pid) /T /F
node scripts/dev-stack.mjs doctor
node scripts/dev-stack.mjs up
node scripts/dev-stack.mjs doctor
```
Expected: doctor run 1 → `FAIL  api :4000` with the `up` prescription (and exit 1); `up` restores the API without touching Metro (adopts the running :8082); doctor run 2 → green. This is safe: the API is restart-safe by design (stable JWT secret).

- [ ] **Step 4: Record the result** — note pass/fail per step for the wrap-up receipt. Any check that misbehaved gets fixed in `dev-stack.mjs` before proceeding (amend Task 2's understanding, new commit `fix: dev-stack doctor — <what>`).

---

## Task 4: The `doctor-nick` skill (InGame)

**Files:**
- Create: `C:\personal\InGame\.claude\skills\doctor-nick\SKILL.md`

- [ ] **Step 1: Create the skill with this exact content**

```markdown
---
name: doctor-nick
description: >-
  Doctor Nick owns the QA-workflow loop — the lessons ladder that keeps agents from burning time
  on dev-stack/preview friction. Use Doctor Nick whenever you START QA or verification against the
  running app (preview, screenshots for Parvati, integration-test runs), whenever you are BLOCKED
  by workflow failures rather than product bugs (server not responding, unknown server state,
  blank preview, CORS/login failures on web, port confusion), and at the WRAP-UP of any task that
  involved QA. Also triggers on "run doctor nick", "doctor", "why is the preview broken", "metro
  won't respond", "is the stack up". Do NOT use him for product bugs found BY QA (that is
  systematic-debugging's lane) or for judging the app's output (parvati/murr/burt own that).
---

# Doctor Nick — the QA lessons ladder ("Hi, everybody!")

QA workflow problems are cheap the second time IF the first time was captured. The ladder:
**capture instantly in prose → twice = automate → stable = law.**

- **Tier 1 — capture:** [`docs/qa-runbook.md`](../../../docs/qa-runbook.md) (Symptom → Diagnosis →
  Fix → Verified → Hits).
- **Tier 2 — automate:** `node scripts/dev-stack.mjs doctor` — read-only; probes every known
  failure signature, prints the exact fix. Never mutates; never touches :8081.
- **Tier 3 — law:** CLAUDE.md dev-stack invariants (:8081 is the phone lane; never `.env.local`;
  supertest-first; :4001 for destructive DB only).

## The three rules

1. **Preflight.** Before ANY preview/screenshot/browser/integration-test work:
   `node scripts/dev-stack.mjs up` then `node scripts/dev-stack.mjs doctor`. Green board before
   QA. Do not hand-build servers; do not use preview_start on :8082.
2. **Stuck rule.** Blocked on *workflow* (stack, ports, env, preview — NOT a product bug) for
   more than ~2 minutes → run `doctor` → check the runbook's Active lessons → only then
   investigate from scratch. Product bugs are exempt: that's real QA — use systematic-debugging.
3. **Retro rule.** The wrap-up receipt of every QA-involving task answers: **"Workflow friction
   this run?"** — Novel friction you solved → append a runbook entry (the format is in the
   runbook header) before ending the turn. Re-hit → increment **Hits** + update **Verified**.
   **Hits ≥ 2** and deterministically checkable → promote: add a `doctor` check in
   `scripts/dev-stack.mjs`, shrink the entry to a Promoted one-liner. A lesson that is really a
   standing environment invariant → propose a CLAUDE.md line to the owner (don't self-canonize).

## Boundaries

- Doctor Nick diagnoses the *workflow*; he never judges the *work* (parvati/burt/murr) and never
  fixes product code.
- `doctor` and this skill never kill Metro :8082 (cold start is expensive) and never act on :8081.
- Runbook entries need evidence — the actual symptom text and the verified fix, not a guess.
```

- [ ] **Step 2: Commit**

```powershell
git add .claude/skills/doctor-nick/SKILL.md
git commit -m @'
feat: doctor-nick skill — QA lessons-ladder enforcement (preflight/stuck/retro)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 5: CLAUDE.md — trim gotcha prose to invariants + pointer (InGame)

**Files:**
- Modify: `C:\personal\InGame\CLAUDE.md` (§ "The dev stack (how agents run & test the app — decision 0060)")

- [ ] **Step 1: Add `doctor` to the command block**

In the fenced block that shows `up` / `status`, add a third line:

```
node scripts/dev-stack.mjs doctor  # stuck? read-only diagnosis of known failure signatures + the exact fix
```

- [ ] **Step 2: Add the ladder pointer bullet**

Immediately after the command block's intro paragraph (before the existing bullets), add:

```markdown
- **QA workflow friction? `doctor` first, runbook second, investigation last** — and capture what
  you learn: the **doctor-nick** skill + [`docs/qa-runbook.md`](docs/qa-runbook.md) own the QA
  lessons ladder (decision 0065). Wrap-up receipts answer "workflow friction this run?".
```

- [ ] **Step 3: Trim the promoted lore**

Delete the final `Gotcha:` paragraph of the section (the blank-preview-tab / `scripts: 0` note) — it is now the doctor **web bundle** check + a runbook Promoted line. Leave every other bullet intact (they are invariants: :8081 phone lane, :8082 ownership, `.env.local` law, supertest-first, destructive-DB lane).

- [ ] **Step 4: Commit**

```powershell
git add CLAUDE.md
git commit -m @'
docs: CLAUDE.md dev-stack — doctor command + lessons-ladder pointer, trim promoted gotcha

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 6: Parvati preflight pointer (InGame)

**Files:**
- Modify: `C:\personal\InGame\.claude\skills\parvati\SKILL.md` (~line 72, the "She needs **screenshots**…" paragraph)

- [ ] **Step 1: Add the preflight sentence**

At the end of the paragraph that begins `She needs **screenshots of the built screen** as input` (after "…run her inline where the images are visible" / the visual-context note), append:

```markdown
Capturing them yourself? **Preflight first — never debug the preview from scratch:**
`node scripts/dev-stack.mjs up` then `doctor` (the **doctor-nick** skill owns that loop).
```

- [ ] **Step 2: Commit**

```powershell
git add .claude/skills/parvati/SKILL.md
git commit -m @'
docs: parvati — dev-stack preflight pointer to doctor-nick

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 7: Decision 0065 + health check (InGame)

**Files:**
- Create: `C:\personal\InGame\docs\decisions\0065-qa-lessons-ladder-doctor-nick.md`

- [ ] **Step 1: Create the decision doc**

```markdown
# 0065 — QA lessons ladder + Doctor Nick (qa-runbook · dev-stack doctor · skill)

**Status:** LOCKED · **Date:** 2026-07-05 · **Author:** Claude Code, owner-approved design
([`docs/planning/qa-lessons-ladder-design.md`](../planning/qa-lessons-ladder-design.md)) ·
**Rules:** how QA-workflow lessons are captured, promoted, and canonized; the doctor contract.

## Context

Agents (Parvati/Murr runs especially) burned time on QA *workflow* friction — unknown server
states, preview gotchas — with lessons living only as hand-curated CLAUDE.md prose and no loop to
improve. Owner directed: agents improve their QA process iteratively, in InGame and shipwright.

## Decisions

1. **The lessons ladder.** Capture instantly in [`docs/qa-runbook.md`](../qa-runbook.md)
   (Symptom → Diagnosis → Fix → Verified → Hits) → **twice = automate** into
   `node scripts/dev-stack.mjs doctor` → stable invariants become CLAUDE.md law (CLAUDE.md stays
   short; runbook + doctor absorb churn). Agents write the runbook directly, mid-task.
2. **The doctor contract.** `doctor` is **read-only** — diagnoses and prescribes, never mutates,
   never kills :8082, never acts on :8081. Exit 1 on blocking failures. Initial check set: db,
   api health, api CORS env (OQ-120), `.env.local` trap, metro :8082, bundle warmth, :8081
   report-only, orphan :4001.
3. **Enforcement = the `doctor-nick` skill** (preflight `up`+`doctor` · stuck rule: doctor →
   runbook → investigate · retro rule: receipts answer "workflow friction this run?"). Parvati's
   capture preflight points at it. Canonization (tier 3) is owner-gated; tiers 1–2 are not.
4. **Shipwright ships the generalized loop** (runbook template · `doctor-nick` skill · the
   `up/status/doctor` supervisor contract in starter-kit + lifecycle-playbook Stage 4).
5. **Deferred:** `doctor --fix` (YAGNI until prescriptions prove stable); any Metro-lane
   automation; runbook analytics beyond the in-file Hits counter.
```

- [ ] **Step 2: Run the health check**

Run: `node scripts/health-check.mjs`
Expected: no new red caused by this change (the runbook is intentionally NOT a registered spec doc — it's operational, like PROJECT-HEALTH.md). If the decision-traceability check flags 0065, satisfy it the same way sibling decisions do (see how 0062–0064 are referenced) rather than hand-editing PROJECT-HEALTH.md.

- [ ] **Step 3: Commit** (include `docs/PROJECT-HEALTH.md` only if the health run regenerated it)

```powershell
git add docs/decisions/0065-qa-lessons-ladder-doctor-nick.md docs/PROJECT-HEALTH.md
git commit -m @'
docs: decision 0065 — QA lessons ladder + Doctor Nick

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 8: Runbook template (shipwright)

All shipwright tasks run in `C:\personal\shipwright` (separate repo — use `git -C C:\personal\shipwright` or cd there).

**Files:**
- Create: `C:\personal\shipwright\starter-kit\docs\qa-runbook.md`

- [ ] **Step 1: Create the template** (placeholder-free on purpose — the starter-kit health check red-flags `{{…}}` in docs; this file works as-is for any project)

```markdown
# QA Runbook — the lessons ladder (tier 1: capture)

Workflow lessons for the QA/verify lane (dev servers, preview, screenshot capture, test running).
Owned by the **doctor-nick** skill. This file is operational (like HEALTH.md) — not a registered
spec doc; agents append directly, mid-task, zero ceremony.

**The ladder:** capture instantly here → **twice = automate** into the dev supervisor's `doctor`
verb → stable invariants become CLAUDE.md law. When stuck on *workflow* (not product bugs): run
`doctor` → check this file → only then investigate from scratch.

**Entry format** (append under Active lessons):

    ## <short symptom title>
    - **Symptom:** what you observed (error text, blank page, hang…)
    - **Diagnosis:** actual cause
    - **Fix:** exact commands / steps that resolved it
    - **Verified:** YYYY-MM-DD · **Hits:** 1

Re-hit an existing entry → increment **Hits**, update **Verified**. At **Hits ≥ 2** and
deterministically checkable → promote to a `doctor` check and shrink the entry to a one-liner
under Promoted.

---

## Active lessons

*(none yet — first agent to hit novel QA friction appends here)*

## Promoted (owned by `doctor`)

*(none yet — entries move here when a doctor check absorbs them)*

## Canonized (CLAUDE.md law)

*(none yet — standing environment invariants, promoted with owner approval)*
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\personal\shipwright add starter-kit/docs/qa-runbook.md
git -C C:\personal\shipwright commit -m "feat(starter-kit): qa-runbook template — QA lessons ladder tier 1"
```

---

## Task 9: Generalized `doctor-nick` skill (shipwright)

**Files:**
- Create: `C:\personal\shipwright\skills\doctor-nick\SKILL.md`

- [ ] **Step 1: Create the skill** — same three rules as InGame's, project-agnostic:

```markdown
---
name: doctor-nick
description: >-
  Doctor Nick owns the QA-workflow loop — the lessons ladder that keeps agents from burning time
  on dev-server/preview friction instead of doing QA. Use Doctor Nick whenever you START QA or
  verification against the running app (preview, screenshot capture for parvati, integration-test
  runs), whenever you are BLOCKED by workflow failures rather than product bugs (server not
  responding, unknown server state, blank preview, port confusion, env/CORS login failures), and
  at the WRAP-UP of any task that involved QA. Also triggers on "run doctor nick", "doctor", "why
  is the preview broken", "is the stack up". Do NOT use him for product bugs found BY QA (the
  debugging discipline's lane) or to judge the app's output (parvati/murr/burt own that).
---

# Doctor Nick — the QA lessons ladder

QA workflow problems are cheap the second time IF the first time was captured. The ladder:
**capture instantly in prose → twice = automate → stable = law.**

- **Tier 1 — capture:** `docs/qa-runbook.md` (Symptom → Diagnosis → Fix → Verified → Hits).
- **Tier 2 — automate:** the project's dev supervisor `doctor` verb (see CLAUDE.md Build/run) —
  read-only; probes every known failure signature, prints the exact fix, exit non-zero on
  blocking reds. Never mutates state.
- **Tier 3 — law:** CLAUDE.md environment invariants.

**The supervisor contract** (what the project must provide — see the starter-kit QA-loop
section): one supervisor script exposing `up` (idempotent ensure-everything), `status` (one-shot
health JSON), `doctor` (read-only diagnose + prescribe). If the project lacks a `doctor` verb
yet, building it is the first promotion (tier 2) this skill triggers.

## The three rules

1. **Preflight.** Before ANY preview/screenshot/browser/integration-test work: supervisor `up`
   then `doctor`. Green board before QA. Never hand-build parallel servers.
2. **Stuck rule.** Blocked on *workflow* (servers, ports, env, preview — NOT a product bug) for
   more than ~2 minutes → run `doctor` → check the runbook's Active lessons → only then
   investigate from scratch. Product bugs are exempt — that's real QA.
3. **Retro rule.** The wrap-up receipt of every QA-involving task answers: **"Workflow friction
   this run?"** — Novel friction you solved → append a runbook entry before ending the turn.
   Re-hit → increment **Hits** + update **Verified**. **Hits ≥ 2** and deterministically
   checkable → promote to a `doctor` check, shrink the entry to a Promoted one-liner. A standing
   environment invariant → propose a CLAUDE.md line to the owner (don't self-canonize).

## Boundaries

- Doctor Nick diagnoses the *workflow*; he never judges the *work* (parvati/burt/murr lanes) and
  never fixes product code.
- `doctor` never kills or restarts anything an owner lane depends on (each project's CLAUDE.md
  names its protected lanes).
- Runbook entries need evidence — the actual symptom text and the verified fix, not a guess.
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\personal\shipwright add skills/doctor-nick/SKILL.md
git -C C:\personal\shipwright commit -m "feat(skills): doctor-nick — QA lessons-ladder enforcement skill"
```

---

## Task 10: Starter-kit CLAUDE.md — the QA loop section (shipwright)

**Files:**
- Modify: `C:\personal\shipwright\starter-kit\CLAUDE.md` (insert after the "Every task: grounded, healthy, receipted" section, i.e. after line 65, before "## Design-phase workflow")

- [ ] **Step 1: Insert this section**

```markdown
## The QA loop (lessons ladder)

QA-workflow friction (dev servers, preview, ports, env) is captured and compounded, never
re-solved from scratch — the **doctor-nick** skill owns the loop:

1. **Preflight:** QA starts with the dev supervisor — `up` then `doctor` — green board before any
   preview/screenshot/test work.
2. **Stuck on workflow?** `doctor` → `docs/qa-runbook.md` → only then investigate. Product bugs
   are exempt (that's real QA).
3. **Retro:** task receipts answer "workflow friction this run?" — novel lessons are appended to
   the runbook; at **Hits ≥ 2** they're promoted into a `doctor` check; standing invariants
   become law in this file (owner-gated).

**The supervisor contract:** one standing script (e.g. `scripts/dev-stack.mjs`) exposing
`up` (idempotent ensure-everything: DB, API, client dev server, pre-warm), `status` (one-shot
health JSON), and `doctor` (**read-only** diagnose-and-prescribe over the known failure
signatures — never mutates, never touches owner-protected lanes). Build it with the first
runnable slice; grow `doctor` only by promotion from the runbook.
```

- [ ] **Step 2: Add the runbook row to the "Read this first" doc table** (after the "Project health" row):

```markdown
| QA workflow lessons (symptom → fix) | `docs/qa-runbook.md` — operational; agents append directly |
```

- [ ] **Step 3: Commit**

```powershell
git -C C:\personal\shipwright add starter-kit/CLAUDE.md
git -C C:\personal\shipwright commit -m "feat(starter-kit): CLAUDE.md QA-loop section — lessons ladder + supervisor contract"
```

---

## Task 11: Lifecycle-playbook Stage 4 guardrail (shipwright)

**Files:**
- Modify: `C:\personal\shipwright\starter-kit\lifecycle-playbook.md` (the Stage 4 **Guardrails** table row, line ~83)

- [ ] **Step 1: Extend the Guardrails cell**

Append to the existing Guardrails cell content (same table cell, before its closing `|`):

```
Per QA/verify session: **`doctor-nick`** — supervisor preflight (`up` + `doctor`), runbook-first when workflow-blocked, retro-capture new lessons (the QA lessons ladder).
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\personal\shipwright add starter-kit/lifecycle-playbook.md
git -C C:\personal\shipwright commit -m "docs(starter-kit): Stage 4 guardrails — doctor-nick QA loop"
```

---

## Task 12: Shipwright parvati pointer

**Files:**
- Modify: `C:\personal\shipwright\skills\parvati\SKILL.md` (~line 45, the "She needs **screenshots**…" paragraph)

- [ ] **Step 1: Append to that paragraph**

```markdown
Capturing them yourself? **Preflight first — never debug the preview from scratch:** the dev
supervisor's `up` then `doctor` (the **doctor-nick** skill owns that loop).
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\personal\shipwright add skills/parvati/SKILL.md
git -C C:\personal\shipwright commit -m "docs(skills): parvati — preflight pointer to doctor-nick"
```

---

## Task 13: skills/README.md — register doctor-nick (shipwright)

**Files:**
- Modify: `C:\personal\shipwright\skills\README.md`

- [ ] **Step 1: Read the README**, then insert a new section after the AC-spine section (after the paragraph that ends "…the agent offers the walkthrough unprompted.") and before "## The cognitive class":

```markdown
## The QA loop — doctor-nick

Neither a reviewer nor a cognitive skill: **doctor-nick** is the *process* skill for the QA lane.
Reviewers judge the work; doctor-nick keeps the *workflow to reach the work* cheap — the lessons
ladder (capture in `docs/qa-runbook.md` → **twice = automate** into the dev supervisor's
read-only `doctor` verb → stable invariants become CLAUDE.md law) plus three enforcement rules
(preflight `up`+`doctor` · doctor-then-runbook-then-investigate when workflow-blocked · a retro
line in every QA receipt). Parvati's screenshot-capture preflight points here; the supervisor
contract (`up`/`status`/`doctor`) lives in the starter-kit CLAUDE.md QA-loop section.
```

- [ ] **Step 2:** If the README opens with a skill index/table listing all skills, add a `doctor-nick` row/line to it matching its format (`skills/doctor-nick/` · the QA-workflow lessons ladder). If there is no such index, skip.

- [ ] **Step 3: Commit**

```powershell
git -C C:\personal\shipwright add skills/README.md
git -C C:\personal\shipwright commit -m "docs(skills): README — register doctor-nick (the QA loop)"
```

---

## Task 14: DECISIONS.md entry (shipwright)

**Files:**
- Modify: `C:\personal\shipwright\DECISIONS.md` (append at end of file)

- [ ] **Step 1: Append this section**

```markdown
# DECISIONS.md — doctor-nick + the QA lessons ladder (2026-07-05)

Generalized from InGame decision 0065, after agents there kept burning QA time on dev-server /
preview workflow friction with no capture loop.

## What I chose

- **The lessons ladder:** QA-workflow lessons graduate through tiers — captured in
  `docs/qa-runbook.md` (Symptom → Diagnosis → Fix → Verified → Hits, agents append directly),
  **promoted at Hits ≥ 2** into the dev supervisor's `doctor` verb (deterministic, read-only,
  prescribes the exact fix), **canonized** into CLAUDE.md only when they're standing environment
  invariants (owner-gated). CLAUDE.md stays short because the runbook + doctor absorb the churn.
- **Enforcement is a skill, not prose:** `skills/doctor-nick/` — preflight (`up` + `doctor`
  before any QA), the stuck rule (doctor → runbook → investigate), the retro rule (every QA
  receipt answers "workflow friction this run?"). Parvati's capture preflight points at it.
- **The supervisor contract is documented, not implemented:** the starter-kit specifies
  `up`/`status`/`doctor` (CLAUDE.md QA-loop section) but ships no supervisor code — stacks vary
  too much; InGame's `dev-stack.mjs` is the reference implementation.
- **The runbook is operational, not registered:** like HEALTH.md it carries no version/changelog
  and no 00-INDEX row — registering it would put append-mid-task friction on the exact loop that
  must be zero-ceremony.

## Deliberately deferred

- `doctor --fix` (auto-remediation) — YAGNI until prescriptions prove stable across projects.
- Runbook analytics beyond the in-file Hits counter.
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\personal\shipwright add DECISIONS.md
git -C C:\personal\shipwright commit -m "docs: DECISIONS — doctor-nick + QA lessons ladder rationale"
```

---

## Task 15: End-to-end dry run + receipt

**Files:** possibly `C:\personal\InGame\docs\qa-runbook.md` (if the dry run surfaces real friction).

- [ ] **Step 1: Dry-run the loop as a QA agent would**

Follow doctor-nick literally: `node scripts/dev-stack.mjs up` → `doctor` → load `http://localhost:8082` via the browser lane and confirm the app renders (visual check only — no product QA needed).

- [ ] **Step 2: Exercise the retro rule honestly** — if any workflow friction occurred during Step 1 that doctor/runbook didn't already cover, append a real Active-lessons entry (that's the loop working, not a failure) and commit it:

```powershell
git add docs/qa-runbook.md
git commit -m @'
docs: qa-runbook — first captured lesson from dry run

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

- [ ] **Step 3: Write the wrap-up receipt** per CLAUDE.md: files + IDs touched (decision 0065), assumptions made, what needs the owner's eyes (notably: the CLAUDE.md trim in Task 5 and the canonization owner-gate).
