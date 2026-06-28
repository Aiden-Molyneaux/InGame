# R1 — Reference & Version Integrity

**Audit:** Design-Documentation Audit (see [`00-PLAN.md`](00-PLAN.md)) · **Run:** 2026-06-13 ·
**Audited against:** working tree at `c48d1a5` · **Mode:** report-only

## Coverage
Checked four categories across `docs/`: (1) version-citation drift, (2) broken file/mockup paths,
(3) broken decision/OQ cites, (4) broken internal markdown links. Read the Version header + changelog
tail of all five versioned docs and confirmed each header equals its changelog top (the five are
internally self-consistent). Globbed the mockups tree (per-page boards + catalog) and resolved every
`.html` / `.md` / `.png` path cited in the four navigation docs; resolved every decision (0009–0022)
and design-cited `OQ-NNN`; checked the relative links in the nav docs.

**Clean — categories 2, 3, 4:** no broken paths, no broken decision/OQ cites, no broken links. All
referenced mockup/plan/asset files exist; decisions `0001–0022` are all present; `game-page-states.html`
is a correctly-marked **future** converge target, not a broken pointer. **Every finding below is
category 1 (version-citation drift).**

## Ground truth — current versions (verified against each doc's header = changelog top)
| Doc | Actual current |
|---|---|
| `spec/product-spec.md` | **0.22** |
| `spec/api-contract.md` | **0.22** |
| `spec/testing-strategy.md` | 0.1 |
| `design/design-spec.md` | **0.15** |
| `design/ui-design-requirements.md` | **0.17** |
| `mockups/InGame Design System Catalog.dc.html` | **v0.4** |

---

## Findings

### R1-F01–F04 (cluster) — 00-INDEX §1 version register is stale for 4 of 5 docs · **High**
The canonical version register (00-INDEX §1; §5 designates it the per-doc "current version")
disagrees with every versioned doc except testing-strategy:

| Doc | 00-INDEX §1 says | Actual | Location |
|---|---|---|---|
| product-spec | `v0.21 — draft` | **0.22** | `00-INDEX.md:19` |
| api-contract | `v0.20 — draft` | **0.22** (two minors behind) | `00-INDEX.md:20` |
| ui-design-requirements | `v0.16 — all screens specified` | **0.17** | `00-INDEX.md:23` |
| design-spec | `v0.14 — Foundations + …/Report` | **0.15** (+ descriptor omits **Discover**) | `00-INDEX.md:24` |

- **Evidence:** `00-INDEX.md:20` — `| spec/api-contract.md | … | **v0.20 — draft** |`;
  `00-INDEX.md:24` — `| design/design-spec.md | … | **v0.14 — Foundations + Collection/Profile/Store/Add Game/Styler/Report** |`
  (no Discover — yet design-spec 0.15 formalized it, `design-spec.md:190`).
- **Expected:** `v0.22` / `v0.22` / `v0.17` / `v0.15`, and the design-spec descriptor to include **Discover**.
- **Impact:** this table is the one place a reader (or a downstream agent) looks to learn the live
  version of each layer. api-contract cited **two** minors behind points the FE↔BE seam at a contract
  missing the 0.21 Discover endpoints **and** the 0.22 feedback endpoints; the design-spec cell
  actively implies Discover isn't formalized when it is.
- **Root cause (systemic):** the §1 status column is **not** in the §4 Step-2 ripple checklist, so it
  drifts on every version bump. The just-landed `c48d1a5` bumped product-spec + api to 0.22 and
  rippled api-contract/design-req — but not 00-INDEX §1. **This will recur every bump.**
- **Suggested fix — lane (a) doc-hygiene + a process patch:** (1) update the four cells to
  `0.22 / 0.22 / 0.17 / 0.15` and add "Discover" to the design-spec descriptor; (2) **add "update the
  00-INDEX §1 version register" to the §4 Step-2 ripple checklist** so this class of finding stops
  recurring.

