# 0062 — M4-entry gate rulings + OQ-056 (CARD-24) formalization

**Status:** LOCKED · **Date:** 2026-07-05 · **Author:** Claude Code (spec owner), from the owner's
M4-entry gate rulings · **Rules:** the M4 scope boundary, the Game-page shell milestone home, the
CARD-16 a11y delivery mode, the OQ-122 guard-model timing, the audit mis-slots, and the OQ-056
modular-card-saving formalization (**+CARD-24**). Companion to the M4 build brief
([`docs/planning/m4-build-task.md`](../planning/m4-build-task.md) §0) and the phase-coverage audit
([`docs/planning/phase-coverage-audit-findings.md`](../planning/phase-coverage-audit-findings.md)).

## Context
M4 is the first milestone opened with **no ratified DoD** and a **P0 orphan** (the Game page) in its
lap. The M4 build brief front-loads a §0 **entry gate** — a set of owner rulings that must be recorded
(decisions + spec/contract bumps + `/health`) before any surface build. The owner ruled the four
load-bearing decisions + the confirmations in one sitting (2026-07-05); this record is the batch's
"why". Scope/phasing changes that move real UGC + economy timing are an owner change-class — these were
owner-directed. **No surface build starts until this record's consequences are landed** (and M3-R2 is
signed — the brief's separate precondition; this prep runs ahead of that so M4 is unblocked the instant
R2 lands).

## Decisions

