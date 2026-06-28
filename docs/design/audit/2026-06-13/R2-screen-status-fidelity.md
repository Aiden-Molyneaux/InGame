# R2 — SCREEN-STATUS Fidelity (map vs territory)

**Audit:** Design-Documentation Audit (see [`00-PLAN.md`](00-PLAN.md)) · **Run:** 2026-06-13 ·
**Audited against:** working tree at `7542f5d` · **Mode:** report-only

## Coverage
Checked every row of `SCREEN-STATUS.md` against the artifacts it points at: **state** vs the mockup's
real state, **mockup / implements-from** files exist, **states board** exists, and — the two columns
SCREEN-STATUS itself calls "the tripwires" — **Design-spec ✅** against design-spec's actual section
index, and **API ✅** against api-contract's actual endpoints. Method: pulled the design-spec TOC
(§1.0–1.7, §2.1–2.8) and the api-contract endpoint list, then verified each converged row's claim
against them; counted the markdown cells in every table row.

**Verified faithful (the bulk of the dashboard):**
- **Every `Design-spec ✅` maps to a real, populated section** — Collection §2.1, Profile §2.2,
  Store §2.3, Add Game §2.4, Styler §2.5, Report §2.6, Discover §2.7 (+ the §1.5 Discover component
  set) all exist with composition content.
- **Every `API ✅` is backed** — spot-verified Discover (`/me/queue` `api:132`, `/discover/trending-cards`
  `api:142`, `/me/recommendations` `api:122`, `/discover/browse` parked → Game page `api:141`, matching
  the row verbatim) and Collection (`/me/collection/reorder` `api:66`).
- **Honest ⬜/🔶 where formalization is genuinely owed** — Canvas correctly reads `Design-spec ⬜` /
  `API 🔶` (there is in fact **no §2.x for Canvas** in design-spec yet); Collection's
  `⬜ COL-11 friend-tools §2.1 owed` is **accurate** — design-spec §2.1 (`design-spec.md:121-127`)
  covers COL-10 friend-view but has no COL-11 browse tools. The dashboard is not over-claiming.

All findings below are confined to the **Settings (4.15)** row — the newest row, committed minutes
ago (`7542f5d`) and not yet through a review/gate pass.

---

## Findings

### R2-F01 — Settings row (4.15) is structurally malformed — a tripwire column is missing · **Medium**
- **Location:** `SCREEN-STATUS.md:49`
- **Evidence:** the table has **9 columns** (`§ | Screen | State | Mockup | Implements from |
  States board | Design-spec | API | Notes`). A cell-count of every row shows **row 49 has 8 cells**;
  every other data row has 9. (Row 50/Report shows 11 to a naive counter only because it contains two
  escaped `\|` pipes inside `card\|game\|user` — it is actually well-formed. Row 49 is the **sole**
  malformed row.) The dropped cell is **Design-spec**, which shifts the remaining content one column
  left:
  - what renders under **Design-spec** is actually API content — `🔶 (feedback POST /feedback+/logs 0.22; auth/profile/social/notif endpoints exist)`
  - what renders under **API** is actually the Notes blob — `**SETTINGS track — conventional page ×1 + the feedback surface ×3.** …`
  - the **Notes** column is left empty.
- **Expected:** 9 cells. Settings is in-pass (not converged), so its Design-spec cell should read `—`
  ("nothing to formalize yet", as the in-pass Game-page row 4.2 does), with the API content under
  **API** and the track summary under **Notes**.
- **Impact:** the two columns SCREEN-STATUS designates as its tripwires are **misaligned for Settings** —
  read by column, its Design-spec status is unreadable and its API status shows prose. Bounded: Settings
  isn't converged, so no build decision rides on it yet, and it's a fresh typo — *but it should be
  repaired before the Settings gate so the converged row starts clean.* (Would be **High** if this
  shift produced a false `✅` on a converged row; here it doesn't.)
- **Suggested fix — lane (a) doc-hygiene:** insert a `—` Design-spec cell at position 7 so the row is
  9 cells and the API/Notes content lands under the right headers. The settings track can fold this
  into its next SCREEN-STATUS pass.

### R2-F02 — Settings Mockup column references "feedback drafts a/b/c" that aren't on disk yet · **Low (in-flight)**
- **Locations:** `SCREEN-STATUS.md:49` (Mockup cell: `settings-page.html` + **feedback drafts a/b/c**),
  `:18` (Up-next: "the feedback surface ×3 [A inline · B sheet · C triage]").
- **Evidence:** `docs/design/mockups/settings/` contains **only** `settings-page.html` — and that file
  itself (`settings-page.html:280`) describes the feedback surface as "explored ×3 on the
  **feedback-draft** [board]", i.e. a **separate** artifact, which does not exist yet.
- **Expected:** the Mockup cell should point only at files that exist, or mark the feedback drafts as
  pending until the board is created.
- **Impact:** the dashboard is **ahead of disk** on a live track — a reader following the row to the
  "feedback drafts a/b/c" finds nothing. Most likely **transient**: the settings track kicked off
  minutes ago (`7542f5d`) and is actively building; the board is presumably imminent.
- **Suggested fix — lane (a) doc-hygiene, defer:** no action needed now; **confirm at the settings
  gate** that the converged Settings row points at real files. Flagged so it doesn't become a stale
  dangling reference if the track stalls.

---

## Context (not findings)
- **Live tree.** Audited at `7542f5d`. The Settings track (`7542f5d`) and Game-page B/C drafts
  (`300417d`) both landed since R1; the Game-page B/C files that R1 excluded as untracked WIP are now
  committed, and SCREEN-STATUS row 4.2 correctly reflects "all 3 drafts built, gate-ready."
- Both findings sit on the brand-new Settings row, consistent with it not having had a review pass.

## Summary
**1 Medium · 1 Low**, both on the freshly-added Settings (4.15) row. The rest of the dashboard is
**verified faithful** — every Design-spec ✅ and API ✅ tripwire on a converged page maps to a real,
populated section/endpoint, and the ⬜/🔶 markers honestly track genuinely-owed formalization (Canvas,
COL-11). Net: SCREEN-STATUS is doing its job; the one structural defect (R2-F01) is worth repairing
before Settings converges so the dashboard's most-trusted columns stay parseable.
