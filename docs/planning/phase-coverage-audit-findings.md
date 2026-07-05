# Phase-Coverage Audit — Findings

**Date:** 2026-07-02 · **Author:** Claude Code (owner-requested, pre-M4 planning) · **Read-only** (proposes; does not edit the specs)

**Method.** Every UI surface (design-spec §2.x/§4.x + `docs/design/mockups/**`) and every product-spec stable ID (118 IDs across SYS/AUTH/PROF/CAT/COL/CARD/DEV/COSM/ECON/SOC/WTP/DISC/NOTIF/MOD/ACH) was cross-referenced against the milestone→ID map (road-to-market §4), product-spec §8 phasing, the M1/M2/M3 build-task DoDs (the only DoDs that exist — M4–M8 are §4-table stubs), the api-contract, and decisions 0046–0053. A surface/feature is **built (Mn)** only if a shipped build-task DoD delivers it, **planned (Mn)** if a later milestone's delivered-ID set / roadmap row names it, **ORPHAN** if **no** build-task DoD *or* delivered-ID set builds it (scattered design-spec inline M-tags do **not** count as an owner), and **ambiguous** only where the evidence genuinely conflicts. A surface is also **MIS-SLOT** when a current-or-earlier milestone's "win"/DoD depends on it while it lands later or nowhere.

**Bottom line: 2 true ORPHANS · 1 orphan-in-flux · 6 mis-slots.**
- **ORPHANS (P0/P1):** the **Game page** hub shell (P0 — a card-tap NAVIGATE target per CARD-23/0048 that also hosts the M3 CARDS switcher M3 depends on; **no DoD builds the shell**) and **Onboarding** (P1 — a converged O1–O10 flow in no DoD and no roadmap row).
- **Orphan-in-flux:** the standalone **Lists / Top-editor** surface — converged, but its M6 home is being dissolved into a Collection TOP view by 0048/0049 while 0047 still keeps the dedicated editor (the two tracks are not yet reconciled).
- **MIS-SLOTS:** Game page (also an orphan), CAT-12, the M3 Top-3-vs-SOC-04 inversion, MOD-07 screening, M4 closed-beta-precedes-its-safety-rails, and the CARD-15 render standin.
- **Not findings (parked by design):** the §10 product parks + ECON-05a + the three foundation/study boards (Design System Catalog, button-system-drafts, onscreen-marker-drafts).

---

## 1. Coverage matrix

### 1a. Surfaces

