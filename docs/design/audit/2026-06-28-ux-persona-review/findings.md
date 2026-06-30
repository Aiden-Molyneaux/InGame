# Findings — UX Persona Review (2026-06-28)

Consolidated from `sam.md` · `rex.md` · `pip.md` (20 converged boards + admin in-pass). Triaged
`[P]`=presentation (design-spec) `[B]`=behavior (spec/api → OQ candidate) `[A]`=accessibility. DS-token
conformance excluded (Burt). **Nothing here edits a spec or `open-questions.md` — OQ candidates are
staged for your batch triage.**

---

## A. Cross-persona convergence (two+ lenses agree — fix first)
1. **Editor commerce is pay-by-surprise.** Premium chips feel free, "CHARGED AT KEEP" (Sam+Rex; styler:652, device:777). No running total; no-fund/short OK. → running-cost meter; ECON tuning is OQ-002.
2. **Destructive social = one tap, no confirm.** UNFRIEND/BLOCK fire silent from the sheet (Rex; friends:653/656); Pip wants resolve-anim. Account-delete got a ConfirmSheet — social didn't. → pre-confirm, reuse `ConfirmSheet` (cf. OQ-061).
3. **Self-reported HOURS is unguarded** (Rex; game-page:554) and **never re-rendered live** (Pip; :488). One field feeds compare/Top-5/achievements/store earned-only. → cap/anomaly-flag + field morph.
4. **Welcome front door buried** (Sam; welcome:442) and **frozen** (Pip; :445/:82). Returning user scrolls past hero; locked nav is a silent dead zone.
5. **Empties/skeletons are inviting but static** — strong copy, no motion; reduce-motion absent everywhere (Pip).

## B. Already owned — do NOT re-log
- a11y non-hold buy path → **OQ-046**. · Card-delete + ConfirmSheet grammar → **OQ-061**. · Celebration/reveal pattern → **OQ-040**. · Secret-tier presentation → **OQ-005 (resolved)** / tiers **OQ-082**. · Economy starting values → **OQ-002**. · Admin remediation → **OQ-081**. · Invite-token dup-ADD → **OQ-073**. · Self-view staff tier (ADMIN II) is **by-design PROF-09**, not a bug — Sam's confusion = ratify whether tier roman numerals belong self-only.

## C. Behavior backlog — staged OQ candidates
| # | Sev | Screen | Gap | Suggested fix | IDs |
|---|---|---|---|---|---|
| OQ-086 | major | game-page:554 | HOURS free numeric, no cap → fake-stat farming across 4 systems | sanity-cap + anomaly pending-review state | COL-03, SOC-03, ACH, store earned-only |
| OQ-087 | major | store:1292 | refund→keep permanents→negative balance = free cosmetics | item lock/clawback on reversal | ECON-09 |
| OQ-088 | major | report:514 | no per-reporter cap → report-bomb soft-hides rivals | reporter rate-limit + dedupe | MOD-01/02 |
| OQ-089 | major | add-game:1125 | CREATE ANYWAY one-tap, no creation rate-limit | cap creates/day + soft-queue | CAT-03, MOD-05 |
| OQ-090 | major | friends:653/656 | silent UNFRIEND/BLOCK, no pre-confirm | ConfirmSheet (cf. OQ-061) | SOC-08/09 |
| OQ-091 | minor | store:752 | no spend idempotency → mid-grant drop double-spends | "processing"/receipt-dedupe state | ECON-06 |
| OQ-092 | minor | store:605 | daily +1 no clock guard | server-time gate | ECON-02 |
| OQ-093 | minor | welcome:595/633 | username/email enumeration oracle | throttle + neutral copy | AUTH-11, MOD-07 |
| OQ-094 | minor | faf:560 | invite token no expiry/cap | TTL + cap + spent state | SOC-10 |
| OQ-095 | minor | discover/store | Up Next + adopt PX uncapped | length cap + adopt confirm | WTP, ECON-03 |

## D. Presentation backlog (design-spec follow-ups)
- Welcome returning-user sign-in above hero (welcome:442). · Drop spec IDs from UI copy (styler:493). · Editor running-cost meter (styler:652). · Friends cold-start lead with connect, not empty feed (friends:614). · Sentence-case errors (welcome:644). · Tool-bar labels until learned (collection:477). · Locked-nav "sign in to use" affordance (welcome:82). · Lock "RETURNS WITH DROP" timing/notify (store:1349). · Fresh-profile CTA priority (profile:713). · Contributor-vs-Profile differentiation copy (contributor:319).

## E. Motion roster (Pip — needs a system, not 17 one-offs)
Welcome fan/count-up · onboarding rail+finale · collection peek-flip+insert · add-game fan/restack+confirm · **styler redraw+KEEP** · canvas beat timing · game-page edit-morph/tabs · device crossfade/sticker-snap · discover toggle/reorder · compare bar-grow · store hold-ring/daily tick · achievements rays/cascade · now-playing pulse. Skeletons all static.

## F. A11y must-fixes (cross-cut)
No `prefers-reduced-motion` anywhere · gesture-only reorder no fallback (discover/lists) · color-only status (compare:313, friends:311) · 2 ARIA labels/20 files; icon keys + tabs/toggles unlabelled · locked NavBand silent · ratings no numeric SR.

---

## Prioritized plan
**P0 — guards (spec, blocks economy/mod build):** OQ-086 hours-cap, OQ-087 refund-clawback, OQ-088 report-bomb, OQ-090 social-confirm. Triage as a batch.
**P1 — quick presentation wins:** sign-in above hero, running-cost meter, sentence-case errors, drop ID leaks, friends cold-start, tool labels.
**P2 — motion system:** one `prefers-reduced-motion` contract + tokens, then styler-redraw & celebration first.
**P3 — a11y pass:** non-gesture reorder, ARIA/role sweep, color+label, NavBand feedback.

**Next:** owner accepts OQ-086..095 into `open-questions.md`; presentation items batch into a design-spec pass; motion/a11y become their own tracks.
