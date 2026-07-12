# 0071 — The closed beta moves from ~M4 to ~M6 (ships WITH card-sharing + friends)

**Status:** accepted (owner ruling, 2026-07-10) · **Date:** 2026-07-10 · **Author:** Claude (spec-owner)
· **Rules:** re-times the first external tester build. **Amends** [`road-to-market.md`](../planning/road-to-market.md)
(§2 staged-release table + the build diagram) and the **M4 DoD** ([`m4-build-task.md`](../planning/m4-build-task.md) §6/§8).
Touches [`0062`](0062-m4-entry-gate-rulings.md) §0.8/§6 (the beta safety-rail caveat). Build-order only — no
spec/behaviour change.

## Context
The roadmap put the **closed beta at ~end of M4** — the "trophy case": collection + full **private**
customization, but **no sharing and no friends** (publish/adopt is M5, the friend graph is M6). The owner
ruled: **delay the closed beta until card sharing (M5) and friends (M6) exist**, so the first external
build is a socially-complete experience, not a solo trophy case.

## Ruling
- **The closed beta moves from ~end of M4 → ~end of M6** (Social). Testers' first build is then the
  **social** trophy case: collection · full customization · **published/adopted community cards** (M5) ·
  **friends / profiles / compare / recommendations** (M6).
- **M4 no longer exits to a beta.** M4 (Customization) completes **internally** — the editors (Styler /
  Canvas / Device) + the CARD-15 render pipeline + the free/private customization experience — and flows
  to M5 with **no external release**. The owner's own **on-device build at ~M2** is unchanged (that's his
  phone, not a beta); a small **trusted/internal build during M4/M5 stays available on request** for
  feel/validation, but is not a milestone deliverable.
- **The public launch stays after M7 → M8** (unchanged).

## Why this is sound (and safer)
- **The safety rails now precede the UGC beta.** [`0062`](0062-m4-entry-gate-rulings.md) §0.8/§6 flagged
  the risk of a beta shipping **shared UGC** ahead of **block (SOC-09, M6)**. With the beta AT ~M6, block
  is **in** — the sharing beta has the block affordance. Report-reception (M7) + real deletion (AUTH-07,
  M8) still trail slightly → the owner records acceptance for a **closed/trusted invite** beta at M6 (the
  same caveat, now much smaller).
- **A fuller first impression.** Solo private customization under-sells the app; sharing + friends is the
  actual hook. Better to spend first-tester goodwill on the social experience.

## Tradeoff (recorded, owner-accepted)
Delaying the beta gives up the **early external-validation / morale hit** the ~M4 beta was for ("real feel
before the economy lands"). Mitigations: the M2 on-device build already proves the stack + aesthetic; the
**taste gates (Gate-5) at M4** already give the owner device-feel on every customization surface; and a
**tiny trusted internal build** can be cut at M4/M5 without formalizing a beta if early outside eyes are
wanted.

## Consequences
- **CARD-16 (a11y / reduce-motion — the "launch gate").** Its enforcement was "M4 doesn't ship without
  it" *because M4 shipped the beta*. That **gate now attaches to the M6 beta**. The **work stays at M4**
  (it's the editors' a11y — cheapest done while the editors are fresh, and a11y debt compounds); only the
  *release-blocking* status moves to M6. **Default: build CARD-16 at M4 as planned; it gates the M6 beta,
  not an M4 exit.** (Owner may defer the work too — flagged, not assumed.)
- **M4 DoD** ([`m4-build-task.md`](../planning/m4-build-task.md) §8): the "**Closed beta shipped +
  safety-rail sign-off**" line is **struck from M4** and re-homed to the **M6 exit**; the M6 row in
  road-to-market gains the closed-beta ◆.
- **road-to-market.md** §2 table + the build diagram + the §1 prose: the ◆ closed beta re-labels to ~M6.
- **No product-spec / api-contract change** (pure build-order — 00-INDEX §4 triage).