| Surface | Owning milestone | Status | Evidence (doc:section/line) |
|---|---|---|---|
| Welcome & Auth | M2 | built (M2) | `m2-build-task.md:34,59-65,126`; logged-out root/`/locked` NavBand `design-spec §2.13`; decision 0029. Native SIWA deferred to M1-P. |
| Collection (shelf/grid/list) | M3 (shell M2) | built (M3) | M2 styled-seeded shelf `m2-build-task.md:34,48,66`; M3 wires `/me/collection`, deletes `seed.ts`, count/stats/LIST/TOP real `m3-build-task.md:33-35`; roadmap `road-to-market.md:137`. |
| Collection · TOP view (Top-10) | M6 (read-only stub M3) | planned (M6) | Decision 0049 (Top curated in Collection TOP view, ratified 2026-06-30); reads/writes SOC-04 `PATCH /me/lists/:id`; M3 D3 ships read-only hours-derived placeholder (`top10` field left unimplemented). |
| Profile (self) | M3 (shell M2) | built (M3) | M2 self-profile render `m2-build-task.md:66,134`; M3 real stats/PINNED FAVOURITE/Top-3 chips `m3-build-task.md`; `PATCH /me` widened + `GET /users/:id` M2 `m2-build-task.md:126`. |
| Profile (friend-view) | M6 | planned (M6) | Shape (`toFriendShape` + `relationship`) built M2 `m2-build-task.md:126` but "shaped but dormant"; screen lands with Social `road-to-market.md:140`. |
| Add Game | M3 | built (M3) | M3 add-game flow (search → CardFan → add · create-with-dedup-warn) `m3-build-task.md §4.3`; `/catalog/search`, `POST /catalog`, CAT-03 test-first. |
| **Game page (hub shell)** | **none** | **ORPHAN** | Mockups `docs/design/mockups/game-page/**` (11 boards). CARD-23/decision `0048:24-28` makes it the universal NAVIGATE target; `game-card-tap-audit.md:75` shows it hosts the **M3 CARDS switcher (SELECT + SET-AS-MAIN/EDIT/DELETE, OQ-056)**. **No M1/M2/M3 DoD builds the hub shell**; design-spec tags its *states* to M2/M4/M5/M6/M8 but no milestone owns the container. **Also a MIS-SLOT (§4).** |
| Card editor — Styler | M4 | planned (M4) | `road-to-market.md:138` "Card editor (Styler+Canvas)"; CARD-01..; no DoD (M4 stub). |
| Card editor — Canvas | M4 | planned (M4) | `road-to-market.md:138`; composition→flatten CARD-15; design-spec §2.4b CARDS gallery/adopt M4. |
| Device editor | M4 | planned (M4) | `road-to-market.md:138` "Device editor (free assets)"; DEV-*, COSM-* (free); OQ-076/077 debt. |
| Store | M5 | planned (M5) | `road-to-market.md` M5 "store + IAP + receipt validation"; ECON-*; requires M1-P. |
| Wallet | M5 | planned (M5) | M5 "wallet + ledger"; ECON-07; composed from `/me/wallet`+`/me/wallet/ledger` inside Store §2.3 (no standalone board — by design). |
| Contributor profile | M5 | planned (M5) | `road-to-market.md` M5 "contributor profile"; CAT-05/07, CARD-15/19/20; design-spec §2.16. |
| Compare Hours | M6 | planned (M6) | `road-to-market.md:140` "compare hours (SOC-03)"; design-spec §2.12; OQ-076/077 debt. |
| Friends | M6 | planned (M6) | `road-to-market.md:140` "friends"; SOC-*; design-spec §2.10. |
| Find / Add Friends | M6 | planned (M6) | `road-to-market.md:140`; SOC-* (invite/QR/relationship); design-spec §2.11. |
| **Lists / Top-editor (standalone)** | M6 → dissolving | **orphan-in-flux** | Mockups `docs/design/mockups/lists/**` (converged). Decision `0049:24-31` retires it into the Collection TOP view; `lists-states.html` re-homed 2026-06-30. **But `0047` (accepted, same day) still keeps the dedicated §4.7 editor** — 0048:65-72 flags the unreconciled conflict. The screen has no independent milestone home; its function folds into Collection TOP (M6). **File as OQ (§6).** |
| Discover | M7 | planned (M7) | `road-to-market.md:141` "discovery"; DISC-*; design-spec §2.7. |
| Achievements | M7 | planned (M7) | `road-to-market.md:141` "achievements engine + celebration"; ACH-* (spine ACH-08 laid M1/M2); design-spec §2.19. |
| Admin console | M7 | planned (M7) | `road-to-market.md:141` "moderation console (MOD-04)"; MOD-*; design-spec §2.18. |
| Report sheet | M6 (block) / M7 (report-reception) / M8 (compliance gate) | ambiguous | Cross-cutting `ReportSheet` component (`design-spec §1.5`), no standalone DoD: block rides SOC-09 (M6), moderation reception MOD-* (M7), UGC compliance SYS-09 + report/block (M8). Delivered alongside its host surfaces, not owned by one milestone. |
| Settings | M6 (privacy/block) / M7 (feedback/logs) | ambiguous | No roadmap row or DoD names "Settings"; privacy PROF-03 + block-list ride Social M6, feedback/`LogAttach` SYS-11 ride M7 (OQ-060). Assembled piecewise. |
| Feedback & bug reporting | M7 | planned (M7) | SYS-11 diagnostic bundles deferred to M7 pending OQ-060; design-spec within §2.8. |
| **Onboarding (O1–O10)** | **none** | **ORPHAN** | Mockups converged, design-spec §2.14. **No M1/M2/M3 DoD scopes the O1–O10 populate-collection flow; no roadmap §4 row names Onboarding.** Named as *design* follow-on `road-to-market.md:325` but never assigned a *build* milestone. AUTH-06 (guided onboarding) has no dedicated DoD. **Also a MIS-SLOT (§4).** |
| Design System Catalog | — (foundation) | parked-by-design | `InGame Design System Catalog.dc.html`; the rulebook (Burt-audited), not a §2.x screen. Correctly owned by no milestone. |
| Button-system drafts | — (study) | parked-by-design | `design-system/button-system-drafts.dc.html` (OQ-006 study); output absorbed into every surface. |
| Onscreen-marker drafts | — (study) | parked-by-design | `design-system/onscreen-marker-drafts.html` (F-05/F-09 study); output = `StateMark`. |

