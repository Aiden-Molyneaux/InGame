# R3 — Stable-ID & Truth-Precedence

**Audit:** Design-Documentation Audit (see [`00-PLAN.md`](00-PLAN.md)) · **Run:** 2026-06-13 ·
**Audited against:** working tree at `8f0c7a1` · **Mode:** report-only

## Coverage
Three parallel read-only sweeps, each verified by hand before write-up:
1. **ID resolution** — every stable ID cited in the design layer (`design-spec`, `ui-design-requirements`,
   `SCREEN-STATUS`) checked against the **owner**, `product-spec.md`, with api-contract/decisions as the
   secondary tier.
2. **Truth-precedence + restatement** — the design layer's behavioral assertions (caps, enums, defaults,
   gating, payload shapes, counts) diffed against product-spec (behavior) and api-contract (shapes), per
   00-INDEX §2.
3. **OQ lifecycle** — every `OQ-NNN`'s status in `open-questions.md` vs every "resolved" claim made
   elsewhere (SCREEN-STATUS, design-spec §2.8 + changelog, decisions).

**Verified clean (the bulk of R3):**
- **The design↔spec ID seam is fully closed.** product-spec defines ~88 stable IDs; every distinct ID the
  design layer cites resolves to a product-spec definition. **Zero** unresolved IDs, **zero** ripple-gaps,
  **zero** malformed prefixes. The four decision-introduced IDs most at risk — **CARD-22** (`product-spec:176`),
  **SOC-11** (`:222`), **COL-11** (`:146`), **SYS-11** (`:92`) — all rippled up to the owner doc with matching
  changelog lines. The §4 "edit the owning doc first" rule is holding.
