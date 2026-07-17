# M4 — Customization build brief (the trophy case · closed beta)

> **What this is:** the paste-once build brief for **Milestone M4 — Customization**, authored ahead of
> entry so a **fresh builder session** can pick it up cold. M4 is the aesthetic-soul milestone (roadmap
> effort **L**, one of the two genuinely hard ones): the **Card editor (Styler + Canvas)**, the **Device
> editor**, the **CARD-15 composition→flatten render pipeline** (the single hardest piece), and the
> **Game-page hub shell** (the M3-deferred per-game host + the CARD-23 NAVIGATE target). It ends in a
> **closed beta** (TestFlight / Play internal) — the first time testers hold the trophy case.
>
> **Why this brief is heavier than M3's:** M4 has no prior DoD (it was a roadmap-table stub), it carries
> the app's hardest engineering (skia flatten) **and** its hardest-to-automate judgment (taste), and it
> can open a real-UGC beta ahead of its safety rails (a §0.8 scope call). So the brief front-loads an
> **M4-entry gate** (§0) and
> a **render spike** (§1) before any surface build — deliberately, to de-risk the critical path first.
>
> **Date:** 2026-07-04 · **Owner:** Aiden · **Executes in:** Claude Code (skills required). **Branch:**
> new `m4` off `m3` (M3 must be closed — R2 signed — first). **Depends on:** M3 complete.

**Doc-path note:** the design-spec lives at [`docs/design/design-spec.md`](../design/design-spec.md)
(CLAUDE.md's source-of-truth table lists the `docs/design/` directory — use the specific file path above).

---

## MODEL PLAN (read first)

- **Builder:** **Opus**, a **fresh session** (this brief is self-contained — see §9 Inputs).
- **Review:** the **fresh-context murr + parvati SUBAGENTS run on Opus** (Opus is excellent at review;
  the M3-R "Opus reserved for M4 verification" ruling lands here). Builder≠verifier independence comes
  from the subagents being fresh-context, **not** the main model.
- **The ONE Fable-audit stop-point (§4):** the owner may pause **once** to bring in a **Fable-model
  session** for an independent cross-model audit — placed at the **card-editor aesthetic hinge** (after
  the CARD-15 spike + the Styler first-article, before Canvas depth). This is the "is the work on the
  right track" check the owner flagged as **key for the Styler/Canvas especially**. It is optional and
  owner-triggered; everything else reviews on Opus.
- **Taste is the owner's (gate-5):** "does it feel like the trophy case" is automation-blind. Every
  aesthetic surface reaches the owner with a parvati report attached, and the owner is the final gate.

---

## 0. M4-ENTRY GATE — resolve these BEFORE building

M4 is the first milestone opened with **no ratified DoD** and a **P0 orphan** (the Game page) in its
lap. Do **not** start surface work until these are ruled and recorded (decisions/ + product-spec /
api-contract / design-spec bumps + `/health` green). This is where the owner's up-front rulings land.

### 0.1 — Ratify the Game-page milestone home (blocking)
The phase-coverage audit ([`phase-coverage-audit-findings.md`](phase-coverage-audit-findings.md) §3 P0)
recommends the **Game-page hub shell → M4 entry**, but it is **unratified**, and there's a live
discrepancy: design-spec §2.4b (`design-spec.md:184`) tags the **CARDS switcher as M3** while the audit
puts the **whole shell at M4**. Ruling needed: **confirm the shell lands in M4** (owning CARD-23 NAVIGATE
realization, the CARDS switcher OQ-056, COL-01/02/03 per-game actions, WTP-03 now-playing UI). *(The
community gallery + adopt ride the §0.8 boundary — M5 by default.)* Ripple into road-to-market §4 +
design-spec §2.4b:184. *(This unblocks the five M3 deferrals — §0.7.)*

### 0.2 — Onboarding home (blocking-if-in-scope)
Onboarding O1–O10 is a **P1 orphan** (audit §3): no DoD, no roadmap row. It's the empty-new-user path
M2's seeded demo papers over (AUTH-06 + COL-01 add-rail + **CAT-11** NEW-RELEASES rail + NOTIF-04
priming stub). Ruling: **is Onboarding in M4 scope**, or explicitly deferred? If in, it's a surface in §3.

