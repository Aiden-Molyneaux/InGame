# InGame UX persona loop — Claude Code iteration prompt

Paste this as the loop body. Runs every ~15 min for 2h (≈8 iterations). Each iteration is
**standalone** (fresh context) but **accretive**: it reseeds 3 persona agents, then reconciles their
notes into one growing ledger — raising agreement/sentiment, sharpening fixes, adding new finds —
never just re-generating. The signal is the convergence ACROSS runs.

---

## MISSION
Audit the InGame UI mockups (`docs/design/mockups/**`) from three personas, then merge into a single
ranked ledger of takeaways, critiques, and recommendations — each with a concrete solution. Stay
ABOVE design-system tokens (type-scale/gold/pip/radius/font are Burt's; skip them). Make NO edits to
specs or `open-questions.md` — write only inside `docs/design/audit/2026-06-28-ux-persona-review/`.

## STEP 0 — orient (read first)
- `findings.md`, `recommendations.md` (prior verdicts), `LEDGER.md` (if absent, create from findings.md).
- `LEDGER.md` line tail `## RUNLOG` for the iteration count; STOP if count ≥ 8.
- `docs/open-questions.md` (dedup; tag existing as `known OQ-0xx`). Catalog Foundation Rules = out of scope.

## STEP 1 — run 3 personas IN PARALLEL (explore agents, very thorough)
Same 20 boards + admin in IA order: welcome-auth · onboarding · collection(+h2-underlay) · add-game ·
styler · canvas · game-page · device · discover · friends · find-add-friends · compare · lists · store ·
profile · contributor · achievements · settings · report · admin-console. Each note: `[P|B|A] [maj|min] screen — point (file:line) → fix`.
- **Sam (average/low-freq):** opens monthly, half-remembers it, only obvious jobs. Happy path, re-learnability, empties, payoff speed, microcopy. Confusion/dead-clicks. No token nits.
- **Rex (adversarial+impatient):** double-tap/spam, network drops, caps/cooldowns, hostile content, economy/privacy/mod exploits, dead-ends + missing guards. Lives in error/offline/cap/confirm states.
- **Pip (perfectionist):** micro-interaction, transitions, MISSING animations, a11y (reduce-motion/contrast/SR/non-gesture), hierarchy, consistency, tone. Names absent motion. NOT Burt's token audit.

## STEP 2 — reconcile into LEDGER.md (the real work)
For every point, upsert one row keyed by `screen+gap`:
`ID | screen:file:line | persona(s) | gap | sentiment(−2..+2) | verdict | recommendation | first-seen→last-seen run`
- **Agreement:** if ≥2 personas or ≥2 runs hit it, mark `★` (priority signal). New this run = `NEW`.
- **Sentiment:** −2 blocker … +2 delight; track shifts. **Dedup** near-identical wording; keep tightest fix.
- **Verdict:** ADOPT · QUICK · OQ-0xx · DEFER · RATIFY · DROP. Behavior → propose next free OQ-NNN. Don't churn settled verdicts unless evidence changed; note flips in RUNLOG.

## STEP 3 — emit + log
Rewrite `LEDGER.md` (ranked: ★ agreement, then sentiment, then sev). Append RUNLOG line: `run N · date · agents · new=X dedup=Y flips=Z · top regret`. STOP at 8. Don't touch specs/OQ.

## GUARDRAILS
Evidence = real file:line. 0 spec/OQ edits. Skip DS tokens. Converge, don't bloat — fewer/sharper rows beats more. 5 quick-wins shippable + P0 guards (hours-cap/refund/report-bomb/create-limit) visible up top.
