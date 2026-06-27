# Admin console (§4.4 · `MOD-04`) — mockup track

The **in-app** half of the admin model — **P1 Content + P2 Catalog** (tiers **Admin I / II**). IA +
role model are owner-settled (decisions **0033 / 0034 / 0035**); this track builds **ONE** coherent,
**tier-adaptive** direction → Burt-clean → owner gate. P3–P5 (economy/config/governance) live in the
external operator tool and are **never drawn in-app**.

## Files
- [`admin-console-brief.md`](admin-console-brief.md) — the plan + grounding + flags.
- [`admin-console-states.html`](admin-console-states.html) — **the board** (one coherent direction;
  all screens/states incl. BOTH tier views + lifecycle). **Open this directly to review.**
- `README.md` — this file.
- Converge target (later, after the gate): design-spec §4.4 formalization + the `/admin/*` page-audit.

## What's on the board (21 artboards · 7 stages)
1. **Hub (tier-adaptive):** H1 Admin II (REPORTS · EDIT SUGGESTIONS · CATALOG + pending `CountTag`s) ·
   H2 Admin I (**CATALOG section ABSENT** — gated, not teased). `TierBanner` + `‹ SETTINGS` back-seam.
2. **Reports queue — split by target (`SectionSwitch /rail`):** Q1 CARDS (populated, MOD-02 soft-hidden
   flag) · Q2 USERS (avatars, +details hint, already-suspended flag) · Q3 GAMES empty "queue clear".
   Active rail card = orange **`StateMark`** + accent border (no pip).
3. **Report detail + action (`ReviewPanel`):** R1 card report (hide/restore/resolve + STAFF-ONLY details
   note, MOD-01/02/03) · R2 HIDE confirm (alert-red `ConfirmSheet` + logged reason · CARD-18 fall-back) ·
   R3 user report (+ SUSPEND + INVESTIGATE) · R4 **`SuspendSheet`** (temp/indefinite + reason, MOD-09).
4. **Edit-suggestion review (MOD-06 · P1):** D1 old→new (wrong studio), attributed → Approve/Reject.
5. **Catalog (P2 · Admin II):** C1 **`MergePicker`** (dup + canonical) · C2 MERGE confirm (re-points) ·
   C3 restore window **`RestoreRow`** + countdown (MOD-05) · C4 catalog ops (direct edit · junk removal ·
   proactive takedown by ID, MOD-08).
6. **OQ-081 remediation (P1 · proposed — IDs at converge):** M1 user investigation **dossier** (+ Unsuspend) ·
   M2 **field-level remediation** (reset/clear/force-rename — short of suspension) · M3 **moderation-action
   notice** (the "why" + appeal pointer, SYS-09).
7. **Lifecycle (§1.8):** L1 Skeleton · L2 LoadError (Signal Lost + RETRY) · L3 Offline (reads + writes
   gated — the console can't run from cache, SYS-10).

## New components (built here · names ratified at converge)
`QueueRow` · `ReviewPanel` · `SuspendSheet` · `MergePicker` · `RestoreRow` (countdown) · `TierBanner` ·
`CountTag` · the remediation surfaces (`Dossier` · field-remediation rows · `ActionNotice`) · the
catalog-ops surfaces · the Profile **`RoleTag`** (built on the converged Profile board) + the role-gated
Settings row.

## Burt — DS compliance
**PASS ✅** (0 blocker · 0 major). Reconciled against F-01..F-09 + the flat Scanline-Energize (F-03) +
StateMark (F-09) directives. Pre-flight clean; the only candidates were the gold STORE keycap + the pink
NavBand pip (both **shell**, allowed) and off-scale type/radius in the **outer documentation chrome**
(F-06/F-07 exempt). One refinement applied: the card-evidence thumb snapped to the catalog `/thumb`
(44×62) so it's an on-guide GameCard size (F-01).

## Cross-board ripples (made this pass — re-formalization owed)
Three minimal, labelled additions to converged boards (called out at the gate):
1. **`profile-states.html`** — the **`RoleTag`** staff badge (PROF-09): generic public "STAFF/ADMIN",
   tier shown on self-view only. → §3.5 re-formalization owed.
2. **`settings-states.html`** — the role-gated **Admin console** row (visible only `adminTier ≥ 1`).
   → §4.15 re-formalization owed.
3. **`store-states.html` (P8 Wallet)** — the **operator-adjustment** ledger entry (`ECON-11`
   `admin_adjustment`). → §4.12 re-formalization owed.

## Flags for the owner gate (don't silently decide)
- **OQ-081 remediation surfaces** drawn as **proposals** — ratify the set, mint IDs at converge.
- **`/admin/*` page-audit owed at converge** — the OQ-081 surfaces (field remediation · dossier read ·
  action-notice · direct canonical edit · junk removal · takedown-by-ID) + a per-tier section gate have
  **no enumerated endpoints** yet.
- **The 3 cross-board ripples** above need re-formalization into §3.5 / §4.15 / §4.12.
