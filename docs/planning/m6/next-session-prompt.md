# Next-session handoff prompt (paste into a fresh InGame session) — 2026-07-19

> Copy everything in the code block below into a new session. It tells the new session to orient
> first, show me where we are, and wait for my direction before executing.

```
You are the Fable-5–style orchestrator on InGame (C:\personal\InGame, branch `m6`), picking up a
two-day build wave. Do NOT start building yet. Your FIRST job is to orient and report, then wait for me.

STEP 1 — GROUND YOURSELF (read, then reconcile against reality):
- Read: CLAUDE.md, docs/00-INDEX.md, and these M6 planning docs (the live state):
  docs/planning/m6/SESSION-HANDOFF.md, beta-feature-wave.md (§A the packet table, §E the sign-off),
  review-coverage.md (the Murr/Parvati coverage matrix), walk2-notes.md (the per-note ledger),
  and docs/open-questions.md (Open section — OQ-153..158 are the live ones).
- Reconcile with git: `git log --oneline -20`, `git status`. Check whether a code-fix commit
  (Profile contributions teaser → published count "5"; ADD-TO-COLLECTION → gold; "1 FRIEND HAS IT"
  grammar; Discover queue nested-<button> fix) has landed on top of `b9e72a2`. If it's uncommitted
  or unpushed, that's your FIRST action: run the combined verify (`npm run typecheck`,
  `npm -w @ingame/mobile test`, `npm run test:integration`) and push it.

STEP 2 — TELL ME WHERE WE ARE, then STOP and ask for direction. Present:
(a) M6 status: the milestone is Social + the beta launch (beta ships at M6 exit). ALL buildable M6
    packets are DONE and both quality gates just closed: Murr (code) — whole wave audited, 2 highs +
    2 meds fixed and independently re-verified closed; Parvati (screens) — full 8-screen sweep, clean
    pass, one flag (the teaser count) being fixed. Tree is green (typecheck · unit 269 · mobile 676 ·
    integration 518) and pushed. The browser/Parvati wedge was root-caused (dev-DB migration drift →
    API down) and fixed; a dev-DB durability net is in place (see below).
(b) WHAT'S LEFT (verify against beta-feature-wave.md §A — don't trust this list blindly):
    - Remaining wave BUILDS: the auth CLIENT screens (W-2 forgot-password: email→6-digit-code→new-
      password; W-3 Sign-in-with-Apple button + the choose-username completion — the SERVERS are built,
      per docs/planning/m6/auth-epic-manifest.md; SIWA only *verifies* on the first EAS build) and
      W-5 Ultimate colour-cosmetics (build from ultimate-cosmetics-draft.md — owner-nodded: mint
      SEPARATE ultimate SKUs, 10-PX tier, gold ULTIMATE badge; near-zero schema per the draft).
    - The OWNER SITTING batch (~30–40 min, me + you): G-D re-fire demo · §1-GO ratify · ACH no-farm
      demo · G-K nods (rate buckets · 49-PX set · fuzzy search) · the legal/E decision (a store
      SUBMISSION BLOCKER) · the email sending-domain setup (W-2, pairs with Cloudflare) · W-7
      RevenueCat Android + G-J + sandbox (now UNBLOCKED — Play verified + Android device in hand).
      (The W-5/W-6 design nods are already DONE.)
    - The BETA EXIT lane (P15/P16): R2/Cloudflare + API host + managed Postgres (G-C — also the
      permanent fix for the card-durability risk below) · real ToS/Privacy copy on a domain (E) ·
      EAS builds → TestFlight (iOS) + Play internal testing (Android) → the close-friends alpha wave.
    - Open follow-ups (non-blocking): OQ-153 (friend-read repo full-row select, defense-in-depth) ·
      OQ-156 (self-profile ~12-query assembly, perf) · OQ-157 (secret-mask id-correlation, owner-call)
      · OQ-158 (fuzzy-search prefix-ranking cliff + N+1, beta-fine) · the smoke-test junk RECURRENCE
      (smoke tests wrote junk games to the dev DB — check if it recurs) · seed gaps: no seeded user has
      a forged avatarConfig and no card is adopted-from-another-designer, so the W-4 list-row monogram
      colour and the W-A1 adopted-card-artist fix are code-confirmed but visually unverified (a richer
      demo seed closes both) · two owner-option polish items ("H" vs "HRS" unit; the pin's kept ▶NOW).
(c) RECOMMENDED next step (one line + why), and note I may redirect.

STEP 3 — After I answer, proceed. Standing rules while you do:
- Git identity is the PERSONAL account. Push over HTTPS with:
  GIT_TERMINAL_PROMPT=0 git push https://Aiden-Molyneaux:$(gh auth token -u Aiden-Molyneaux)@github.com/Aiden-Molyneaux/InGame.git m6:m6
  Explicit-pathspec commits; end commit messages with a Co-Authored-By trailer.
- Dev stack + QA: `node scripts/dev-stack.mjs up` then `doctor` (green board first; the doctor now
  has a migration-drift probe — if it flags, run the db:migrate it prints). Prefer supertest
  integration over the browser.
- Parvati / screenshots: use **claude-in-chrome** at http://localhost:8082 (NOT the Claude_Browser
  preview pane — its screenshot renderer is broken here), and **wait ~3–4s per screen to settle**
  before screenshot. Demo login demo@ingame.app / InGameDemo1!. (qa-runbook has the recipe.)
- DB DURABILITY (I care about my real designed cards, which live only in the local docker volume):
  `npm -w @ingame/api run db:backup` dumps local_ingame to ~/ingame-db-backups (keeps 20); `db:reset`
  now auto-backs-up first; NEVER hard-drop/reset local_ingame without a fresh backup. Managed PG (G-C)
  is the permanent fix. I may also want a scheduled daily backup — ask.
- Models: opus-4.8 for user-facing / hard / reviews; sonnet for mechanical; fable for the hardest —
  BUT fable hit its usage limit last session, so prefer opus/sonnet unless fable is confirmed available.
  Builder ≠ verifier; combined verify before push; run Murr on new code and Parvati on new screens.
- Ask before large scope; I like to be shown the plan and steer. Ultracode may be on — if so, lean on
  Workflow for substantive multi-agent work, but keep me in the loop between phases.
```
