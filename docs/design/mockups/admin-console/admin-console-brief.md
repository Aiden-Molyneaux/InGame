# Admin console (§4.4 · `MOD-04`) — ONE coherent, tier-adaptive direction → Burt-clean → owner gate

The **§4.4 Admin console** design pass — the **in-app** half of the admin model (**P1 Content + P2
Catalog**; tiers **Admin I / II**). The IA + role model are **OWNER-SETTLED** (decisions
**0033 / 0034 / 0035**), so this is **not** a multi-draft exploration: build **ONE** coherent,
**tier-adaptive** direction, Burt-clean it, present at the owner gate. The page renders the screen;
the spec is the authority — never hand-patch behavior.

Self-brief sources: product-spec **SYS-08** (role/tier model) · **MOD-01..10** · **ECON-11** ·
ui-design-req **§4.4** (the contract) + §3.5 / §4.15 / §4.12 (the three converged neighbours) ·
api-contract Moderation/admin (`/admin/*` + the `/me` vs `/users/:id` role asymmetry) · the DS catalog
(F-01..F-09, the **F-06 scale 21/15/11/9**, tokens, §1.6/§1.8 lifecycle) · the mirrors
`settings-states.html` (shell · lean-list · `ConfirmSheet` · `Toggle`) · `device-states.html` (the
`SectionSwitch /rail`) · `report-states.html` (the user-side report vocabulary) · SCREEN-STATUS row 4.4
(⬜ IA-settled → 🔶 at first build).

## The role model (load-bearing — what the page draws against)
- Role = **`role ∈ user|admin` + `adminTier ∈ 1..4`** (moderator dropped, 0034). Nested tiers:
  **I Content (P1) · II Catalog (P2) · III Support (P3) · IV Platform (P4+P5)**.
- The **in-app console hosts P1 Content + P2 Catalog ONLY.** P3–P5 (economy/config/governance) live in
  the **external operator tool** — **never drawn in-app** (decisions 0034/0035).
- **Gated to `adminTier ≥ 1`** · reached via **Settings → Admin console** · **no role-management UI**
  (grant/revoke is out-of-band, SYS-08 / §10 / OQ-080).
- **MOD-10:** every privileged action is **audit-logged** (actor · action · target · reason · time).
  The ledger *viewer* is external (not drawn) — but **every action carries a reason** because it's
  logged.

## Tier-adaptive — draw BOTH views (decision 0035)
The console **gates its own sections by the viewer's tier** — the mockup must render BOTH:
- **Admin I (P1 Content):** reports queue · suspension · the OQ-081 remediation set. The catalog (P2)
  section is **ABSENT** — not locked-with-a-teaser, **absent**.
- **Admin II (P1+P2):** the above **plus** catalog dedup/merge · direct canonical edit · junk removal ·
  proactive takedown.
- Admin III/IV see the **same in-app console as Admin II** — their extra powers are external; **do NOT
  draw economy/config/governance anywhere in-app.**

Operator = **Maverick, Admin II** (so the full P1+P2 view renders); an **Admin I** cut of the hub proves
tier-adaptivity. Cast reused (Maverick / Riko) where users appear.

## Screens + states (one coherent board: `admin-console-states.html`)
- **Hub** (role-gated landing; `‹ SETTINGS` back-seam; a **tier banner**; per-function **pending
  counts**). Drawn for **Admin II** (REPORTS · EDIT SUGGESTIONS · CATALOG) **and Admin I** (CATALOG
  absent).
- **Reports queue — split by target type** (CARDS · GAMES · USERS) switched by a **bottom-docked
  `SectionSwitch /rail`** (flat · icon in-line · **no pip** · **orange `StateMark`** active). Empty
  ("queue clear") + populated. Rows (`QueueRow`): reported object + reason + reporter/age + **soft-hidden
  flag** (MOD-02).
- **Report detail + action** (`ReviewPanel`): **hide / restore / resolve** (MOD-01/02/03); the
  staff-facing **details note** shown (MOD-01). USER reports also → **Suspend** (`SuspendSheet`: temp
  until-date / indefinite + reason; invalidates sessions; reversible; MOD-09) + **Unsuspend** for an
  already-suspended user.
