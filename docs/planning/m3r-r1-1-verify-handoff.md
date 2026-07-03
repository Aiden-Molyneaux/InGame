# M3-R · R1-1 hand-off — Collection VERIFICATION LANE (Fable session)

> **Paste-once brief for the VERIFIER (Fable, Claude Code, this repo).** An Opus builder session
> has executed [`m3r-r1-1-handoff.md`](m3r-r1-1-handoff.md) (the Collection manifest + the S3
> fidelity fixes). You are the independent verification lane in a builder≠verifier pipeline. The
> prior Fable session has NOT seen the builder's output — you come to it cold, which is the
> point. **Treat every claim in the builder's receipt as a claim to audit, not a fact.** Your
> output is the FIRST-ARTICLE PACKET for the owner's hard-stop review — the run where the owner
> judges both the screen AND whether the new pipeline catches what M3 missed (M1–M3 shipped at
> ~6/10 mockup fidelity; the root causes and the plan are in `m3r-build-task.md`'s header and
> the memory note "Milestone build history").

## Inputs (fixed paths — verify they exist before starting; missing = bounce to the owner)
- `docs/planning/m3r/collection-manifest.md` — the builder's manifest (Task 1).
- `docs/planning/m3r/r1-1-receipt.md` — the builder's fix ledger (Task 3 deliverable).
- The code: **uncommitted working tree on `m3`** — the R1-1 diff is `git diff HEAD` (+
  untracked files). Committed history through HEAD is pre-builder (R0 checkpoint `27e565a` +
  this handoff doc); everything uncommitted is the builder's.
- Authorities: `m3r-build-task.md` (§0 locked decisions · §1 pipeline · §3 R1-1 items) ·
  `docs/design/mockups/collection/collection-states.html` (the canonical board) ·
  `docs/planning/m3-walkthrough-iteration-notes.md` (Step 3) · `docs/design/component-map.md` ·
  `CONVENTIONS.md` · `CLAUDE.md` §"browser-verification loop" (the web-loop recipe — follow it
  exactly, especially the **never-restart-:4000** rule and the mandatory cleanup).

## The lane, in order (do not reorder — each step feeds the next)

**1. Manifest spot-audit (trust-but-verify the extraction).** Sample ≥8 manifest rows across ≥4
states (include at least: one GameCard size row · the tools bar · the count chip · one lifecycle
state · one EXPECTED(deferred) row · one LOCKED(§0.n) row). For each, open
`collection-states.html` at the cited line and confirm the row states what the board states. A
row without a citation, or with a citation that doesn't support it, is a finding. Then the
completeness pass: walk the board's artboards — is any drawn state or salient element MISSING
from the manifest entirely? (The manifest being wrong quietly poisons parvati's step 1 — this
audit is what makes her enumeration trustworthy.)

**2. §0 no-regression grep.** For each locked decision (`m3r-build-task.md` §0.1–.11): confirm
the diff did NOT "fix" it — the kept register form, the accepted orange drawer, the count-chip
copy exactly as ruled, S4-g focus-only, S5-b hidden, S6-a untouched, §0.11 drawer-not-blocking-
nav preserved. LOCKED manifest rows make this fast.

**3. murr — fresh-context agent (never inline).** Spawn a general-purpose agent: "Read
C:\personal\shipwright\skills\murr\SKILL.md and execute it exactly" over `git diff HEAD` +
untracked, scope = the R1-1 files only. Feed him: the spec IDs (S3-* items), the R0 components
he already knows (KeyboardLift/PulledSheet — audited SOUND at R0; only NEW usage of them is in
scope), and the anti-rubber-stamp law (verdict must enumerate probed surfaces). Attack surfaces
to name for him: the sort-direction fold (S3-h/i) state logic · the filter-pip active predicate
(S3-k) · the "All"-option semantics (S3-f/g — clears the set, selected-when-empty) · the
count-chip singular/filtered branches (S3-j) · log-hours pre-fill vs the save-guard (S3-m — the
empty-wipe protection must survive) · any bespoke component where a component-map name exists.

**4. parvati — fresh-context agent, against the manifest.** Spawn her with
`.claude/skills/parvati/SKILL.md` (the repo copy — it carries the positional law + M3-R
calibration): her step-1 enumeration IS the (spot-audited) manifest — never improvised; she
captures her OWN screenshots from Expo web at ~390×844 (the CLAUDE.md web-loop recipe; demo
login `demo@ingame.app` / `InGameDemo1!`; exercise every view mode, the drawer, both "All"
options, filtered+unfiltered+singular count, log-hours); **divergence-from-board = 🚩 FLAG**
(EXPECTED needs the manifest's cite). Her verdict table is APPENDED to
`docs/planning/m3-review-notes.md`.

**5. Findings routing.** Cross-check murr + parvati findings against the builder's own
Declared-gaps section (a declared gap is not a surprise; an UNdeclared miss is a process
finding, note it for the packet). Then: **small, mechanical fixes → apply yourself, then re-run
the affected verifier** (murr delta re-verify via a message to the same agent; parvati re-check
of the touched rows). **Structural misses (a wrong interaction model, a missing element class)
→ do NOT fix**: write `docs/planning/m3r/r1-1-fixlist.md` (finding · manifest line · severity)
for a builder round, and say so in the packet. Loop until 0 open flags or the fixlist is the
honest state.

**6. The first-article packet → HARD STOP.** Write `docs/planning/m3r/r1-1-first-article.md`:
- Verdict line: manifest-audit result · murr verdict · parvati flags/expected/polish counts ·
  §0 check · declared-vs-found delta (the process-health signal).
- What the owner should look at on the DEVICE (Expo Go): the S3 items as "do X → expect Y" steps
  + the R0 native probes from `m3r-build-task.md` §4 (they ride this same device sitting).
- **Process verdict**: did the pipeline catch what it should have BEFORE you? (The owner is
  calibrating the machine, not just the screen — say plainly what leaked through to your lane
  and what that implies for R1-2..R1-5.)
Then commit + push (the owner's standing directive): docs and code in separate commits, IDs
cited, push `m3` via the personal-token one-shot (memory: "Push credential recovery" — never
`gh auth switch`). **Then STOP — the owner reviews the packet alone before R1-2 begins.**

## Boundaries
- Never restart the owner's :4000 API or touch Metro :8081 (his phone loop). Parallel :4001 +
  `.env.local` per CLAUDE.md; cleanup mandatory.
- You verify and (narrowly) repair — you do not extend scope, redesign, or start R1-2.
- Parvati/murr report; a behavior/spec gap goes to `docs/open-questions.md`, not into code.
- If the working tree contains work that is clearly NOT R1-1 (another session's files), stage
  only your paths and flag the rest — never sweep-commit (memory: "Parallel session commits").