1. **§0.1 — Game-page hub shell lands in M4 (blocking, resolved).** The Game page (design-spec §2.4b /
   §4.2) — the CARD-23 NAVIGATE target + the M3-deferred per-game host — is a **true orphan** (no
   M1/M2/M3 DoD built the container; audit §3 P0). **The shell lands at M4 entry as the first-article
   surface**, owning: **CARD-23** NAVIGATE realized · the **CARDS switcher** (OQ-056/**CARD-24** —
   SELECT / SET-AS-MAIN / EDIT-in-Styler / DELETE per 0040 / DESIGN-NEW over *your own* saved cards) ·
   per-game **COL-01 remove / COL-02 status / COL-03 hours** · **WTP-03** now-playing UI · card
   **INSPECT/enlarge** (0048). Fixes the **live discrepancy**: design-spec §2.4b tagged the CARDS
   switcher **M3** and PLAY/EDIT-STATS **M1/M2** — those are *design-for* tags; the **shell container
   and its M4-scoped states are M4** (design-spec §2.4b re-tagged, 0.52). *(The CARDS community gallery +
   adopt are M5 — decision 2.)*

2. **§0.8 — M4/M5 boundary = DEFAULT (free / private customization).** M4 ships **make · style (Styler)
   · compose (Canvas) · save-private · equip** your own cards + device with **free assets (COSM-02)**.
   The **publish** (Canvas PRESS→PUBLISH, CARD-04/19/20), **adopt** (Game-page community gallery,
   ECON-03/04), and **premium preview-then-acquire → reconcile** (CARD-13, `ReconcileSheet`/`KeepBar`)
   paths are **EXPECTED(M5)** — drawn on the boards, marked `EXPECTED(M5)` in every manifest, **not
   built at M4**. Roadmap-faithful (road-to-market M4 `:138` ships free assets; M5 `:139` owns
   publish/adopt + wallet + IAP, gated on M4 + M1-P). Keeps the closed beta a coherent private
   trophy-case and off the M1-P/economy critical path. **The `⟨M5?⟩` tag** in the brief marks what a
   future scoped pull-forward would move into M4 — **not exercised**; a pull-forward would require a new
   decision + road-to-market ripple.

3. **§0.2 — Onboarding deferred past M4.** The O1–O10 first-run flow (design-spec §2.14, AUTH-06 +
   COL-01 add-rail + **CAT-11** NEW-RELEASES rail + NOTIF-04 priming) is a **P1 orphan** (audit §3). M4
   stays on its L-effort core (render spike + four editors + the CARD-16 launch gate); the closed-beta
   testers are **hand-invited and seeded like the M2 demo**, so the empty-new-user path is not exercised
   yet. **Deferred, not dropped** — recorded here + a roadmap row so it can't re-orphan; it lands when
   real (non-invited) new users matter (near public-launch readiness). **AUTH-06 + NOTIF-04** (the O6 priming stub) travel with it. **CAT-11 (NEW-RELEASES rail) is pulled out to M4** — it lands on the **Add Game** surface (the `/catalog/new-releases` endpoint already exists, api 0.33); owner ruling 2026-07-05, so the recent-releases discovery affordance ships with M4 rather than waiting on the deferred onboarding.

4. **§0.5 — CARD-16 non-gesture / reduce-motion path = design-pass (board first).** The a11y **launch
   gate** (screen-reader labels + non-gesture editor path + reduce-motion) has **zero artboards** today.
   Deliver it **design-first**: produce a CARD-16 a11y **board** covering the non-gesture equivalents for
   the gesture-heavy editor ops (LayerRack reorder · sticker TransformBox · the swipe carousel) + the SR
   label scheme + reduce-motion states, **`burt`-audit it**, track it in `SCREEN-STATUS.md`, **then
   build+verify from it** (the design-phase workflow). Leans on the **0044** a11y baseline (OQ-104/105/106
   *resolved* — owed to *apply*: OQ-105's non-gesture-reorder + focus-trap is the keyboard-path backbone)
   + **OQ-046** (the non-hold buy alternative). **It cannot be skipped — M4 does not ship without it.**

5. **§0.4 OQ-122 — the SYS-01 published-card cross-user READ guard = deferred to M5 entry.** The F32
   binary scope model (global vs user-owned) can't express the community/cross-user reads
   (published-card gallery / trending, invite-token resolution, feed). Under the **DEFAULT boundary
   (decision 2)** those reads **do not arrive until M5**, so there is no M4-build pressure. **Fold OQ-122
   + OQ-126 into the M5-entry scope-model decision**, deciding the third read-class (a
   `// SYS-01-PUBLIC-READ` marker / `publishedOnly(table)` helper + the bearer-token AUTH-LOOKUP variant)
   with the concrete M5 read-shapes in hand. *(Would flip to ratify-now under a pull-forward — decision
   2.)* Guard-surface change → still owner/gate-3 when it lands (the OQ-115/0118 precedent).

6. **§0.3 — mis-slot rulings.**
   - **CAT-12** (FRIENDS ARE PLAYING rail) → **re-filed to M6** — hard-depends on the SOC-01 friend
     graph; **NOT M4** (audit §4 #2). product-spec §5.4 CAT-12 gains the phasing note.
   - **MOD-07 screening** → **accept unscreened** for the **closed / trusted invite** beta (M2/M3
     usernames/bios/catalog names + M4 card names/titles ship unscreened); the screening *engine* stays
     **M7**. Consistent with the safety-rail posture (decision below) — acceptable for a closed cohort.
   - **SYS-12** (public Welcome stats, `GET /stats/public`) → **confirmed owned** — the endpoint + client
     home shipped M2/M3; no build owed, recorded so it doesn't silently slip.
   - **CARD-15 standin note** (recorded, no behavior change): **M2/M3 shelves + CardFan render the
     default card (CARD-18) + static catalog art, NOT composed CARD-15 renders** — the composition→flatten
     pipeline lands M4 (§1 render spike). Nobody should assume the pipeline already exists.
   - **Closed-beta safety-rail sign-off** → **moot under the DEFAULT boundary** — private cards, no
     publish/adopt, so **no cross-user UGC** ships ahead of block (M6) / report (M7) / deletion (AUTH-07,
     M8). The caveat would bite **only** under a §0.8 pull-forward (then the owner records explicit
     acceptance for a closed/trusted invite before invites go out).

7. **§7 — CARD-21 external image-share → out of M4 (M5).** Weakly-owned; confirmed **not** an M4
   deliverable — rides the M5 community/economy surface (it composites the flattened render, CARD-15).

8. **§0.4 OQ-056 — modular card saving, formalized → +CARD-24.** The owner-brainstormed (2026-06-13)
   "parts + presets" model is now spec'd: **the card stays the atomic save/equip/publish/adopt unit
   (CARD-01/15 unchanged)**; a new **CARD-24** owns (a) **explicit named save-targets** + **SAVE AS NEW**
   (promotes CARD-14's duplicate) + autosave/crash-recovery across the **Styler↔Canvas** posture switch;
   (b) reusable **game-agnostic STYLE PRESETS** (frame · effect+intensity · finish · nameplate ·
   title-styling) that slot into the CARD-16 start-from `BaseRail`; (c) the **customizations gallery**
   pointers (per-game = the Game-page switcher `GET /me/collection/:entryId/cards`, COL-06; global = the
   My Designs shelf `/me/cards`, CARD-14). New entity **`style_presets`** + api **`/me/style-presets`
   CRUD**. Page-audit confirms the gallery is covered by existing endpoints (no new gallery routes). Preset **cap = 30** (owner-set 2026-07-05, SYS-04-tunable).
   **This is the hard dependency for the Game-page CARDS switcher (§3.1) — landed before that surface
   builds.** (product-spec 0.49 · api-contract 0.51.) **OQ-056 → resolved.**

9. **§0.6 / §0.4 — entry tasks + owner-content still owed (recorded, not blocking this record).**
   - **OQ-127** GameCard F-02 stepped-path helper (extend the R1-1 SVG-step from the ADD button to
     `GameCard`/`StateMark`/placeholders, decision 0041 §2) → **the m4 branch's first commit** (small,
     isolated RN infra; not authored onto `m3`).
   - **OQ-009** (vector-asset library scope) + **OQ-010** (effect/finish roster) → **owner content input
     owed before the editor *build* (§3)**, not before this entry record. Surfaced, not blocking.
   - **OQ-107 / OQ-108 / OQ-110** (running-cost meter · styler exit-outcome labels · strip spec-ID
     strings from UI copy) → **M4 build-time presentation**, folded into the editor manifests.

## Consequences
- **product-spec 0.49** — **+CARD-24** (§5.6) + `style_presets` (§6) + the CAT-12 M6 phasing note (§5.4).
- **api-contract 0.51** — **+`/me/style-presets` CRUD** (Cards §) + the gallery page-audit note.
- **design-spec 0.52** — §2.4b Game-page re-tagged: shell container + PLAY / EDIT-STATS / CARDS-switcher
  **→ M4**; community gallery + adopt **→ M5** (the DEFAULT boundary).
- **road-to-market §4** — M4 row gains the Game-page shell + the DEFAULT-boundary line + the CARD-15
  standin note + the beta safety-rail caveat + the Onboarding-deferred note; M5 row confirms it owns
  publish/adopt/premium-reconcile.
- **OQ-056 → resolved** (CARD-24). **OQ-122 + OQ-126 → deferred to M5 entry.** **OQ-127** → scheduled
  (m4 first commit). **OQ-009/010** → owner-content owed pre-editor-build. **OQ-107/108/110** → M4
  build-time. The audit's placeholder OQ-XXX (Game-page home · Onboarding · CAT-12 · MOD-07 · SYS-12 ·
  closed-beta) → resolved by this record.
- The **M4-entry decision log** ([`docs/planning/m4-entry-decision-log.md`](../planning/m4-entry-decision-log.md))
  is filed as the receipt. `/health` re-run after the doc-graph bumps.
