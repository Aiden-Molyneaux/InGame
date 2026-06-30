# 0037 — Admin console (§4.4) converge: in-app remediation IDs (OQ-081) + `/admin/*` page-audit

- **Date:** 2026-06-28
- **Status:** accepted
- **Related IDs:** MOD-11 · MOD-12 · MOD-13 · MOD-14 · MOD-15 (new) · MOD-04/05/06/08/09/10 · SYS-08/09/10 · PROF-08
- **Builds on:** [0033](0033-moderator-role-lifecycle-and-console-ia.md) (console IA) · [0034](0034-admin-tier-model-and-privileged-functionality.md) (the P1–P5 taxonomy; reserved the remediation set → OQ-081) · [0035](0035-economy-support-tooling-and-admin-audit-log.md) (MOD-10 audit log)
- **Resolves:** **OQ-081** (in-app remediation additions — IDs + design). OQ-080 (external operator tool) stays parked.

## Context
The §4.4 Admin console was **spec-ready** but undrawn: decision 0034 found the in-app P1/P2 set
needed behaviors beyond the original five actions and **reserved them → OQ-081** for IDs + design at
the design pass. The board `admin-console-states.html` has now converged (tier-adaptive Admin I/II ·
reports split by target · report detail + hide/restore/resolve · `SuspendSheet` MOD-09 · edit-
suggestion review MOD-06 · catalog dedup `MergePicker`/`RestoreRow` MOD-05 · catalog ops · the OQ-081
remediation surfaces · §1.8 lifecycle). A functionality pass confirmed full coverage of the required
in-app set and correct omission of all P3–P5 (external-tool) surfaces. This decision **assigns the
OQ-081 stable IDs**, **page-audits `/admin/*`**, and **formalizes the design-spec §4.4 set** so the
board can converge cleanly.

## Decision
1. **New stable IDs** (product-spec; the OQ-081 set). All are **P1 build-priority**, gated by SYS-08,
   and write a **MOD-10** audit row (actor · action · target · reason · time):
   - **MOD-11 — Field-level remediation** (P1 Content): reset an offensive **username / bio / avatar**
     to default, or **force-rename**; a remedy short of MOD-09 suspension. Emits the MOD-13 notice.
   - **MOD-12 — User investigation view** (the "dossier", P1 Content): report history · prior actions ·
     their content, so a reported user is actioned on context. Admins see the **true** account state
     (the MOD-09 non-disclosure collapse is public-viewer-only).
   - **MOD-13 — Moderation-action notice** (P1 Content): the affected user receives the **why** + the
     **appeal pointer** (Help/Contact, SYS-09). Generalizes MOD-09's suspension notice to the whole set;
     MOD-09 governs what *other* viewers see, MOD-13 is what the *acted-upon* user sees.
   - **MOD-14 — Direct canonical-entry edit** (P2 Catalog, Admin II): edit a catalog game's fields
     **directly** (no user suggestion), distinct from approving an MOD-06 edit-suggestion. Screened MOD-07.
   - **MOD-15 — Junk / non-duplicate catalog removal** (P2 Catalog, Admin II): remove an entry that is
     **not a duplicate** (no merge target), distinct from MOD-05 dedup-merge; soft-delete + the MOD-05
     3-day restore window.
   - **Reused, not new:** **proactive takedown by ID = MOD-08** (the moderation/legal pull, actioned
     without waiting for a report → CARD-18 fallback); **unsuspend = MOD-09** (already reversible).
2. **`/admin/*` page-audit** (api-contract): enumerate the endpoints backing the above —
   `GET /admin/users/:id/dossier` · `POST /admin/users/:id/remediate` · `POST /admin/users/:id/notice` ·
   `PATCH /admin/games/:id` · `DELETE /admin/games/:id` · `POST /admin/cards/:id/takedown` ·
   explicit `POST /admin/reports/:id/hide`·`/restore`. All role-gated (SYS-08), all write a MOD-10 row.
   No role/tier grant-revoke endpoint (still out-of-band, P5 — decisions 0033/0034).
3. **Design-spec formalization** (§1.5 + §2.18): catalog the Admin-console component set —
   `TierBanner` · `CountTag` · `QueueRow` · `ReviewPanel` · `SuspendSheet` · `MergePicker` ·
   `RestoreRow` (`RoleTag` already cataloged, §4.4 ripple) — and add the §2.18 screen composition +
   state matrix. **Utility surface — no on-screen gold** (F-02); destructive actions = `ConfirmSheet`
   + alert-red; reason capture on every privileged action.

## Consequences
- product-spec **0.36** (+MOD-11..15; MOD-04/MOD-10/SYS-08 OQ-081 refs → IDs) · api-contract **0.36**
  (the `/admin/*` page-audit) · design-spec **0.38** (§1.5 Admin-console set + §2.18) · 00-INDEX
  register synced.
- SCREEN-STATUS §4.4 → **✅ converged** (states board · design-spec · api all current).
- **OQ-081 resolved**; OQ-080 (external operator tool — economy/config/governance + the audit-ledger
  viewer + staff roster) stays open and out-of-band.
- No behaviour change to P3–P5: money, config, governance, and role grant/revoke remain external and
  are **not** drawn in-app.