### 1b. Features (status only; full evidence in the upstream feature-coverage pass)

| Family | Built | Planned | Notes / flags |
|---|---|---|---|
| SYS-01..12 | 01,02,03,04,05,06,07,08 (M1/M2) | 09(M8),10(M6),11(M7),12(M3) | **SYS-12** (public Welcome stats, `GET /stats/public`) has an endpoint + client home but **no DoD line names it** — flag. SYS-10 weakly-owned. |
| AUTH-01..11 | 01,02,03(email),04,05,08,09,11 (M2/M3) | 06(M4),07(M8),10(M8); AUTH-03 real SIWA (M1-P) | **AUTH-06** onboarding has no dedicated DoD (ties to Onboarding orphan). |
| PROF-01..09 | 01,02,03,04,05(self),06,09 (M2/M3) | 07(M6),08(M4) | PROF-07 percentile chips weakly-owned. PROF-08 avatar → M4 (reuses CARD-15). |
| CAT-01..12 | 01,02,03,04,05(credit),08(data),09 (M3) | 06(M7),07(M5),10(M5),11(M4),12(**M6 not M3**) | **CAT-12** (FRIENDS ARE PLAYING) filed §8 P2/M3 but hard-needs SOC-01 (M6) — **mis-slot (§4)**. |
| COL-01..13 | 01–09 (M3) | 10(M6),11(M6),12(M4),13(M6) | COL-13 TOP curation ships read-only stub in M3 (D3); COL-06 partly M5 (adopt). |
| CARD-01..23 | 23 (grammar, applied via 0048; NAVIGATE partial M3) | 01–18,22 (M4), 04/05/06/13/19/20/21 (M5) | Whole family M4/M5; CARD-15 flatten pipeline is M4's hardest piece. CARD-21 share weakly-owned. |
| DEV-01..05 | — | all M4 | Device editor free assets. |
| COSM-01..04 | — | 01,02(M4 free),03(M5),04(M7) | Split free/premium/earned. |
| ECON-01..11 | — | all M5 (05 completes M7; 11 ops M5) | ECON-05a **parked** (reserved, off in v2 — not a finding). Requires M1-P. |
| SOC-01..11 | — | all M6 (06 feed M7) | SOC-09 block split M5-light/M6-full; SOC-04 backs M3's Top-3 stub. |
| WTP-01..03 | 03 (M3, Now-Playing pin) | 01,02 (M6) | WTP-03 correctly shipped early. |
| DISC-01..04 | — | all M7 | Discover screen + trending. |
| NOTIF-01..04 | — | all M7 | Needs M1-P push creds; NOTIF-04 priming gates NOTIF-01. |
| MOD-01..15 | 10 (M2, audit convention) | all others M7 | **MOD-07** screening *engine* is M7 but M2/M3 write paths (usernames/bios/catalog names) accept free text now — **mis-slot (§4)**. |
| ACH-01..09 | 08 (M1/M2, event spine) | all others M7 | ACH-08 outbox laid early, consumed M7 (correct direction). |

**No true feature-ID orphans** — every ID maps to an owning milestone via delivered-ID sets + §8 phasing. The orphans are *surfaces* (Game page, Onboarding) whose implied features (the M3 CARDS switcher, AUTH-06) have no build home.

---

## 2. (folded into §1 and §3)

---

## 3. ORPHAN list (ranked)

