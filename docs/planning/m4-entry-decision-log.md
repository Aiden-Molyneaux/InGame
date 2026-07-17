# M4-entry decision log

> The §0 entry-gate receipt for **Milestone M4 — Customization**. Every §0 ruling, where it's recorded,
> and its status. Filed 2026-07-05 (owner rulings) ahead of the M3-R2 sign-off so M4 is unblocked the
> instant R2 lands. **Authority:** decision [`0062`](../decisions/0062-m4-entry-gate-rulings.md); the
> DoD is §8 of [`m4-build-task.md`](m4-build-task.md); the source audit is
> [`phase-coverage-audit-findings.md`](phase-coverage-audit-findings.md).

**No M4 surface build starts until:** (a) this gate is landed [DONE — see below] **and** (b) M3-R2 is
signed (the brief's separate precondition — still open; this prep runs ahead of it).

## The rulings

| §0 | Item | Ruling | Recorded in |
|---|---|---|---|
| 0.1 | Game-page shell milestone home | **→ M4** (first-article surface; CARD-23 NAVIGATE target + M3-deferred per-game host) | 0062 #1 · design-spec §2.4b (0.52) · road-to-market M4 row |
| 0.8 | **M4/M5 boundary** | **DEFAULT — free/private only**; publish/adopt/premium-reconcile `EXPECTED(M5)` (drawn, not built) | 0062 #2 · road-to-market M4/M5 rows |
| 0.2 | Onboarding (O1–O10) | **Deferred past M4** (recorded, not dropped; lands near public-launch; AUTH-06 + NOTIF-04 travel with it) | 0062 #3 · road-to-market note |
| 0.7 | CAT-11 NEW-RELEASES rail | **→ M4** on the Add Game surface (owner ruling; `/catalog/new-releases` already exists) | 0062 #3 · road-to-market M4 row |
| 0.5 | CARD-16 a11y path | **Design-pass** (board → `burt` → SCREEN-STATUS → build); a launch gate — M4 does not ship without it | 0062 #4 |
| 0.4 | OQ-122 read-guard | **Deferred to M5 entry** (folds OQ-126); the reads don't arrive at M4 under DEFAULT | 0062 #5 · open-questions OQ-122/126 |
| 0.3 | CAT-12 | **→ M6** (needs SOC-01) | 0062 #6 · product-spec §5.4 (0.49) |
| 0.3 | MOD-07 screening | **Accept unscreened** for the closed/trusted beta; engine stays M7 | 0062 #6 |
| 0.3 | SYS-12 Welcome stats | **Confirmed owned** (shipped M2/M3); no build owed | 0062 #6 |
| 0.3 | CARD-15 standin note | Recorded: M2/M3 shelves = CARD-18 default + static art, **not** composed renders | 0062 #6 · road-to-market note |
| 0.3 | Closed-beta safety-rail | **Moot under DEFAULT** (no cross-user UGC); bites only under a pull-forward | 0062 #6 |
| §7 | CARD-21 image-share | **Out of M4 → M5** | 0062 #7 |
| 0.4 | **OQ-056** modular saving | **Formalized → +CARD-24** + `style_presets` + `/me/style-presets` CRUD (the hard dep for §3.1) | 0062 #8 · product-spec 0.49 · api-contract 0.51 · open-questions OQ-056 |
| 0.6 | OQ-127 stepped-path helper | **m4 branch's first commit** (extend the R1-1 SVG step; not authored onto `m3`) | 0062 #9 · open-questions OQ-127 |
| 0.4 | OQ-009 / OQ-010 rosters | **Owner content input owed before the editor *build* (§3)** — not blocking entry | 0062 #9 · open-questions OQ-009/010 |
| 0.4 | OQ-107 / 108 / 110 | **M4 build-time** presentation (editor manifests) | 0062 #9 · open-questions |

## Still owed before §3 surface build (not part of this gate)
- **M3-R2 signed** — the brief's precondition; the `m4` branch is cut off `m3` only then.
- **OQ-009 / OQ-010** — the owner's free-asset **roster** content (vector packs · effect/finish set) — owed
  before the Styler/Canvas *build*, woven through the editor manifests (§3.8).
- **§1 CARD-15 render spike** (G-H budget cap) — the first M4 work after entry; go/no-go is the owner's.
- **OQ-127** helper — the m4 branch's first commit.

## Content + spike rulings (follow-on, 2026-07-05)
- **OQ-009 (vector library) — breadth approved.** The generous one-pack "Essentials" starter (~12 shapes
  + ~30 gaming-flavored icons + the placeable font glyphs) is owner-blessed. All free (0017).
- **OQ-010 (closed-attribute roster) — splits approved.** The free COSM-02 baseline (frames ~6 · effects
  ~5 · finishes ~2 · nameplates none/SLAB/RIBBON/BEVEL · fonts ~5) + the premium COSM-03 (M5) sketch, as
  proposed. **Two owner notes:** (1) **dev-time premium preview** — during development the owner wants to
  try *any* option incl. premium (acceptable if full premium-try waits for M5 complete); record for the
  M4 editor build (a dev-only unlock, or the CARD-13 preview-without-reconcile half). (2) **Pre-launch
  styler-roster design pass** — a distinct pass to make the sets "perfect and full" is owed **before
  launch** (a later-phase task, not M4 — place it in road-to-market's pre-launch/M8 lane when the roster
  is formalized).
- **Roster formalization = early M4.** The full COSM-02 roster → **product-spec §5.8 (COSM) + a decision
  (0063)**, done as the first content work on `m4` (§3.8 — the roster is woven through the editors).
  **OQ-009 / OQ-010 stay open until that formalization lands.**
- **CARD-15 / Gate G-H — no budget cap.** Owner set G-H = **no token/time ceiling**; the gate is
  **fidelity + owner go/no-go**, not cost — build until the flatten is faithful, **escalate on a
  fidelity/feasibility wall, not on spend**. *(Owner note: Fable can audit only part of the spike.)*
- **OQ-127 — confirmed m4's first commit** (the stepped-path helper; no change from 0062 #9).

## Health
`/health` re-run after the doc-graph bumps (product-spec 0.49 · api-contract 0.51 · design-spec 0.52 ·
00-INDEX register synced) — see [`PROJECT-HEALTH.md`](PROJECT-HEALTH.md).