### 0.3 — Mis-slot rulings (from the audit §4)
- **CAT-12** (FRIENDS ARE PLAYING) → re-file to **M6** (needs SOC-01); confirm it's NOT M4.
- **MOD-07 screening:** M2/M3 write paths (usernames/bios/catalog names) are unscreened; M4 adds card
  names/titles. Rule: stub-screen-now vs accept-unscreened-until-M7.
- **CARD-15 standin note:** record that M2/M3 shelves render the **default card (CARD-18) + static art,
  NOT composed CARD-15 renders** — so nobody assumes the pipeline already exists.
- **Closed-beta safety-rail sign-off (§6) — only bites under the §0.8 pull-forward:** the private-only
  default has **no shared UGC** (moot). If publish/adopt pull forward, the beta ships shared UGC ahead of
  block (M6) / report (M7) / deletion (AUTH-07, M8) → **owner records explicit acceptance** for a
  closed/trusted invite beta.
- **SYS-12** (Welcome public stats) — confirm owned or deferred so it doesn't slip.

### 0.4 — Content + UX OQs that block the editors
These have no answer yet and the editors can't be built without them:
- **OQ-009** — vector-asset library scope (starter SVG packs; all free per 0017). *(Canvas CARD-02/17)*
- **OQ-010** — the effect + finish **roster** (launch set; free split). *(Styler CARD-12)*
- **OQ-056** — modular card saving: the **StylePreset** entity + named save-targets + SAVE-AS-NEW + the
  customizations gallery. Drives the Game-page CARDS switcher. Needs product-spec CARD-* + api-contract
  `/me/style-presets` CRUD. **Owner-brainstormed; needs spec-owner formalization first.**
- **OQ-061** — CARDS-switcher DELETE semantics (delete vs unpublish; the `ConfirmSheet`, 0040).
- **OQ-107 / OQ-108 / OQ-110** — editor running-cost meter · styler exit-outcome labels (KEEP / SAVE
  PRIVATE / CANVAS + CANCEL-ALL discard) · strip spec-ID strings from UI copy. *(re-open styler/device boards)*
- **OQ-046** — the accessible **non-hold alternative to hold-to-buy** (touches every `ReconcileSheet`).
- **OQ-122** — the **published-card cross-user READ** guard: F32's binary scope-lint doesn't cover the
  gallery/trending reads (`card_designs WHERE published`). Proposes a `// SYS-01-PUBLIC-READ` marker /
  `publishedOnly()` helper. **Guard-surface change → gate-3 / owner eyes.**