- **Edit-suggestion review** (MOD-06 · P1): old→new, attributed → **Approve / Reject**.
- **Catalog dedup/merge** (MOD-05 · **P2**): a `MergePicker` (pick duplicate + canonical → **Merge** —
  warns it re-points collections + cards) → a 3-day **restore-window** list (`RestoreRow` with a
  **countdown** + **Restore**).
- **Catalog ops** (P2): **direct canonical edit** · **junk-entry removal** · **proactive takedown by
  ID** (MOD-08).
- **OQ-081 remediation additions** (P1/P2 — propose the surfaces, **flag for IDs at converge**):
  **field-level remediation** (reset an offensive username/bio/avatar; **force-rename** — a remedy
  short of suspension) · a **user investigation view** (report history + prior actions + their content)
  · a **moderation-action notice** to the affected user (the "why" + appeal pointer) · **direct
  canonical edit** · **junk-entry removal** · **proactive takedown by ID**.
- **Lifecycle:** **Skeleton** · **LoadError** (Signal Lost + RETRY) · **Offline** (the console needs
  connectivity — SYS-10 caches only own profile/collection; reads + writes gated). §1.8 reused verbatim.
- **Note:** the console shows admins the **TRUE** account state (the MOD-09 "unavailable" non-disclosure
  collapse is for *public viewers*, not here).

## F-02 / styling — a UTILITY surface
- **NO gold anywhere on screen chrome** (nothing acquisitive). The physical shell `NavBand` keeps its
  gold STORE keycap (shell, not screen). **PROFILE tab active** (the console is a Settings sub-surface —
  Settings sits under PROFILE; **no console nav key**).
- **Positive / primary** (Approve · Restore · Resolve) = **orange / cream**.
- **Destructive / consequential** (Hide · Reject · Merge · Suspend · remediate · takedown) =
  **`ConfirmSheet` + alert-red** (the ECON-09 negative-wallet red precedent). Every such confirm
  carries a **reason** (MOD-10 audit).
- Build **FLAT — Scanline Energize** (F-03): no raised edge / travel; active = scanlines over a
  hairline-darkened fill, no motion, one `.btn:active` rule.
- On-screen marker = orange **`StateMark`** pixel-square; **never** pink on screen chrome (F-05/F-09).
- **F-06 law on screen — 21/15/11/9** (audit px, not just font families). Tokens/shell/fonts inherited
  verbatim (Chakra Petch screen · Paytone One plastic, F-08; Google Fonts via `media="print"` onload;
  built-in SVG only).

## Components — compose from §1.5; flag the new ones at the gate
**Reuse:** Settings lean-list (`well`/`row`/`ric`/`rl`/`rsub`/`rv`/`chev`) · `ConfirmSheet` · `Toggle` ·
`SectionSwitch /rail` (device) · `ListRow`/`Strip` · `SectionHeader` (+`TertiaryLink`) · `GameCard`
thumbs (card reports) · `Avatar` (user reports) · flat `KeycapButton`/`ToolKeycap` · `StateMark` ·
`.return-link` (the `‹ SETTINGS` / `‹ HUB` back-seams) · `DeviceShell` + `NavBand` · the §1.6/§1.8
lifecycle.
**NEW (built + flagged at gate):** the report `QueueRow` + `ReviewPanel` · `SuspendSheet` · dedup
`MergePicker` + `RestoreRow` (countdown) · the **`TierBanner`** (hub tier marker) + **`CountTag`**
(pending counts) · the OQ-081 remediation surfaces (**user dossier** · **field-remediation panel** ·
**moderation-action notice**) · the **catalog-ops** surfaces (direct edit · junk removal · takedown).
*(The Profile **`RoleTag`** + the role-gated Settings row are built on the converged neighbours — see
Cross-board.)*

