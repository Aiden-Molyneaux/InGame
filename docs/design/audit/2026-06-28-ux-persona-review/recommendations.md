# Recommendations — UX Persona Review triage (2026-06-28)

Per-point verdict on every finding. **Verdicts:** `ADOPT` (do it) · `QUICK` (trivial copy/markup,
do now) · `OQ` (behavior → inbox, ID staged) · `DEFER` (real but later) · `RATIFY` (by-design; owner
confirm) · `DROP` (disagree). Behavior IDs = OQ-086..095 from `findings.md`. Owner-overridable.

---

## Sam — average user

### welcome-auth
- **W1 sign-in below hero** → `ADOPT P1`. Returning users are the majority of opens; show a compact sign-in above the fold, hero for first-timers. Cheap, high-traffic.
- **FORGOT? 9px** → `QUICK`. Bump to 11px tappable. No reason to hide recovery.
- **ALL-CAPS errors** → `QUICK`. Sentence case errors; caps fine for button labels. Tone, not puzzle.
- **W9 skip safety** → `QUICK`. Add "verify later in Settings." One line, removes anxiety.

### onboarding
- **O6→O7 asks twice** → `RATIFY`. By-design: value pre-prompt then OS prompt (NOTIF-04). Keep; don't merge. No change.
- **Zero-add → 1-tap next** → `ADOPT`. Ensure inviting-empty's first add is one tap; already close.

### collection
- **Unlabeled tool icons** → `ADOPT`. Labels until first use, then collapse to icons. Re-learnability is the whole 1.1 bet.
- **No "tap card opens game" hint** → `ADOPT`. Fold into the existing flip coachmark, don't add a new one.
- **Double heading** → `QUICK`. One line.

### add-game
- **Jargon "KEEP IT IN HAND"** → `ADOPT`. Plain "Add this game." Keep arcade flavor on confirm, not the verb.
- **CREATE ANYWAY frictionless dup** → `OQ-089`. Behavior — pairs with creation rate-limit.

### styler / canvas
- **3 exits undefined** → `ADOPT`. Outcome labels; demote CANVAS to "Edit art (advanced)." Biggest casual-user cliff.
- **Charged-at-KEEP surprise** → `ADOPT` (running-cost meter) + `DEFER` pricing to OQ-002. Cross-persona #1.
- **CARD-16 / spec IDs in copy** → `QUICK`. Strip all spec IDs from user-facing strings, app-wide grep.
- **Canvas naming** → `CONSIDER`. "Edit Art" clearer, but Styler/Canvas is locked vocabulary; revisit only if testing confirms.
- **3 canvas outcomes copy** → `ADOPT`. One-liner each.

### game-page / device / discover
- **3 nav layers** → `RATIFY`. Intentional; just guarantee back==back. No change.
- **Report under ⋯** → `RATIFY`. Correct for low-use action.
- **Sticker no-go cue / reconcile surprise** → `ADOPT` (plastic-only hint) + same cost-meter as styler.
- **Wishlist add dim** → `ADOPT`. Equal-weight the two adds.
- **Toggle lens forgotten** → `DEFER`. Header echo is clutter risk; revisit if returners report it.

### friends / compare / lists / store / profile
- **Feed-with-no-feed** → `ADOPT`. Cold-start leads with connect, not empty feed. Cross-persona.
- **Privacy reads as broken** → `QUICK`. Copy: "they keep hours private."
- **SAVE-disabled hint** → `QUICK`. "Pick 1 to save."
- **Locked drop timing** → `ADOPT`. Show returns-date or "notify me."
- **5 fresh CTAs** → `ADOPT`. Sequence one primary nudge. **ADMIN II on self** → `RATIFY` (PROF-09 by-design; confirm numerals stay self-only).
- **Contributor vs Profile** → `ADOPT`. Clearer entry label/eyebrow.

## Rex — adversarial (behavior-heavy)
- **Hours uncapped (4-system rot)** → `OQ-086 P0`. Top risk; cap + anomaly review.
- **Refund→keep→negative** → `OQ-087 P0`. Lock/clawback on reversal.
- **Report-bomb** → `OQ-088 P0`. Reporter cap + dedupe.
- **CREATE ANYWAY rate-limit** → `OQ-089 P0`.
- **Silent unfriend/block** → `OQ-090`. ConfirmSheet; tie OQ-061.
- **Enumeration (username/email)** → `OQ-093`. Throttle + neutral copy.
- **Invite token no expiry** → `OQ-094`. **Daily clock** → `OQ-092`. **Spend idempotency** → `OQ-091`. **Adopt/queue cap** → `OQ-095`.
- **a11y non-hold buy** → `ALREADY OQ-046`. **Canvas DELETE confirm** → `ADOPT` (cheap guard). **Resend caps** → fold into OQ-093.

## Pip — perfectionist
- **Global reduce-motion contract** → `ADOPT P2`. Foundation; build before any animation ships.
- **Styler redraw + KEEP beat** → `ADOPT P2`. Signature interaction. **Celebration motion** (achievements/onboarding) → tie OQ-040.
- **Non-gesture reorder** → `ADOPT P3`. a11y blocker (discover/lists).
- **ARIA/role sweep, color+label, NavBand feedback, SR ratings** → `ADOPT P3`. One batch.
- **~17 missing animations** → `DEFER` to the motion track; styler+celebration first, rest at build.
- **Static skeletons shimmer** → `DEFER`. Nice-to-have after reduce-motion exists.

---

## Net
- **4 P0 spec guards:** OQ-086/087/088/089. + social-confirm 090, enumeration 093, then 091/092/094/095.
- **~10 quick wins** (copy/markup) shippable into a design-spec pass now.
- **2 tracks:** motion-system (P2), a11y (P3). **3 RATIFY** (pre-prompt, nav layers, self-tier). **0 DROP** — findings held up.