### 0.5 — CARD-16 non-gesture / reduce-motion path (DESIGN DEBT — launch gate)
CARD-16 is a **launch gate, not a trim** (roadmap §138), but it has **zero artboards** — grep of all
three editor boards for a11y/reduce-motion = 0 hits. The screen-reader labels + non-gesture editor path
+ reduce-motion honoring must be **designed or spec'd as an explicit M4 deliverable**. It leans on the
decision-0044 a11y baseline — specifically **OQ-104** (reduce-motion contract), **OQ-105** (the a11y
batch: focus-visible · focus-trap · **non-gesture reorder** — the CARD-16 keyboard path's backbone), and
**OQ-106** (content-resilience) — all *resolved* by 0044 but owed to *apply* in the editors. Rule at
entry: a short design pass, or a spec-driven build with review-rule enforcement? **It cannot be skipped**
— it's a launch gate. *(Also touches **OQ-046** — the non-hold buy alternative.)*

### 0.6 — OQ-127 DS-fidelity pass (small, M4-entry)
The GameCard F-02 TL+BR pixel-step is **on paper only** in the RN app (GameCard draws a plain square;
StateMark fakes its notch). One shared **stepped-path helper** for the card + placeholders + StateMark +
intent buttons (decision 0041 §2). Small; do it at entry so every M4 card surface inherits the real step.

### 0.7 — The five M3 deferrals that land in M4 (mostly resolved by 0.1)
| M3 item | IDs | Lands as |
|---|---|---|
| S3-a per-game action surface | COL-01/02/03, WTP-03, COL-06 | Game-page PLAY / EDIT-STATS |
| S4-g tap-to-navigate | **CARD-23** | Game-page NAVIGATE (M3 interim was inert focus-only) |
| S5-b set-now-playing picker | **WTP-03** | Game-page now-playing set UI |
| CAT-11 NEW-RELEASES rail | **CAT-11** | Add-game / Onboarding rail (recent releaseDate, cap ~12) |
| OQ-127 GameCard step | 0041 §2 | §0.6 DS pass |

### 0.8 — The M4/M5 boundary: publish · adopt · premium-reconcile (BLOCKING)
The design boards **draw** the **publish** (Canvas PRESS→PUBLISH, CARD-19/20), **adopt** (Game-page
community gallery, ECON-03/04), and **premium preview-then-acquire → reconcile** (CARD-13,
`ReconcileSheet`/`KeepBar`) paths — but the **roadmap phases them to M5, not M4**: road-to-market §4 **M5**
row (`:139`) delivers "publish/adopt cards · wallet + ledger · store + IAP" and lists **CARD-15/19/20** in
the M5 ID set, gated on "M4 **+ M1-P**"; the **M4** row (`:138`) ships only **"free assets"**; audit `:58`
phases **CARD 01–18,22 → M4 · 04/13/19/20 → M5**. A converged board does **not** settle the milestone
(the audit's whole point — inline design tags don't own phasing). **Ruling needed before §3:**
- **DEFAULT (roadmap-faithful):** M4 = **free / private customization** — make · style (Styler) · compose
  (Canvas) · **save-private** · **equip** your own cards + device with **free assets (COSM-02)**. The
  **publish**, **adopt**, and **premium-reconcile** states are **EXPECTED(M5)** — drawn on the boards,
  marked in the manifests, **not built at M4**. Keeps the closed beta coherent (private trophy-case
  customization) and off the M1-P/economy critical path.
- **PULL-FORWARD (owner option):** if the beta must feel "full" with community sharing, the owner rules a
  **scoped** pull-forward — e.g. **free-adopt + publish-plumbing** into M4 while **paid adopt /
  premium-reconcile / wallet-IAP** stay M5 — and **ripples road-to-market §4 M4/M5 rows + the audit
  phasing line + a decision record.** Only then may §3 name CARD-04/13/19/20 + ECON-03/04 as M4.

**Until ruled, build the DEFAULT free/private path** and mark publish/adopt/premium `EXPECTED(M5)` in every
manifest. §3/§7/§8 below assume the DEFAULT; the **⟨M5?⟩** tag marks what a pull-forward would move into M4.

**Exit §0:** every ruling recorded (decisions/ + spec/contract bumps), `/health` 🟢, and a short
**M4-entry decision log** filed. No surface build starts until then.

---

## 1. THE RENDER SPIKE — CARD-15 FIRST (G-H budget-capped)

**CARD-15 (composition JSON → flattened image) is the single hardest piece and the milestone's critical
path** — de-risk it **before** building any editor on top of it (roadmap build-order: CARD-15 pipeline
**before** the depth tails CARD-09/10/11).

- **Gate G-H (owner, M4 entry):** set a **hard time/token ceiling** on the spike before it starts.
  *(Default if the owner hasn't set one: cap at ~1 focused day / a bounded token budget and **escalate
  rather than exceed** — never let the spike run unbounded.)*
- **Prove, end to end, on a sample composition:** JSON → flatten to a static image (thumbnail + full,
  react-native-skia) · the **effect + finish runtime overlays** (the styler's live half) · the **cap-30**
  element ceiling · the **PROOF size-ladder** (GRID · MINI · THUMB) · **client-flatten offline** (P11) ·
  **flatten at SAVE-PRIVATE** (`POST /cards/:id/save-private` → image+thumbnail). *(The server-flatten
  **at publish** — `POST /cards/:id/publish` — is **⟨M5?⟩** per §0.8; the M4 spike proves the flatten
  mechanic itself, which publish later reuses.)*
- **This is a SPIKE** — a throwaway prototype is allowed to answer "can we flatten faithfully within
  budget?" — but it should yield the **render module** the Styler/Canvas consume. Do **not** gold-plate.
- **Go / no-go (owner):** a faithful flatten of a sample card, on-device, within the G-H budget. If it
  blows the budget or the fidelity is off, **STOP and escalate** — the whole milestone rests on this.
- This spike is the natural **first half of the Fable-audit stop-point** (§4) — the render approach is
  exactly what a cross-model audit should sanity-check before the editors scale on it.

---

## 2. THE PIPELINE (our review process — every M4 surface runs it)

Carried forward from M3-R (which shook it down to a reference-grade base). **Per surface:**

```
manifest → build → murr (diff) → parvati (running app vs manifest) → route findings → loop to 0 flags → receipt filed
```

- **Manifest first (the contract).** Before touching a surface, extract
  `docs/planning/m4/<surface>-manifest.md` from its converged `*-states.html` board — element by element,
  state by state (every drawn state: default · empty · loading · error · offline · editing · sheets ·
  celebration). Reconcile against §0 rulings + the decisions. **Recalibration rules (binding):**
  (a) a row reads `PRE` (pre-existing, correct) **only** with a code cite or a screenshot check — else
  `UNVERIFIED` (parvati treats it as a checklist row); (b) every **changed state predicate** gets a
  written state-table walk in the receipt; (c) a **browser BOOT check is mandatory** (hook-placement /
  early-return crashes slip past static + screenshot lanes).
- **Build rules.** Compose from the **component-map only** (a bespoke near-dupe of a catalog component is
  a review-reject) — component-map §8 (editors) / §9 (game page) / §11 (device) name the M4 components.
  Fix to the manifest line, not the vibe. `ui-craft` + `failure-first` skills load on their task-types.
  Anything discovered out of scope → `open-questions.md`. Follow [`CONVENTIONS.md`](../../CONVENTIONS.md).
- **murr** (fresh general-purpose agent, `C:\personal\shipwright\skills\murr\SKILL.md`) runs on the
  diff, runtime-first, with named attack surfaces + the anti-rubber-stamp law. M4's murr lanes are heavy:
  **skia render correctness**, **gesture/PanResponder races**, and **autosave/crash-recovery**. *(⟨M5?⟩ —
  if §0.8 pulls the economy path forward, add **the atomic adopt/reconcile writes** + **the SYS-01
  public-read guard** (OQ-122) as priority lanes; otherwise both are M5.)*
- **parvati** (fresh agent, `.claude/skills/parvati/SKILL.md`) reads the manifest FIRST, enumerates from
  it, captures her own Expo-web screenshots (~390×844, per state), and **divergence-from-board = 🚩 FLAG**
  at M4 (the DoD is "matches the converged boards"). Verdict appended to `docs/planning/m4-review-notes.md`.
  **A surface without a filed parvati report is not done.** **Fresh-parvati note:** M4 has **no separate
  `m4-entry-plan.md`** — the **DoD is §8 of this brief**, the entry rulings are §0 (parvati's skill looks
  for both a build-task *and* an entry-plan; point her at this brief for both). **Seed
  `docs/planning/m4-review-notes.md`** from `m3-review-notes.md`'s format before the first surface.
- **First-article rule.** The **first surface built (the Game page, §3.1)** goes to the **owner ALONE**
  — screen + manifest + parvati report — before the rest are built. Corrections recalibrate the manifest
  template + parvati's checklist before the next surface, exactly as R1-1 did in M3-R.
- **Gate-5 taste (owner).** Aesthetic surfaces (Styler / Canvas / Device) additionally get the owner's
  taste judgment — parvati checks board-fidelity, the owner judges "does it feel like the trophy case."

### Environment (the standing dev stack — decision 0060, deltas the fresh builder must know)
- `node scripts/dev-stack.mjs up` — one restart-safe stack: docker PG · API :4000 (CORS for :8082) ·
  Metro web :8082. `status` for health JSON. Login `demo@ingame.app` / `InGameDemo1!`.
- **Metro on Windows is unstable** (fix in flight): capture what you can, mark the rest "not exercised —
  Metro instability." Metro :8081 is the owner's phone lane — **never touch it**; agents use :8082.
- **Known web-loop trap (carry into M4):** the standing **:4000 API can go stale on `DEV_CORS_ORIGINS`**
  → the browser can't log in (CORS preflight passes, POST blocked) → auth-gated screens unreachable on
  web. Fix = restart the API so it reloads `apps/api/.env.dev` (`dev-stack.mjs down && up`) — it also
  flushes stale Metro module bundles. **Never create `apps/mobile/.env.local`** (retired trap).
- Prefer **supertest integration tests** over the browser loop for behavior; reserve :8082 for visual UI.
- Push via the personal-token one-shot (see the M3-R receipts / memory "Push credential recovery").
  Docs + code in **separate commits**, IDs cited. Run `/health` after touching the doc graph.

---

## 3. BUILD ORDER — the surfaces, in dependency order

Build in this order (each runs the §2 pipeline). Rationale: the render is de-risked first (§1), then the
foundational hub, then the editors from simpler→hardest so the Fable audit lands before the most
expensive surface.

### 3.1 — Game page hub shell — **THE FIRST ARTICLE** (⛔ owner-alone stop after it passes)
The CARD-23 NAVIGATE target + the M3-deferred per-game host. Board:
`game-page-states.html` (M1–M8 ownership-adaptive + L1–L4 lifecycle). Deliver the **M4-scoped states**;
mark **M5 ABOUT · M6 neutral/not-owned · M7 friend-view (SOC-11) · M8 upcoming** EXPECTED-with-cite:
**M1 PLAY** dual-face hero + PlayStats · **M2 EDIT-STATS** dossier form (COL-02/03, WTP-03 now-playing,
COL-01 remove) · **M3 CARDS** switcher (SELECT / SET-AS-MAIN / EDIT-in-styler / DELETE per OQ-061 /
DESIGN-NEW — over **your own** saved cards) · card INSPECT/enlarge (CARD-23). **⟨M5?⟩** the M4-board
**CARDS community gallery → CardDetail → atomic ADOPT** (`POST /cards/:id/adopt`, ECON-03/04) is
**EXPECTED(M5)** by default (§0.8) — build it only under the owner's pull-forward (then it's murr's
priority economy lane). NEW components: `DualFaceHero`, `PlayStats`, `CardSwitcher`, `CardDetail`
(+`CommunityGallery` only under pull-forward). **⚠ Hard dependency:** the CARDS switcher needs
**OQ-056's `StylePreset` entity in product-spec + `/me/style-presets` CRUD in api-contract** — that is
**spec-owner AUTHORING work (§0.4), not a one-line ruling** — landed before this surface builds.
**Structurally the simplest surface → the right first-article** (recalibrates the manifest template
before the hard editors). **HARD STOP: to the owner alone.**

### 3.2 — Styler (in-frame card editor)
`styler-states.html` P1–P11 (carousel: persistent hero + 5 attribute sections swiping beneath). NEW:
`AttributeSection`, `BaseRail` (never-blank start-from + Surprise-me, CARD-16), `IntensitySlider`,
`KeepBeat`. Consumes the §1 render module (effect/finish **runtime overlays** = CARD-15's live half). M4
default = the **free-asset** path (COSM-02) → **KEEP / SAVE-PRIVATE** (no publish — that's Canvas-only,
0014). **⟨M5?⟩** the **premium preview-then-acquire → `ReconcileSheet`-at-KEEP** economy path (CARD-13,
shared with Device) is **EXPECTED(M5)** by default (§0.8) — build only under the pull-forward.

### ⛔ 3.3 — **THE FABLE-AUDIT STOP-POINT** (§4) — owner-triggered, once
After the CARD-15 spike (§1) + the Styler first-article, **before Canvas depth**. The render approach +
the card-editor aesthetic are now proven on the first editor — the highest-leverage moment for a
cross-model sanity check before the most expensive surface. **The owner may pause here** and bring a
Fable session (see §4). Optional but recommended.

### 3.4 — Canvas (the deep gesture editor) — **the hardest surface**
`canvas-states.html` P1–P11 (the diegetic press-shop breakout). NEW, the deepest set: `CanvasStage`,
`AssetShelf`/`ElementTray`, `LayerRack`+`Slip`+`EditBar`+`NumPop`, `ProofView` (CARD-15's PROOF face),
`PressSheet`, `PrintRitual` (the first-print ritual, OQ-040). **Build-order within: CARD-15 (done in §1) →
then the depth tails CARD-08/09/10/11.** M4 default: the **free-asset** vector editor → **PROOF** (flattened
preview) → **SAVE-PRIVATE / TO-STYLER**. **⟨M5?⟩** the `PressSheet`'s **PUBLISH** action + **CARD-19**
publish-integrity (rate-limit + hash-dedup + min-complexity) + **CARD-20** immutability are **EXPECTED(M5)**
by default (§0.8) — build under the pull-forward. Risk lanes: **gesture editing** (pull-slip / drag-Z /
long-press ops / precision NumPop — the most gesture-heavy surface) + the **flatten at PROOF**. **Styler↔Canvas
is one draft document** — autosave/crash-recovery must survive the posture switch (OQ-056). **Owner taste
gate + full first-article-grade review here.**

### 3.5 — Device editor (in-frame live edit)
`device-states.html` D1–D10 (SHELL · THEME · STICKERS · LOOKS on the live DeviceShell). NEW:
`StickerStage`, `TransformBox`, `PlacedSticker`, `StickerTray`, `SavedLook`, `LooksGrid`, `KeepBar`. A
**second, simpler composition-JSON** (sticker `{assetId, zone∈forehead|chin, x, y, scale, rotation}`,
live-render not CDN-flatten). M4 default = **free** shell colours / themes / stickers (COSM-02) + saved
LOOKS (DEV-05). Hard rules: **DEV-03/F-04 — nav keycaps z-order ABOVE every sticker** · zone-constrained +
**server-validated** placement · **DEV-04 theme legibility floor**. **⟨M5?⟩** the premium
`KeepBar`→`ReconcileSheet` acquire path (shared with the Styler) is **EXPECTED(M5)** by default (§0.8).

### 3.6 — CARD-16 non-gesture / reduce-motion pass (the launch gate)
Per §0.5 (no artboard exists today). Cover the keyboard/non-gesture path + screen-reader labels +
reduce-motion honoring across the three editors (LayerRack reorder, sticker TransformBox, the swipe
carousel), honoring OQ-105 (non-gesture reorder + focus-trap) / OQ-106 (resilience) / OQ-046 (non-hold
buy alternative). **Branch on the §0.5 ruling:** if **"design pass"** → produce a CARD-16 a11y **board**,
`burt`-audit it, track it in `SCREEN-STATUS.md`, *then* build+verify from it (the design-phase workflow);
if **"spec-driven"** → author the CARD-16 spec IDs (product-spec) + a **custom-lint / review-rule** that
enforces the non-gesture path, then build+verify against it. Either way — **a launch gate; M4 does not
ship without it.**

### 3.7 — Onboarding (only if §0.2 slots it to M4)
O1–O10 (design-spec §2.14): AUTH-06 guided first-run + COL-01 add-rail + **CAT-11** NEW-RELEASES rail +
NOTIF-04 priming stub. Owns the empty-new-user path.

### 3.8 — Effects/finishes roster + free cosmetics (NOT a surface — woven through the editors)
Not a screen that runs the pipeline: the **COSM-01 taxonomy + COSM-02 free baseline set** (frames ·
nameplates · fonts · shell stickers · themes) are the **asset content** the three editors consume, per
the **OQ-010** roster ruling (§0.4). Tracked **inside each editor's manifest** (the assets its
`BaseRail` / `AttributeSection` / `StickerTray` offer) and gated by the §8 DoD line — not a separate
parvati pass. Premium (COSM-03) is **M5 — out of scope here**.

---

## 4. THE FABLE-AUDIT STOP-POINT (the one owner-triggered cross-model gate)

The owner may stop **once** for an independent **Fable-model** audit — the "is the work on the right
track" check they flagged as **key for the Styler/Canvas especially**.

- **Where (recommended):** at §3.3 — after the **CARD-15 render spike** + the **Styler first-article**,
  **before Canvas depth**. This catches render-fidelity, aesthetic-direction, and architecture drift
  *before* the most expensive surface is built on top of them. *(Alternative: the owner may instead place
  it at the Canvas first-article if they'd rather audit the hardest surface directly — but earlier =
  cheaper to course-correct. It is ONE stop either way.)*
- **What the Fable audit checks:** (1) the **CARD-15 render module** — fidelity of the flatten, the
  overlay approach, the cap-30 + size-ladder, the offline/publish split; (2) the **card-editor
  aesthetic** — does the Styler feel like the trophy case (a fresh-model taste read to complement the
  owner's); (3) the **architecture** — the render-module boundary, the reconcile/economy write path, the
  autosave document model that Canvas will extend; (4) a **completeness critic** — what's missing before
  Canvas scales on this.
- **How (the mechanic):** the point is a **Fable _judgment_**, not a fresh Opus subagent — so the owner
  **switches the main session to a Fable model and runs murr + parvati INLINE** (Fable as the reviewing
  context: read the murr + parvati `SKILL.md`s and execute them in-session over the render + Styler diff
  and the running editor), plus a short architect read of the render-module boundary. *(Do NOT dispatch
  these as subagents here — a subagent may inherit the wrong model and can't see pasted device
  screenshots; the whole value is the cross-model Fable read.)* Verdict = **go / adjust**, filed to
  `m4-review-notes.md`.
- **How to resume:** the fresh Opus builder session continues from the filed verdict — adjustments (if
  any) fold into the Canvas manifest before §3.4. The stop-point is **spent** once used.

---

## 5. GATES + DoD MECHANICS

- **G-H** (render-spike budget cap, §1) — owner, M4 entry.
- **Gate-5** (taste — "does it feel like the trophy case") — owner, per aesthetic surface + at exit.
- **G-M** (new-dependency glance — skia + any editor libs) — milestone exit, light.
- **The six-check CI spine** (every PR, unchanged): typecheck → lint → unit → integration (Testcontainers
  PG) → secret-scan → SCA. Plus: spec-ID tags on risk-domain tests · **SYS-07 authz test on every mutating
  endpoint** (adopt/publish/save/reconcile/device-looks are all new mutations) · zod validation ·
  api-contract bumped if the seam changed.

---

## 6. CLOSED BETA — RE-TIMED TO ~M6 (decision 0071; NO LONGER an M4 exit)

**The closed beta moved from ~M4 exit to ~M6** (owner ruling, decision [`0071`](../decisions/0071-beta-retimed-to-social.md)):
the first external tester build waits for **card sharing (M5) + friends (M6)** so it ships the *social*
trophy case, not a solo one. **M4 now completes internally** — the editors + render pipeline + free/
private customization — and flows to M5 with **no external release**. Device-feel at M4 is covered by the
owner's **M2 on-device build** + the **Gate-5 taste passes** on every customization surface; a small
**trusted/internal build stays available on request** during M4/M5 but is not an M4 deliverable.

- **The safety-rail caveat now bites at M6** (where the beta lands, with UGC sharing) — but **block
  (SOC-09) is IN at M6**, so the sharing beta has block; report-reception (M7) + real deletion
  (AUTH-07, M8) still trail → the owner records the **closed/trusted-invite** acceptance at the M6 beta.
  The §0.8 DEFAULT (M4 = free/private, no cross-user UGC) is unchanged.
- **Gate-5 taste** remains the M4 go/no-go for each customization surface (owner device sign-off) — it's
  the M4 quality bar even though there's no M4 external release.
- **CARD-16** (the a11y launch gate) — its *work* stays at M4 (editors' a11y, cheapest while fresh); its
  *release-blocking* status attaches to the **M6 beta**, not an M4 exit.

---

## 7. OUT OF SCOPE (→ M5+, accounted not forgotten)

- **Premium economy & community sharing** — COSM-03 (premium items), ECON-* (store / wallet / IAP /
  receipt validation), plus (by the **§0.8 default**) **publish** (CARD-04/19/20), **adopt** (ECON-03/04),
  the **CARD-13 premium-reconcile**, and the CARD-05/06 tails + contributor revenue → **M5**. M4 ships
  **free / private customization only** (COSM-02) unless §0.8 rules a scoped pull-forward.
- **Earned cosmetics** — COSM-04 → **M7** (achievements).
- **CAT-12** FRIENDS ARE PLAYING → **M6** (SOC-01). **Friend-view / compare** Game-page states → M6/M7
  (compose client-side, no new endpoint at M4).
- **The standalone Lists / Top-editor** — retired into the Collection TOP view (M6); reconcile 0047↔0049.
- **CARD-21** external image-share — weakly-owned; confirm in/out at entry.
- Everything §10-parked (real-data integrations, AI art, remix, rarity, live-ops, etc.).

---

## 8. M4 DEFINITION OF DONE

- [ ] **§0 M4-entry gate resolved** — every ruling recorded (decisions/ + spec/contract bumps), the
      M4-entry decision log filed, `/health` 🟢. (Game-page home · **M4/M5 boundary §0.8** · OQ-056
      StylePreset authored · Onboarding · mis-slots · content OQs · CARD-16 path · OQ-127 · closed-beta
      sign-off.)
- [ ] **§1 CARD-15 render spike passed** — faithful flatten on-device within the G-H budget; go recorded.
- [ ] **COSM-02 free baseline roster** (per OQ-010) delivered and consumed by the three editors; **no
      publish / adopt / premium-reconcile built** unless the §0.8 pull-forward was ruled + rippled.
- [ ] **Every surface:** manifest on file · parvati report in `m4-review-notes.md` with **0 open flags** ·
      murr clean on the diff · CONVENTIONS per-task DoD met.
- [ ] **First-article stop happened** — the owner reviewed the Game page alone before the editors began.
- [ ] **The Fable-audit stop-point** was offered at §3.3 (used or consciously waived by the owner).
- [ ] **CARD-16 non-gesture / reduce-motion pass built** across the three editors (the a11y *work* — its
      release-blocking gate now attaches to the **M6 beta**, decision 0071; still built here while the
      editors are fresh).
- [ ] **Gate-5 taste passed by the owner** on the customization surfaces (the M4 quality bar).
- [ ] ~~Closed beta shipped~~ **RE-TIMED TO ~M6** (decision 0071) — M4 completes internally, no external
      release; the closed-beta + safety-rail sign-off DoD moves to the **M6 exit**.
- [ ] **Receipt per surface** — what changed + IDs touched + anything filed to `open-questions.md`.

---

## 9. INPUTS (the fresh builder starts here)

- **This brief** · [`CLAUDE.md`](../../CLAUDE.md) · [`CONVENTIONS.md`](../../CONVENTIONS.md) ·
  [`docs/00-INDEX.md`](../00-INDEX.md) (truth-precedence + change protocol).
- **Scope:** [`road-to-market.md`](road-to-market.md) M4 row (:138) + gates (:281,300) ·
  [`phase-coverage-audit-findings.md`](phase-coverage-audit-findings.md) (the orphans + mis-slots + patch).
- **Spec:** [`product-spec.md`](../spec/product-spec.md) §5.6 CARD · §5.7 DEV · §5.8 COSM · CAT-11 ·
  [`api-contract.md`](../spec/api-contract.md) (adopt/publish/save/looks seams) ·
  [`design-spec.md`](../design/design-spec.md) §2.4b/§2.5/§2.5b/§2.15.
- **Boards (converged):** `docs/design/mockups/{game-page,styler,canvas,device}/*-states.html` ·
  [`component-map.md`](../design/component-map.md) §8/§9/§11 (M4 component names) · the Design System
  Catalog (Foundation Rules F-01..F-09; audit with the `burt` skill) · `SCREEN-STATUS.md`.
- **Decisions:** 0014 (editor arc) · 0018 (styler/nameplate) · 0030 (device editor) · 0040 (deletion /
  confirm grammar) · 0044 (a11y baseline) · 0048 (card-tap grammar) · 0049 (top-10) · 0060 (dev stack).
- **M3-R precedent** (how the pipeline runs clean): `docs/planning/m3r/` receipts + manifests +
  `m3-review-notes.md`; `m3r-build-task.md` (the pipeline template this brief carries forward).
- **The verification skills:** murr `C:\personal\shipwright\skills\murr\SKILL.md` · parvati
  `.claude/skills/parvati/SKILL.md` · `burt` (DS audit) · `health`.
