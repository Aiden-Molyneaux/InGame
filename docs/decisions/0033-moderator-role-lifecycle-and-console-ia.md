# 0033 — Moderator/admin role lifecycle, the Profile role badge & the console IA

- **Date:** 2026-06-27
- **Status:** accepted — **role model & badge superseded by [0034](0034-admin-tier-model-and-privileged-functionality.md)**
  (the `user/moderator/admin` enum → tiered admins; the tier-labelled badge → generic public badge).
  0033's **other rulings stand**: out-of-band assignment, console-via-Settings, split-by-target queues,
  actions-logged, the parked external tool.
- **Related IDs:** SYS-08, PROF-09 (new), MOD-04, MOD-01/03/09
- **Resolves:** the role-lifecycle gap surfaced while prepping the §4.4 Admin/Moderator console
  design pass (grant / know-you-hold-it / revoke were unspecified). **Parks → OQ-080.**

## Context
Decision 0007 established that every user has a **role** (user / moderator / admin, SYS-08) and that
the **Admin/Moderator console** (MOD-04) is gated to it. But the *lifecycle* of the role was never
specified: **how a role is granted, how a user knows they hold it, how it is revoked**, and **where
the console is reached from**. The §4.4 design pass needs these settled so the mockup draws against
real behavior rather than inventing a role-management screen.

## Decision (owner rulings, 2026-06-27)

1. **Role grant/revoke is out-of-band.** Moderator/admin roles are assigned and revoked
   **outside the app** (direct data change / ops / an internal operator tool) — **not** a self-serve
   in-app surface. There is **no in-app role-management UI and no role-grant/revoke endpoint** in v2.
   This keeps the surface tiny, consistent with 0007's light-touch framing, and avoids a
   privilege-escalation surface in the consumer app. *(Clarifies SYS-08.)*

2. **A user knows they hold the role two ways** — both passive, both gated to the role:
   - **A role badge on their Profile** (new **PROF-09**): a small `MOD` / `ADMIN` marker next to the
     username. Self-view = "you hold this"; **friend-view = a public trust marker** (others can see
     who the moderators/admins are — deliberate transparency, not a secret).
   - **The Settings entry appears.** The console is reached via a **Settings → "Mod/Admin"** row
     that renders **only** for role-holders (invisible to normal users).

3. **The console is reached from Settings**, not a tab or the Profile. Settings → **Mod/Admin** →
   a hub for the three MOD-04 functions (reports queue · edit-suggestion review · catalog
   dedup/merge). *(IA placement — the detail lives in ui-design-req §4.4 / §4.15.)*

4. **The reports queue is split by target type.** Card-reports, game-reports and user-reports each
   get a **separate but equivalent** queue screen, switched by a **bottom-docked section rail** (the
   `SectionSwitch /rail` grammar from the Device editor, OQ-063). User-report screens carry the
   suspension action (MOD-09); the dedup flow keeps its 3-day restore window (MOD-05). *(Flow /
   presentation — design direction in ui-design-req §4.4, drawn in the §4.4 mockup.)*

5. **Moderator actions are logged for auditability.** Hide/restore, approve/reject, merge and
   suspend are recorded (actor · action · target · reason · time) — generalizing MOD-09's existing
   "logged" requirement. The **operator-facing tooling that reads this ledger is out of v2 scope**
   (see Parked, below); the point of recording now is that the data exists from day one (the same
   reasoning as ACH-08's event convention — no retrofit later).

## Parked (captured, not built — owner: "we can think on it more later")
An **external operator/admin tool** — outside the consumer app — that surfaces **active
moderators/admins**, **report entries across the system**, and a **traceable, append-only ledger to
audit moderator decisions** (who hid what, who approved/merged/suspended whom, when, and why). This
is the natural home for **role grant/revoke** (ruling 1) too. Recorded as a parked big idea
(product-spec §10) and tracked as **OQ-080**. Not in v2 scope; the in-app console (MOD-04) stays the
light-touch moderator surface.

## Rationale / alternatives
- **Out-of-band role assignment** over an in-app admin-grants-roles screen: v2 has a handful of
  trusted operators; an in-app escalation surface is risk with no payoff at this scale. Revisit with
  the external tool (OQ-080) if the moderator population grows.
- **Public role badge** over a private "you're a mod" notice: a visible badge does double duty —
  it's how *you* learn you hold the role and how the *community* learns who to trust. Cheap, honest.
- **Split queues + rail** over one unified queue: the three target types (card / game / user) carry
  different context and different actions (only user-reports suspend), and the rail grammar is already
  established (Device editor) — equivalent screens keep the moderator oriented.
- **Log now, tool later:** recording the audit trail is cheap and irreversible-if-skipped (you can't
  back-fill decisions that weren't logged); the *viewer* is deferrable.

## Ripple
- **product-spec 0.29:** SYS-08 clarified (out-of-band assignment + how-you-know); **+PROF-09**
  (role badge); MOD-04 clarified (reached via Settings · actions logged · external tool parked);
  §10 gains the parked external moderator/audit tool.
- **api-contract 0.29:** an explicit note that role grant/revoke is **intentionally endpoint-less**
  (out-of-band); profile payloads (`/me`, `/users/:id`) expose `role` to drive the PROF-09 badge.
- **ui-design-requirements 0.19:** §3.5 (role badge), §4.4 (console IA — Settings entry, no
  role-management UI, split queues + rail, suspension-from-user-report, restore window), §4.15
  (the role-gated Mod/Admin Settings row).
- **open-questions:** +OQ-080 (the parked external tool). **SCREEN-STATUS:** row 4.4 note + the
  3.5 / 4.15 design-ripple debt (badge + gated entry row owed on the converged boards).
