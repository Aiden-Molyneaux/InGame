# 0035 — Economy/support operator tooling, the admin audit log & the tier-adaptive console

- **Date:** 2026-06-27
- **Status:** accepted
- **Related IDs:** ECON-11 (new), MOD-10 (new), ECON-07/09, SYS-08, MOD-04
- **Builds on:** [0034](0034-admin-tier-model-and-privileged-functionality.md) (the P1–P5 taxonomy;
  this decides *how* the P3 economy/support slice + the P5 audit ledger get delivered).
- **Tracks:** OQ-080 (external operator UI — refined).

## Context
The admin-tier pass (0034) flagged the biggest *unbuilt* risk: an app with real-money IAP has
**zero** economy/support tooling — no way to refund, credit Pixels, or claw back an entitlement —
and that's needed *before* IAP launch, not after. This decides how to deliver it without building a
full external admin app prematurely, and pins the foundation pieces that can't be retrofitted.

## Decision

### 1. Split P3 by who owns the money (ECON-11)
- **IAP / real dollars** (refunds, disputes, chargebacks): **owned by the platform** (Apple/Google) +
  **RevenueCat**. We **do not build** an in-house refund tool — we **react** via the existing
  `/iap/webhook` refund reversal (ECON-09). RevenueCat's own dashboard covers purchase history +
  promotional grants.
- **Our Pixel ledger + entitlements**: an operator may **credit/debit Pixels** (goodwill, bug
  correction) and **grant / claw back a cosmetic entitlement** (the v2 exception to ECON-09's
  "not clawed back"). This is the only genuinely-new tooling — and it's small.

### 2. Every adjustment is audited and goes through the service layer
No raw balance writes, ever. Each adjustment writes **one `admin_adjustment` ledger row** (ECON-07,
user-visible) **+ one audit row** (MOD-10), carrying the **operator's identity + a reason**. This
invariant is the whole game: get it right and a UI later is just a face.

### 3. The admin-action audit log is foundation, not deferred (MOD-10)
An **append-only** log — actor · action · target · reason · timestamp — written by **every**
privileged action (moderation *and* economy), from day one. Same reasoning as the ACH-08 event
convention: you cannot back-fill decisions that weren't logged. The **viewer** over this log is the
external tool (P5); v2 guarantees only that the log is **written**.

### 4. Staged delivery
| Stage | What | When |
|---|---|---|
| **0 · Data foundation** (non-deferrable) | `admin_adjustment` ledger type + `admin_audit_log` table + `users.admin_tier` | with the Phase-4 economy (audit convention in Phase-1 foundation) |
| **1 · Platform** | RevenueCat + Apple/Google for IAP refunds/disputes/history (≈free; ECON-09 already reconciles) | now |
| **2 · Audited service-layer ops** | `grantPixels` / `adjustEntitlement` / `clawback` via a protected internal route or runbook — **no UI** | **launch-blocking** for IAP |
| **3 · Operator web UI** | a thin internal tool wrapping those ops + read views | **deferred → OQ-080** until volume justifies |

**Net:** don't build the external admin app for launch. Lean on RevenueCat for dollars; build the
audited Pixel/entitlement ops (Stage 0+2) with the Phase-4 economy; defer the UI. The risk to avoid
is shipping the economy *without* the audit log + adjustment ledger type baked in.

### 5. The in-app console is tier-adaptive (refines 0034 / MOD-04 — presentation)
The in-app Admin console serves **Admin I (P1 only)** and **Admin II+ (P1+P2)** — so it **gates its
own sections by the viewer's tier**: Admin I sees reports / suspend / remediation but **not** the
P2 catalog tools; Admin II+ sees everything. The console **never** surfaces P3–P5 (economy / config /
governance) — those holders simply *also* have the external tool. The §4.4 mockup must draw an
**Admin I view** and an **Admin II view**, not one all-powers screen.

## Rationale / alternatives
- **React-to-refunds over build-refunds:** the platform owns the dollar refund flow; rebuilding it
  in-house is wasted work and a compliance surface. We only need to reconcile (ECON-09, exists).
- **Audit-first:** the log is cheap to write and impossible to back-fill — so it's foundation, even
  though its *viewer* is deferred.
- **Ops before UI:** a runbook/internal route delivers the launch-blocking capability for near-zero
  cost; the UI is a volume-driven nicety.
- **Tier-adaptive console over per-tier separate screens:** one console that hides what your tier
  can't do is simpler than distinct apps and matches the nested-tier model.

## Ripple
- **product-spec 0.31:** +ECON-11, +MOD-10; ECON-07 ledger gains `admin_adjustment`; §6 gains
  `admin_audit_log`; §8 foundation gains the audit convention (Phase-4 lands ECON-11); §10 refined.
- **api-contract 0.31:** ledger `type` += `admin_adjustment`; the ops-are-out-of-band note.
- **ui-design-requirements 0.21:** §4.4 tier-adaptive console (Admin I vs II views; never P3–P5);
  §4.12 Wallet ledger shows the `admin_adjustment` entry (small ripple to the converged board).
- **open-questions:** OQ-080 refined (data foundations now specced; only the operator UI is parked).
  **SCREEN-STATUS** row 4.4 / 4.12.
