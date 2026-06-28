# 0034 — Admin tier model, privileged-functionality taxonomy & the in-app/external split

- **Date:** 2026-06-27
- **Status:** accepted
- **Related IDs:** SYS-08, PROF-09, MOD-04, MOD-05/06/07/08/09, ECON-, COSM-, ACH-01, CAT-04
- **Supersedes:** the **role-model + badge** rulings of [decision 0033](0033-moderator-role-lifecycle-and-console-ia.md)
  (the `user/moderator/admin` enum and the tier-labelled public badge). **0033's other rulings stand**
  — out-of-band assignment, console-via-Settings, split-by-target queues, actions-logged, parked
  external tool.
- **Parks/tracks:** OQ-080 (external operator tool — expanded) · **+OQ-081** (in-app content-remediation
  additions).

## Context
While prepping §4.4, two things surfaced: (1) "moderator" vs "admin" had **no behavioral difference**
in the spec — a two-name label over one elevated tier; and (2) a critical pass found the spec defines
only **five** privileged actions, missing whole categories an app with a UGC catalog **and a real-money
economy** needs (content remediation, catalog editing, economy/support, config/authoring, oversight).
You can't assign permissions to tiers until the full privileged-action set is named.

## Decision

### 1. Drop "moderator"; roles are tiered admins
The role model becomes **`role ∈ user | admin`** plus **`adminTier ∈ 1..4`** (null for `user`). The
"moderator" value is **dropped/burned**. Assignment stays **out-of-band** (0033 — no in-app
role-management, no grant/revoke endpoint; lives in the external tool, P5/§10). Tiers are **nested**
(each includes all powers below it).

### 2. Permission groups (the durable unit — by blast-radius) and where they live
| Group | Capabilities | Surface |
|---|---|---|
| **P1 Content** | reports hide/restore/resolve (MOD-01/02/03) · edit-suggestion approve/reject (MOD-06) · suspend/unsuspend (MOD-09) · **field-level remediation** (reset offensive username/bio/avatar; force-rename) · **user investigation view** · **moderation-action notice to the affected user** | **in-app** |
| **P2 Catalog** | dedup-merge + restore (MOD-05) · **direct canonical entry edit** · **junk/non-dup entry removal** · **proactive takedown by ID** (the MOD-08 legal pull, actioned) | **in-app** |
| **P3 Economy/Support** | manual Pixel adjustment (credit/debit) · refund/dispute handling · entitlement claw-back · wallet/ledger/purchase visibility | **external** |
| **P4 Config/Authoring** | store/cosmetic authoring + pricing + drops (ECON-06/COSM-) · achievement/egg authoring + thresholds (ACH-01) · banned-word list (MOD-07) · economy levers (SYS-04) · controlled lists (genres CAT-04, gamertag platforms PROF-02) | **external** |
| **P5 Governance** | role/tier grant/revoke · audit-ledger read · active-staff roster | **external** |

New in-app capabilities in P1/P2 (field remediation, user dossier, action-notice, direct catalog
edit, junk removal, proactive takedown) are **not fully specified here** — they're tracked as
**OQ-081** and get IDs + design at the §4.4 console pass. The P3/P4/P5 capabilities are the
**external operator tool** (OQ-080), expanded with these findings.

### 3. The tiers
| Tier | Bundles | Surface reached | Who |
|---|---|---|---|
| **Admin I — Content** | P1 | in-app console | front-line moderation |
| **Admin II — Catalog** | P1+P2 | in-app console | senior — trusted with shared catalog structure |
| **Admin III — Support** | P1+P2+P3 | in-app console + external tool | handles money/support without being a superuser |
| **Admin IV — Platform** | P1+P2+P3+P4+P5 | + external tool | superuser — config + governance |

The **in-app console (MOD-04) exercises P1+P2 only** (Admin I/II capabilities); P3–P5 live in the
external tool. So Admin III/IV simply *also* have external-tool access — the phone app never hosts
money, config, or role-granting.

### 4. The public badge is generic; tier is private (refines 0033 / PROF-09)
The **public** Profile badge (friend-view) is a **generic "STAFF" / "ADMIN" trust marker** — it does
**not** broadcast the tier (don't paint a target on superusers). The **tier (Admin I–IV) shows on
self-view only**. Payload-enforced: `/users/:id` exposes a generic `staff: true`; `/me` exposes
`role` + `adminTier`.

### 5. The console is renamed
"Admin/Moderator console" → **"Admin console"** (moderator is gone). Settings entry → **Admin
console** (gated to `adminTier ≥ 1`).

## Rationale / alternatives
- **4 tiers with Support split** over 3: a support agent needs to issue refunds / Pixel credits (P3)
  but should **not** hold config or role-granting power (P4/P5). Splitting Support is the one real
  separation-of-duties an IAP app needs; the rest stays a clean nested ladder.
- **Permission groups as the durable unit:** tiers are just bundles — if the org later needs a
  non-nested role, the groups don't move.
- **In-app = reversible/content-adjacent; external = money/config/governance:** keeps a consumer
  phone app free of the dangerous powers (security + ergonomics) — consistent with 0033 already
  exiling role-grant + the audit ledger.
- **Generic public badge:** the trust-marker value (community sees who's staff) without advertising
  who holds superuser.
- **Park, don't over-spec:** the missing capabilities are named and assigned to tiers/surfaces, but
  each is specified when its tool is built (OQ-080 external, OQ-081 in-app) — avoids minting a dozen
  half-baked IDs now.

## Ripple
- **product-spec 0.30:** SYS-08 rewritten (tiered-admin model + permission groups); PROF-09 (generic
  public badge, tier self-only); MOD-04 (console = tiers I/II / P1+P2; renamed); §10 external-tool
  note expanded (P3/P4/P5).
- **api-contract 0.30:** `role ∈ user|admin` + `adminTier` on `/me`; generic `staff` on `/users/:id`;
  the endpoint-less-grant note retained.
- **ui-design-requirements 0.20:** §3.5 (generic badge), §4.4 (renamed; tiers I/II in-app, higher
  external), §4.15 (Admin console entry, `adminTier ≥ 1`).
- **open-questions:** OQ-080 expanded (external tool = P3/P4/P5 enumerated); **+OQ-081** (in-app
  content-remediation additions → IDs + design at the §4.4 pass). **SCREEN-STATUS** row 4.4 + header.
- **decision 0033** marked superseded-in-part (role model + badge).
