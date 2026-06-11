# 0015 — Engagement moments: image-share un-parked, post-publish push moment, provenance, the moments layer

- **Date:** 2026-06-11
- **Status:** accepted
- **Related IDs:** **CARD-21 (new)**, CARD-01, NOTIF-04 (behavior) · OQ-040, OQ-004 steering
  (presentation/content). Ripples: product-spec 0.14 · api-contract 0.12 (`share-image` variant) ·
  ui-design-requirements 0.10 (4.2/4.3 share affordances).
- **Source:** owner-requested engagement review of the Add Game / card-creation arc (2026-06-11),
  immediately after decision 0014 — "where are the easy/difficult wins, and how does the canvas
  capture the moment of pride in your own creation?"

## The finding
The spec engineered the card pipeline but left the **emotional peak unowned**: finishing a card was
a save-transaction (CARD-15's preview is framed as *verification*). For a **low-frequency** app, the
peak-end memory of a session is the retention surface — and the causal chain runs: better reveal →
more publishes → more adoptions → more "you were adopted" pushes (NOTIF-01) → more returns. The
reveal isn't decoration; it's the top of the retention funnel. Constraint acknowledged: the *social*
half of the pride loop needs community density the app won't have at launch — so the
**single-player pride loop** (shelf, profile, achievements, the ritual itself) must be
self-sufficient, which several of these changes serve.

## Behavior changes (spec-edited, this batch)

### CARD-21 — external image-share, un-parked (the §10 reversal)
**The screenshot argument:** users can already exfiltrate cards by screenshotting — the §10 park
never kept cards inside the app; it only guaranteed they leave **cropped, low-res, and
unattributed**. Meanwhile CARD-15 already produces a beautiful flattened render on the CDN, and §3's
mobile-first principle lists native share as a designed-for capability. So the **image-only half**
is un-parked: native share sheet, server-composited share variant ("made in InGame" mark + designer
attribution), moderation-hidden cards excluded. **Deep links, the public web card page, and
collection sharing stay parked** — they're the genuinely expensive halves. Growth rationale:
"look what I made" landing in a group chat of friends who don't have the app is the organic
acquisition channel — and at cold start, your friends are exactly the people *not* in the app.
Contract ripple: `GET /cards/:id/share-image`.

### NOTIF-04 — the post-publish pre-prompt moment
NOTIF-04's high-intent list (onboarding close · first "notify me" · first friend action) was missing
the strongest moment in the product: **just after publishing a card**, when the user has freshly
created stake in a future event — "want to know when someone adopts it?" Added.

### CARD-01 — provenance printed on the card back
The standardized back layout now includes **designer attribution + adoption count**. In card
culture the back is where provenance lives; clout travels physically on the object into every
adopter's collection (surfaces CARD-04's attribution + CARD-05's count on the card itself).

## Presentation pattern (captured as OQ-040, owed across the 0014 stages)
The **"first print" reveal ritual** at canvas completion — three beats: **flatten-as-anticipation**
(diegetic "printing," client-rendered on a fixed duration; the server flatten confirms in the
background — the beat is never network-bound) · **layer-assembly replay** (the composition JSON
replayed as the card assembling itself, then the effect ignites — the near-free Procreate-timelapse
effect) · **gallery staging** (chrome dims, the card at its largest-ever render, effects/finish
live + tilt, haptics; reduce-motion variant per CARD-16). **Tiered to protect the ritual**: full
ritual for the first-ever card, canvas completions, and publishes; a light beat for Styler keeps —
repetition kills ritual. **Post-reveal routing:** the card visibly slots into the shelf ·
publish-at-peak (0014's canvas-tier publishing put the offer at the moment of maximum pride) ·
primed adoption notification + the NOTIF-04 ask · share (CARD-21). Plus the small beats: contributor
first-credit (CAT-05 — existential for the cold-start catalog), adopter-side designer credit
(ECON-05 — adoption feels like supporting, not taking), mid-edit **hold-to-preview** (CARD-15's
true-preview reachable any time, not only at publish).

## Steering
**OQ-004** (achievement content brainstorm) must include **creation milestones** — first card
created / first publish / adoption milestones, with cosmetic rewards (ACH-04) — closing the
create → earn → create loop without requiring community density.

## Explicitly considered, deferred
- **Direct in-app "show this card to a friend"** — new SOC behavior; the feed's publish event
  (SOC-06) covers it for v2.
- **True time-lapse capture/export** — the layer-assembly replay approximates it at near-zero cost;
  video export is far beyond v2.
- **Distinct moments per save** — rejected; tiering exists precisely because celebrating everything
  celebrates nothing.

## Impact on the 0014 arc
**No reordering.** This adds a *moments layer* across the existing stages — stage 1: shelf-slot +
contributor beats · stage 2: light keep-beat · stage 3: the full print ritual + share + the
NOTIF-04 ask. The celebration component was already a named Phase C/D catalog gap; OQ-040 now
defines what it must be.