### R1-F05 — Design System Catalog cited as **v0.3** in two source-of-truth spots; it is **v0.4** · **High**
- **Locations:** `design-spec.md:8`, `mockups/README.md:14`. Corroborating truth:
  `InGame Design System Catalog.dc.html:19` (H1 `… Catalog v0.4`) + `:417` / `:597` (`new in v0.4`
  families) and `design-spec.md:187`–`188` (changelog 0.12/0.13: "Catalog HTML → **v0.4**").
- **Evidence:**
  - `design-spec.md:8` — `… · ` + "`Design System Catalog` v0.3" — yet design-spec's **own** changelog
    (`:187` line 0.12, `:188` line 0.13) records that **it** took the catalog to v0.4. **Design-spec
    contradicts itself** (header vs changelog).
  - `mockups/README.md:14` — `… the design-spec §1.5's twin, **v0.3**. v0.1 … · v0.2 … · **v0.3 (store track …)**`
    — the file-map prose stops at v0.3, omitting the two v0.4 families.
  - (minor) the catalog's own version-history blurb (`…Catalog.dc.html:22`) enumerates only through
    v0.3 while its H1 + sections are v0.4 — a self-inconsistency inside the artifact.
- **Expected:** catalog = **v0.4**, carrying the **Forms & Flow** (Add Game) and **Editor Set**
  (Styler) component families.
- **Impact:** the two places a designer/builder reads to learn "what's in the catalog" understate it
  by a version and omit **two whole component families** that downstream pages compose from — inviting
  reinvention of components that already exist. (SCREEN-STATUS rows 4.1/4.3 correctly say catalog v0.4,
  so the disagreement is localized to these spots.)
- **Suggested fix — lane (b) presentation / design-doc hygiene:** bump the cite to v0.4 at
  `design-spec.md:8`; rewrite the `mockups/README.md:14` catalog row to v0.4 incl. the Forms & Flow +
  Editor Set families; optionally add a v0.4 line to the catalog's own history blurb. (Claude Design
  owns design-spec/README — no product-spec change.)

### R1-F07 — SCREEN-STATUS game-page row cites in-flight target versions behind current · **Low (informational)**
- **Locations:** `SCREEN-STATUS.md:12`, `:15` (`spec 0.20 / api 0.19 / design-req 0.15`).
- **Evidence:** `:15` — `Implements-from: design-req §4.2 (api 0.19 / spec 0.20). *(Design-spec + API page-audit owed at converge.)*`
- **Why Low:** these are **provenance pins** for the not-yet-converged Game page (the decision-0020
  snapshot), explicitly self-labeled "page-audit owed at converge" — not a claim that the docs sit at
  those versions. A careless reader could misread them as live. **No action now**; re-pin to
  then-current versions when the Game page converges. (Contrast — the per-row cites for *converged*
  pages, e.g. Store `§2.3; 0.10`, Report `formalized 0.14`, are correct provenance and must **not** be
  bumped to current.)

---

## Excluded (not findings)
- **Game-page drafts B/C on disk vs "b/c pending" in SCREEN-STATUS.** `game-page-draft-b-dossier.html`
  and `game-page-draft-c-pinned.html` exist but show as **untracked** (`git status: ??`) — in-flight
  WIP from a concurrent game-page track that hasn't committed or run its SCREEN-STATUS/README update
  yet. Transient, not a doc inconsistency to patch; will resolve when that track commits.

## Summary
**6 items: 5 High** (the four-cell register cluster R1-F01–F04 + the catalog cluster R1-F05) · **1 Low**
informational (R1-F07). Categories 2–4 clean. The single highest-value action is **process, not
cosmetic**: the 00-INDEX §1 register and the catalog-version cites both drift because version bumps
don't ripple to the "where's the current version" pointers — patch the four cells + the catalog cites
now, and **add the register to the §4 ripple checklist** so R1's whole class of finding stops
recurring.
