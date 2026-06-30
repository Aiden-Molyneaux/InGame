# 0040 — Card deletion semantics + unified destructive/session confirm

**Date:** 2026-06-29 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** CARD-14 (deletion guard) · SOC-08/09 (actor confirm) · design-spec §1.5 `ConfirmSheet`
**Closes:** OQ-061 · also resolves the UX-audit findings **L005 / L045 / L052** (silent destructive
actions; inconsistent confirm grammar) — see `docs/design/audit/2026-06-28-ux-persona-review/LEDGER.md`
**Bumps:** product-spec 0.37 · api-contract 0.37 · design-spec 0.41

## Context
The Game-page card switcher (COL-06, the OQ-056 customizations view) needs an explicit **delete**
affordance, which exposed deletion rules the spec hadn't fully pinned. Separately, the UX persona
audit found destructive/session actions firing **silently** and the confirm grammar **inconsistent**
across boards (account-delete had a `ConfirmSheet`; unfriend/block/logout/admin-destructive did not),
and OQ-061(d) explicitly asked to reconcile the destructive-confirm component (centered modal vs the
page's bottom-sheet idiom). These are the same question.

## What was already settled (not re-litigated)
- **CARD-20** — published cards: a never-adopted published card is deletable; an **adopted** one can
  only be **unpublished** (adopters keep their flattened card + grant, count freezes). ✅ unchanged.
- **CARD-14** — drafts/private are deletable; autosave + crash recovery + unsaved-exit guard. ✅
- **api** `DELETE /cards/:id` already encodes "draft/private/never-adopted → delete; adopted →
  unpublish." ✅
- **`ConfirmSheet`** already exists as the **single** summoned-drawer confirm component (design-spec
  0.17 completed the `ConfirmDialog→ConfirmSheet` rename; "one component, two uses"). ✅

## Ruling (owner)
**A. Card deletion (OQ-061) — adopt the recommendation as-is:**
1. **Cannot delete an equipped card** — switch the displayed card first (COL-06). Server rejects a
   delete of the equipped design.
2. Deleting an **owned design** (draft/private/never-adopted-published) removes it **everywhere** —
   the per-game switcher *and* the global My-Designs shelf (`/me/cards`). Cards are per-game, so this
   is one and the same entity.
3. **Published-with-adopters** → not deletable; **unpublish** only (per CARD-20) — adopters keep their
   copies + grant, gallery entry persists for attribution, count freezes. (Confirms CARD-20.)
4. **Adopted** card delete = remove **your downloaded copy only** — no effect on the creator, the
   public gallery entry, or the adoption count.
All owned-design deletes go behind a **destructive confirm** (below).

**B. Confirm grammar — ONE bottom-sheet `ConfirmSheet` everywhere** (resolves OQ-061(d) + L045/L052).
There is no centered-modal variant. Every destructive or session-ending action summons the same
`ConfirmSheet` (no grab handle; consequence carried by copy + a `brand.alert` red destructive
`ScreenButton`). The **enumerated action set** that requires it:
- account deletion (AUTH-07) · **card/design deletion** (CARD-14) · **unfriend & block** (SOC-08/09)
  · **sign-out / session end** · **admin destructive ops** (hide/suspend/merge/force-rename, MOD-*)
  · **canvas slip/layer delete** (the editor slip-delete, audit L015 — editor-appropriate: a lightweight
  confirm OR an undo-toast, the designer's call at M4; tracked here so it's not lost).
**Target-silence is unchanged** — SOC-08's "decline/unfriend is silent (the other party isn't
notified)" stays by-design (decision 0010); this ruling adds the **acting user's** pre-confirm only.
These are orthogonal: the *target* still isn't told; the *actor* now gets a guard against mis-taps.

## Ripple
- **product-spec 0.37:** CARD-14 gains the **equipped-guard** + **adopted = remove-your-copy-only**
  clauses; SOC-08/09 note the **actor `ConfirmSheet`** (target-silence unchanged); a cross-ref that
  `ConfirmSheet` is the sole destructive/session confirm.
- **api-contract 0.37:** `DELETE /cards/:id` rejects an equipped design (`409 CARD_EQUIPPED`); adopted
  delete is the existing remove-copy path.
- **design-spec 0.41:** §1.5 `ConfirmSheet` entry enumerates the action set above; the centered-modal
  ambiguity is explicitly retired (it was already renamed in 0.17 — this closes it).
- **Boards — DONE (2026-06-29):** Friends gained P7 UNFRIEND + P8 BLOCK `ConfirmSheet` states
  (target-silence made explicit in copy, SOC-08/09); Settings gained an S7b SIGN OUT `ConfirmSheet`.
  NOTE (owner's eyes): SIGN OUT uses the **standard accent** confirm button, not red `/destructive`
  (session-end is reversible) — flip to red if you want it heavier.