- **No behavioral contradictions across the high-risk domains** *except* R3-F01: caps (CARD-15 element cap = 30),
  enums (report targets, queue `source`, nameplate options, cosmetic taxonomy), defaults (daily +1 PX,
  hold-to-buy), gating (SYS-10 offline writes-gate, CARD-13 reconcile, PROF-03 privacy, MOD-09 non-disclosure),
  and payload shapes (CARD-22 `equipped`) were all checked and align. (One deliberately **not** flagged: the
  Wallet ledger *example* list at `design-spec:138` names 6 of 7 ledger types — but it's an illustrative
  composition note, not a normative enum; the authoritative enum is api-contract's. Not a contradiction.)
- **OQ classes (b) phantom resolutions, (c) dangling cites, (d) inverse — all empty.** Every "resolved-by
  decision N" pointer actually addresses its OQ; every `OQ-NNN` referenced tree-wide exists in the inbox.

---

## Findings

### R3-F01 — design-spec §2.2 Profile friend-view composes "Share"; the spec forbids it · **Critical**
- **Design claim** — `design-spec.md:132` (§2.2 Profile → Friend-view):
  > "**Friend-view (PROF-05, decision 0012):** adds friend count + mutual friends, `KeycapButton/action-alt`
  > ADD FRIEND + COMPARE, **Share**, overflow Report/Block; …"
- **Owning-doc truth** — `product-spec.md:115` (PROF-05):
  > "**Share** (SOC-07 invite link — **self-view only**; **friend-view offers no share, decision 0019**) … "
  - Corroborated by api-contract (`/me/invites` = the self-Profile SHARE chip; "Friend-profile SHARE has no
    backing → OQ-052"), product-spec changelog ("PROF-05 Share is self-only, friend-view chip cut, OQ-052"),
    and `open-questions.md` (OQ-052 resolved). The **sibling design doc already agrees** —
    `ui-design-requirements.md` §3.5 reads "has **no Share** … decision 0019."
- **Why it's a breach:** which actions a friend-view Profile exposes is a **behavioral rule owned by
  product-spec** (00-INDEX §2: behavior → product-spec wins). PROF-05 now **explicitly removes** the
  friend-view Share (decision 0019 / OQ-052); design-spec §2.2 still composes it. design-spec is the lone
  straggler — line 132 is the file's only "Share" mention, and its §2.2 changelog never recorded the OQ-052
  ripple.
- **Impact:** a build composing the Profile friend-view from design-spec would add a **Share affordance the
  product removed and for which the contract states there is no backing** → wrong implementation / rework.
  This sits on a **converged, Design-spec-✅ page** — i.e. inside the formalized design truth, not a draft —
  which is what makes it Critical rather than a draft slip. (It's still a one-line fix.)
- **Suggested fix — lane (b) design-doc correction (NOT a spec-change-request):** the spec is already
  correct; design-spec is catching up. Strike "Share" from `design-spec.md:132` (friend-view exposes ADD
  FRIEND · COMPARE · overflow Report/Block — Share is self-view only), and add an OQ-052 patch note to the
  design-spec changelog, matching ui-design-requirements §3.5.

### R3-F02 — OQ-007 (diegetic break-out) is a resolved-OQ leak — three docs disagree · **Medium**
- **"Resolved" claim** — `SCREEN-STATUS.md:16`:
  > "🎉 The 0014 editor arc is COMPLETE … **OQ-007 (breakout) + OQ-040 (first-print ritual) resolved
  > design-side** in the Canvas board." (also `:37`, `:12`)
- **Still open in the inbox** — `open-questions.md:34`, under the `## Open` section (`:17`): the OQ-007 entry
  carries an inline "**RESOLVED (canvas converge, design-side 2026-06-13): the DIEGETIC breakout.**" (`:39`)
  but ends "**Spec-owner: move to `decisions/` … if a formal record is wanted**" (`:43`) — the §4 Step-3 move
  out of the inbox never happened.
- **Also still "open" in design-spec** — `design-spec.md:169` (§2.8 OQ traceability):
  > "**Still open** … **OQ-007** (break-out → Card editor) · …"
- **Why it's a leak:** the design-side answer genuinely exists (`canvas/canvas-states.html` P1–P2), so nothing
  is blocked — but three docs now disagree on the item's lifecycle state, and the `decisions/` record the
  inbox itself invites was never created.
- **Impact:** bounded inbox-hygiene drift; a reader triaging `## Open` sees a question that's actually answered.
- **Suggested fix — lane (a) doc-hygiene:** complete §4 Step-3 — relocate OQ-007 from `## Open` to `## Resolved`
  (or into a `decisions/` editor-arc record), and drop it from design-spec §2.8's "Still open" list.

### R3-F03 — OQ-040 (first-print "moments" ritual) is a resolved-OQ leak · **Medium**
- **"Resolved" claim** — `SCREEN-STATUS.md:16` / `:37` (same line as F02: "OQ-007 + OQ-040 resolved design-side").
- **Still open in the inbox** — `open-questions.md:47`, under `## Open`: the OQ-040 entry is inline-tagged
  "RESOLVED (canvas converge, design-side 2026-06-13)" and ends "**Spec-owner: fold into the editor-arc
  decision if wanted**" — never moved out. (design-spec §2.8 is silent on OQ-040, so this is a two-doc
  disagreement, marginally milder than F02.)
- **Impact / fix — lane (a) doc-hygiene:** same as F02 — relocate OQ-040 to `## Resolved` / a `decisions/`
  record per §4 Step-3.

---

## Cross-report pattern (worth the owner's eye)
R3-F02/F03 share a root cause with **R1-F01–F04**: the §4 protocol's *downstream bookkeeping steps get skipped
at converge/bump time.* R1 found the 00-INDEX version register wasn't rippled on a version bump (now fixed —
you added it to the §4 checklist in `a4d93d9`). R3 finds the **Canvas converge** updated SCREEN-STATUS but
skipped OQ Step-3 (relocate resolved OQs + update design-spec §2.8). **Same fix shape:** the converge/resolve
checklist should explicitly include "complete OQ Step-3 — move resolved OQs out of `## Open` and refresh
design-spec §2.8 traceability." One checklist item retires this whole class, exactly as the register fix did.

## Summary
**1 Critical · 2 Medium.** The Critical (R3-F01) is the find the precedence rules exist to catch — a converged,
formalized design page contradicting the spec on a behavioral affordance (friend-view Share, removed by decision
0019). The two Mediums are resolved-OQ leaks from the Canvas converge, fixable as pure bookkeeping. Everything
else is **verified clean**: the ID seam is fully closed and no other behavioral domain contradicts its owner —
a strong result for a system this size. The recurring theme across R1+R3 is that the protocol's *downstream*
steps need checklisting, not the *decisions* themselves.