### P0 — Game page (hub shell) — ORPHAN **and** MIS-SLOT
- **What it is.** The per-game hub (`docs/design/mockups/game-page/**`, 11 boards; design-spec §2.4b / §4.2). Per **CARD-23 / decision 0048** it is the **universal card-tap NAVIGATE target** — the destination for pinned-favourite, now-playing, list/search rows, compare matchups, and the onboarding finale. It hosts (per `game-card-tap-audit.md:75`, OQ-056) the **CARDS switcher: SELECT + inline SET-AS-MAIN / EDIT / DELETE**, plus the natural home for per-game **status / log-hours / now-playing / remove** actions.
- **Why it's orphaned.** **No M1/M2/M3 build-task DoD builds the hub shell**, and no delivered-ID set names it. The design-spec tags its individual *states* to different milestones (EDIT STATS M2 · CARDS gallery M4 · ABOUT M5 · neutral/friend M6 · upcoming M8) — but tagging pieces across five milestones is exactly the failure mode: **the container has no owner.** Per the classification rule, scattered inline M-tags do not constitute a milestone building the shell.
- **What depends on it.** (1) **M3's own win** — "add it to your shelf, log hours, watch your real collection": logging hours/status per game and the CARDS switcher (SELECT/SET-AS-MAIN/EDIT/DELETE) are per-game actions that need a host. M3 either builds a minimal action surface *uncredited* or rides an inline drawer. (2) **CARD-23** — every NAVIGATE tap across the app resolves here; without the shell there is no NAVIGATE destination. (3) Onboarding finale NAVIGATE (0048).
- **RECOMMENDED milestone: M4.** Slot the Game-page hub shell into M4 entry, delivering the per-game **card-management** (CARDS switcher — SELECT / SET-AS-MAIN / EDIT / DELETE, OQ-056) alongside the M4 card editor it naturally pairs with, **plus** the per-game **status / log-hours / now-playing / remove** actions M3 deferred, **plus** the CARDS community gallery (already tagged M4). Pull the EDIT STATS state forward into whatever minimal M3 action host is needed (see mis-slot #1).
- **ID/DoD ripple.** Add a Game-page shell line to the M4 entry plan owning: CARD-23 (NAVIGATE target realized), the CARDS switcher (OQ-056), COL-02/03 per-game status/hours UI, WTP-03 now-playing UI, COL-01 remove, and card INSPECT/R-ENLARGE (0048). Ripple design-spec §2.4b (state ownership → M4) and the road-to-market M4 row.

### P1 — Onboarding (O1–O10) — ORPHAN **and** MIS-SLOT
- **What it is.** The converged first-run flow (design-spec §2.14 / §4.14): O2 add-rail (COL-01), O6 push priming (NOTIF-04), O8/O9 finale collection, O10 "popular first adds". AUTH-06 is the "guided onboarding" behavior.
- **Why it's orphaned.** **No M1–M8 DoD or delivered-ID set scopes it; no roadmap §4 row names Onboarding.** M2's win ("sign in → your profile → collection") only *appears* whole because M2 **hand-seeds** the shelf — a real new user signs in to an empty account with no guided path. Onboarding is named only as *design* follow-on (`road-to-market.md:325`).
- **What depends on it.** M2's "sign in →" arc structurally implies a first-run flow. NOTIF-04 push priming (O6) gates NOTIF-01 (M7). The new-user empty-collection reality is unowned.
- **RECOMMENDED milestone: M3** (it *populates the collection* — exactly M3's job) or a shell in M2 with the add-rail landing on M3's catalog. Given M3 is in progress, slot the O1–O10 flow into **M4** if M3 cannot absorb it without slipping, but record the decision.
- **ID/DoD ripple.** Add an Onboarding line to the M3 or M4 entry plan owning AUTH-06 + CAT-11 (NEW RELEASES rail) + COL-01 (add-rail) + NOTIF-04 (O6 priming stub). Ripple the road-to-market row and design-spec §2.14.

### P2 — Lists / Top-editor (standalone) — orphan-in-flux (file as OQ)
- **What it is.** The dedicated Top-editor screen (`docs/design/mockups/lists/**`, converged; design-spec §4.7).
- **Why it's in flux.** Decision **0049** (ratified 2026-06-30) retires the standalone editor and folds curation into a **Collection TOP view-mode**; `lists-states.html` was re-homed as that view. **But decision 0047** (accepted the same day, parallel session) still **keeps the dedicated §4.7 editor grown to 10 seats** + a standalone VIEW TOP 10 grid. Decision `0048:65-72` and `0049:54-57` both flag that the two tracks contradict on *where the Top is curated* and must be coordinated before Top-editing is formalized. So the screen's milestone home is genuinely unsettled: as a standalone screen it is being retired (→ no home); as a Collection view-mode it rides M6 (SOC-04/COL-13).
- **RECOMMENDED:** ratify the fold (retire the standalone editor; curation lives in the Collection TOP view at M6) and reconcile 0047. Until then it is neither built nor cleanly planned. **File as OQ (§6).**

---

## 4. MIS-SLOTTED list (a current/earlier milestone's win depends on a later/absent surface)

1. **Game page ← M3 (HIGH).** M3's win requires per-game log-hours/status and the CARDS switcher, but the Game-page hub that hosts them is an ORPHAN (§3, P0). M3 must either build a minimal, uncredited action host or defer. → resolved by slotting the shell (M4) and pulling a minimal EDIT-STATS/action surface into M3. (Evidence: `m3-build-task.md` win line; `game-card-tap-audit.md:75`; 0048.)
2. **CAT-12 FRIENDS ARE PLAYING ← §8 P2/M3 (HIGH).** Filed under Catalog P2 (product-spec §8) but hard-depends on the SOC-01 friend graph (M6). It cannot be built at its filed milestone. → **re-file CAT-12 to M6.** (Evidence: product-spec §8 P2 vs §5.4 L136.)
3. **M3 Top-3 chips ← M6 SOC-04 (MEDIUM).** The M3 profile Top-3 rank chips *display* a Top-10 list whose real backing (SOC-04) + curation (COL-13) don't exist until M6. M3 ships a documented D3 hours-derived read-only placeholder (`top10` field left unimplemented). Managed inversion (display precedes data by 3 milestones) but genuine. (Evidence: `m3-build-task.md` D3; decision 0049.)
4. **MOD-07 screening ← M2/M3 write paths (MEDIUM).** Free-text writes (usernames/bios M2, catalog names via M3 "create-it") open four milestones before the banned-word/screening *engine* (M7). M2/M3 UGC ships unscreened or stub-screened. → confirm stub-screen-now vs accept-unscreened. (Evidence: product-spec §5.14 L268.)
5. **M4 closed beta ← safety rails at M6/M7/M8 (MEDIUM).** M4 ships a closed beta with real UGC (cards), but block lands M6, report-reception M7, real account deletion (AUTH-07) M8. The beta precedes its takedown/deletion/report rails by 2–4 milestones. Acceptable for a *closed* (invite, trusted) beta but needs explicit owner sign-off. (Evidence: `road-to-market.md` M4 ◆; AUTH-07 M8.)
6. **CARD-15 render standin ← M2/M3 shelves (MEDIUM).** M2/M3 shelves + CardFan show cards, but the composition→flatten pipeline (CARD-15) is M4. They work only via the default card (CARD-18) + static art. → add an explicit "these are default/static cards, not composed renders" ruling so nobody assumes M2/M3 cards are the real render. (Evidence: CARD-15 M4; CARD-18 default-card guarantee.)

**Correctly ordered (noted so they're not mistaken for gaps):** `toFriendShape` (M2) → friend screens (M6); ACH-08 outbox (M1/M2) → achievements (M7); WTP-03 pin (M3) → rest of WTP (M6); PROF-08 avatar correctly waits for CARD-15 (M4); AUTH-07 correctly terminal (M8). **Schedule-risk external deps (not mis-slots):** M5 IAP (ECON-06) and M7 push (NOTIF-01) hard-depend on the owner-only M1-P track — named as requirements, critical-path if M1-P slips.

---

## 5. Recommended roadmap patch (copy-pasteable)

Minimal concrete edits to `docs/planning/road-to-market.md` §4 and the entry plans:

- **M4 row — add the Game page hub shell.** Append to M4 delivered surfaces: *"Game page (§4.2) hub shell — the CARD-23 NAVIGATE target: CARDS switcher (SELECT / SET-AS-MAIN / EDIT / DELETE, OQ-056), per-game status/log-hours (COL-02/03), now-playing (WTP-03 UI), remove (COL-01), card INSPECT/enlarge (R-ENLARGE, 0048), community gallery."* Ripple design-spec §2.4b to read "hub shell owned by M4."
- **M3 entry plan — add a minimal per-game action host.** Add a DoD line: *"M3 delivers a minimal per-game action surface (inline drawer or EDIT-STATS state) hosting COL-02/03 status/hours + WTP-03 now-playing + COL-01 remove, pending the full Game-page hub at M4."* This credits what M3's win already implies.
- **M3 (or M4) entry plan — add Onboarding.** Add: *"Onboarding O1–O10 (design-spec §2.14) — AUTH-06 guided first-run + COL-01 add-rail + CAT-11 NEW RELEASES rail + NOTIF-04 priming stub (O6). Owns the empty-new-user path M2's seeded demo papers over."* Add a matching row to road-to-market §4.
- **CAT-12 — re-file from P2/M3 to M6.** In product-spec §8, move CAT-12 (FRIENDS ARE PLAYING rail) out of P2 and note it depends on SOC-01 (M6). No new ID.
- **M2/M3 note — CARD-15 standin.** Add a one-line note to the M3 entry plan and M4 row: *"Cards shown on M2/M3 shelves + CardFan are the default card (CARD-18) + static catalog art, NOT composed CARD-15 renders (pipeline lands M4)."*
- **M4 row — beta safety-rail caveat.** Add: *"◆ closed beta ships ahead of block (M6) / report-reception (M7) / real deletion (AUTH-07, M8) — acceptable for closed/trusted invite only; owner sign-off recorded."*
- **Lists/Top-editor — record the retirement.** Once 0047 is reconciled with 0049, mark §4.7 in SCREEN-STATUS as "retired → Collection TOP view (M6)" and drop the standalone screen from any milestone's surface list.

---

## 6. Open questions to file (00-INDEX §4)

- **OQ-XXX (Game page milestone home).** "The Game page (§4.2) hub shell is the CARD-23 NAVIGATE target and hosts the M3 CARDS switcher, yet no build-task DoD builds the shell. Confirm it lands in **M4** (with the card editor), and confirm what minimal per-game action host **M3** builds now for log-hours/status/now-playing/remove."
- **OQ-XXX (Onboarding milestone home).** "The converged O1–O10 onboarding flow (§2.14, AUTH-06) is in no DoD and no roadmap row. M2's seeded demo hides the empty-new-user path. Assign Onboarding to **M3** (it populates the collection) or **M4**, and scope AUTH-06 + CAT-11 + NOTIF-04 (O6)."
- **OQ-XXX (Lists/Top-editor fold — reconcile 0047 vs 0048/0049).** "Decision 0049 (ratified 2026-06-30) retires the standalone §4.7 Lists/Top editor into a Collection TOP view; decision 0047 (same day) still keeps the dedicated 10-seat editor + standalone VIEW TOP 10 grid. The two tracks contradict on *where the Top is curated* and are not yet reconciled. Ratify the fold and formally retire the standalone screen, or keep it — and pick its milestone."
- **OQ-XXX (CAT-12 phasing).** "CAT-12 (FRIENDS ARE PLAYING rail) is filed under §8 P2/M3 but hard-depends on the SOC-01 friend graph (M6). Re-file to M6?"
- **OQ-XXX (MOD-07 early-write screening).** "The MOD-07 screening engine is M7, but M2/M3 write paths (usernames/bios/catalog names) accept free text now. Do early writes screen with a stub, or is unscreened UGC accepted until M7?"
- **OQ-XXX (SYS-12 Welcome-stats owner).** "SYS-12 (`GET /stats/public` for the Welcome landing) has an endpoint + client home but no build-task DoD line names it. Confirm it is in M2/M3 client scope or explicitly deferred so it doesn't silently slip."
- **OQ-XXX (M4 closed-beta safety-rail staging).** "M4's closed beta creates real UGC while block (M6) / report-reception (M7) / real deletion (AUTH-07, M8) land later. Confirm owner acceptance of this staging for a closed/trusted invite beta."

---

## Consciously parked (NOT findings — for completeness)

- **ECON-05a** — explicitly reserved future-toggle, OFF in v2 (product-spec §5.9 L212). Correctly no milestone.
- **product-spec §10 parks** — real-data integrations, creator revenue-share/marketplace, public-profile/follow graph, external sharing beyond the card image, full drawing suite / AI art / remix / rarity tiers, live-ops seasons, external admin operator UI, Google Sign-In, deferred install-referrer attribution. Parked with no milestone by design. (The §5 IDs that *touch* these — CARD-21 image-share, SOC-10 attribution, AUTH-03 Google — are themselves in v2 with only the parked *extension* out.)
- **Observability (§7):** APM, distributed tracing, custom dashboards — "Sentry + a funnel is the line." **Rejected tooling (M1 brief):** Turborepo/Nx, pnpm, blanket runtime validation, per-PR dependency gates. Parked/rejected by design.
- **Foundation/study boards:** Design System Catalog, button-system-drafts, onscreen-marker-drafts — not shippable surfaces; correctly owned by no milestone.

---

*Source docs: `docs/planning/road-to-market.md` §4 · `docs/spec/product-spec.md` (§5/§8/§10/§11) · `docs/spec/api-contract.md` · `docs/design/design-spec.md` (§2.x/§4.x) · `docs/design/mockups/**` · `docs/planning/m1-scaffold-task.md`, `m2-build-task.md`, `m3-build-task.md` · `docs/decisions/0046-0053`, esp. 0047/0048/0049 · `docs/design/mockups/audit/2026-06-29/game-card-tap-audit.md`. Caveat: M4–M8 have no build-task DoD (§4-table stubs), so every planned(M4+) call rests on the roadmap row + delivered-ID set + design-spec inline tags, not a paste-ready DoD.*
