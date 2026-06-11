# 0014 — The Add Game design arc: card step, editor postures, ordering & iteration

- **Date:** 2026-06-11
- **Status:** accepted
- **Related IDs:** presentation/process-only — no product-spec or api-contract change. Interprets
  design-req 4.1/4.3; ripples `design-process.md` (Phase D order + iteration rule) and
  `open-questions.md` (+OQ-039; OQ-007 rescoped). References CARD-13/14/15/16/18/19/20,
  COSM-01/02/03, ECON-01/07, COL-06, OQ-035.
- **Source:** owner brainstorm before Phase D screen #1 (Add Game), 2026-06-11 — resolved card-step
  depth, customization architecture, design ordering, spatial policy, and the iteration model.

## The card step offers a quick-style tier (4.1's "offered, not forced" step, made concrete)
When adding a game, the card step offers: **adopt** a community card · **quick-style** on a system
base · **skip** → the CARD-18 default. Rationale: the strongest first-add payoff ("every session
pays off fast"), and it pulls the **closed-attribute taxonomy** forward — the feeder for the store
and achievement reward models the owner wants settled early.

## Customization architecture: one editor, two postures
Owner's framing, adopted: customization has **two forms** — **closed/curated attributes** (frame ·
effect · finish · title styling) and the **open-ended graphic** (the vector composition). These map
exactly onto existing structure: closed = the card's outer layers = bucket ③ of 4.3's three-bucket
model, entitle-able via COSM-01/03 (why ECON-01 has two spend types); open-ended = base + vector
elements (CARD-02's no-uploads/no-AI guard). The architecture expresses the split as **one surface
(the Card editor) in two postures**:

- **Styler (in-frame):** the closed attributes worked around the persistent card hero. **Start-from
  is never blank and never community-dependent** — system-supplied bases (templates / preset kits
  from the free baseline COSM-02 · auto-design "Surprise me", CARD-16) open already-composed even
  for a game's first-ever card; an empty community only empties the *adopt* door (→ the "be first"
  hook, 4.1). Premium **preview-then-acquire** (CARD-13) + the **currency counter** (ECON-07) live
  here. **Outcome = keep / save-private. Publishing is canvas-tier** (owner call): the Publish
  action surfaces only in the Canvas posture — placement only, CARD-04 unchanged — which also keeps
  pure-template quick-styles out of the adoptable pool (the CARD-19 minimum-complexity instinct).
  The Styler's control surface is decided by stage-2's divergent drafts (mandated: ≥1 **carousel**
  treatment; the sheet family is another natural candidate).
- **Canvas (breakout):** the open-ended composition — layers, precision, asset library, the publish
  pipeline (CARD-15/19/20). CARD-16's "may **break out** to maximal canvas" is read literally:
  **breakout is a state the editor enters**, and the posture seam *is* the two-form seam — closed
  attributes inside the device frame, "entering the workshop" for open-ended art.

**Rejected:** *two separate surfaces* (permanent two-surface consistency burden, a go-deeper handoff
to design, near-certain bucket-③ duplication, strains the single-editor framing — retained as the
fallback if Styler iteration shows editor constraints hurting the 30-second case; stages 1–2 are
identical either way, so switching is cheap until stage 3). *Editor-first ordering* (inverts
coverage-driven Phase D; the editor is the screen that most benefits from the kit existing first).

## The three-stage order + the contracts between stages
1. **Add Game flow** (in-frame takeover): catalog search/results, create-entry + fuzzy dedup,
   all-status picker, Add & continue multi-add, report-duplicate, and the **card-step junction**
   (adopt · style · skip). The Styler behind "style" is stubbed. **Coverage win** (why it's first):
   TextField · pickers/dropdowns (genre multi-select, status, date) · SearchBar · ResultRow ·
   InlineBanner — plus the first live use of the OQ-035 keyboard treatment. **Contract:** hands the
   Styler *(game, **optional** preselected base)* — e.g. a gallery card tapped as "use as base" =
   adopt-then-edit; with none, the Styler opens on its own start-from rail — → receives *a selected
   card*; skip always completes (CARD-18), so stage 1 is shippable even if stage 2 slips.
2. **Styler posture:** completes the card step end-to-end; **finalizes the closed-attribute
   taxonomy** (OQ-039 answered here); designs the economy UI once (reconcile, buy-at-intent,
   currency counter — unblocking Store later). **Contract:** "edit art" hands *the composition* on.
3. **Canvas posture:** the editor's own focused iteration (per the process doc) — and **OQ-007 is
   resolved here**, where the breakout has its real test case.

The junction component doubles as the Game page's **card switcher** entry (COL-06) — designed once.

## Spatial policy — three named tiers, breakout lands once
**sheet** (exists — sort/filter) · **takeover** (new in stage 1: a flow occupies the screen content
with its own header/back; **the frame stays**) · **breakout** (stage 3 only: the frame yields to
maximal canvas). Add Game = takeover · Styler = takeover (+sheets/carousel per drafts) · Canvas =
breakout. The owner's "either Add Game or Customize must break out" resolved to **neither** — only
the Canvas posture, so the breakout design overhead lands once, late, with the screen that needs it.

## Iteration model — multi-draft divergence on novel surfaces (standing process rule)
Owner direction: **when a novel page/asset comes up for design, prompt the owner: multiple distinct
iterations (typically 3) before converging?** Distinct = different interaction/layout models, not
reskins. Encoded in `design-process.md`. Standing directives from this brainstorm: **Add Game gets
3 distinct flow treatments**; **the Styler must include at least one carousel treatment** (card
hero persistent, attribute sections swiping beneath, section chips for jumping).

## Ripples
- `open-questions.md`: **+OQ-039** (nameplate/overlay as COSM-01 cosmetic types? [behavior], owed
  stage 2) · **OQ-007** annotated — rescoped to the Canvas posture's breakout treatment (stage 3).
- `design-process.md`: Phase D order locked + the multi-draft divergence rule.
- `design-spec.md` / `ui-design-requirements.md`: **no edit now** — postures/tiers enter the
  design-spec when designed (its named-when-designed discipline); 4.1/4.3 already accommodate.