## Cross-board additions (the owner's explicit ask — minimal, labelled; flag as re-formalization ripples)
Touch ONLY these three converged boards; make minimal, clearly-labelled additions; call each out at the
gate as a re-formalization ripple owed to §3.5 / §4.15 / §4.12:
1. **Profile (`profile-states.html`) — staff badge (`PROF-09`):** a small **`RoleTag`** next to the
   username. **Public/friend-view = generic "STAFF" / "ADMIN" (tier HIDDEN).** **Self-view also shows
   the tier** (Admin I–IV). **Absent** for normal users (header reads clean). Draw self, self-with-tier,
   and friend-view-of-an-admin.
2. **Settings (`settings-states.html`) — Admin console entry:** a **role-gated row** (visible only when
   `adminTier ≥ 1`) opening the console. **Invisible** to normal users. No role-management here.
3. **Wallet (`store-states.html` P8) — ledger entry:** add the **operator-adjustment** ledger row type
   (`ECON-11` `admin_adjustment` — a plain credit/debit the user didn't initiate). One row in the ledger
   list; reuse the existing entry styling.

## Sample data (illustrative — caption-marked; content not spec'd)
Operator = **Maverick, Admin II**; an **Admin I** hub cut too. Queue items: a **reported card**
(offensive title) · a **reported game** (duplicate — Halo vs HALO) · a **reported user** (harassment +
the staff-facing details note) · an **edit suggestion** (wrong studio) · a **dedup pair mid-merge** with
a 3-day countdown. Counts marked illustrative.

## Surface these at the gate (don't silently decide them)
1. **OQ-081 remediation surfaces** — drawn as **proposals**; recommend the owner ratify the set, then
   mint IDs (field-remediation · user-dossier · action-notice · direct-edit · junk-removal · takedown)
   **at converge**. Don't mint IDs this pass.
2. **`/admin/*` contract coverage** — `/admin/reports`, `/admin/edit-suggestions`, `/admin/games/:id/
   {merge,restore}`, `/admin/users/:id/{suspend,unsuspend}` exist. The OQ-081 surfaces (field
   remediation, dossier read, action-notice, direct canonical edit, junk removal, takedown-by-ID) and a
   per-tier section gate have **no enumerated endpoints** → flag for the **API page-audit at converge**
   (the Contributor/Achievements precedent).
3. **The 3 cross-board ripples** — §3.5 / §4.15 / §4.12 re-formalization owed (badge · gated row ·
   ledger entry).

## Scope / git
- Create under `docs/design/mockups/admin-console/`. Read from `settings/`, `device/`, `report-sheet/`,
  `store/`. Touch ONLY `profile-states.html`, `settings-states.html`, `store-states.html` among
  converged boards (the 3 minimal additions). Edit **SCREEN-STATUS row 4.4** (+ note the 3.5/4.15/4.12
  ripples); **append-only** to open-questions if a real gap surfaces.
- Personal account `Aiden-Molyneaux`, HTTPS, identity set — don't override; **commit immediately,
  staging only own paths** (concurrent tracks may be live); `git pull --rebase` before every push;
  commit messages name the IDs (`MOD-` / `SYS-08` / `ECON-11`).

## File map
`docs/design/mockups/admin-console/`
- `admin-console-brief.md` — this plan
- `admin-console-states.html` — the single coherent, tier-adaptive board (all screens/states + BOTH
  tier views + lifecycle)
- `README.md` — the file map + flags + Burt outcome
- Converge target (later, after the gate): design-spec §4.4 formalization + the `/admin/*` page-audit.

## Process
1. Author this brief → flip SCREEN-STATUS row 4.4 (⬜ → 🔶) → commit (stage only own paths).
2. Build `admin-console-states.html` (all screens/states incl. BOTH tier views) → **run `burt`** → fix →
   re-run until clean → verify headless Edge, READ the render, walk every state → **delete every
   screenshot before the turn ends** (HTML only, never PNG).
3. Make the 3 minimal converged-board additions → CALL THEM OUT as ripples → README row → commit →
   `pull --rebase` → push.
4. **OWNER GATE — STOP.** Summarize: console IA as built · the two tier views · destructive-confirm
   grammar · the OQ-081 surfaces proposed (for IDs at converge) · the 3 cross-board ripples · Burt
   outcome · any `/admin/*` affordance not yet in the contract (flag for page-audit). Owner opens HTML.
