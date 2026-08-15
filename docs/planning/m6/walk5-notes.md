# Walk-5 notes stash (owner, 2026-08-08 — walk in progress, notes arrive in batches)

## Batch 1

- **[PASS+CR] Big-shelf landing** — mechanics good. CR: the landing pulse border → **GOLD, not
  orange** (check against the DS gold-usage rules when building; the pulse is a moment-of-delight
  highlight, gold is the celebratory metal).
- **[REJECTED → CR] Flip-back-on-return beat** — owner dislikes the deferred flip-back animation.
  Ruling: **a flipped card STAYS in the state the user left it** across tab switches — i.e. drop
  the blur-time flip reset (COL-12 class: check whether product-spec mandates the reset; if so
  this is a spec change, version-bump + changelog). Side effect: with no reset there is nothing
  for freeze to defer — the R5 beat disappears entirely.
- **[DESIGN Q → recommendation given in chat] Unfired landing expiry** — owner asks for the
  intuitive shape, not a timer. Proposed: (1) landing fires only when the new entry is actually
  visible under current filters at fetch-settle; (2) if an active filter EXCLUDES the fresh add,
  no pending landing at all — instead immediate feedback: toast/inline "Added — hidden by your
  current filter" with a CLEAR FILTERS action; (3) any user scroll / view switch / filter change
  cancels a pending landing (auto-scroll never fights user intent). Await owner nod.
- **[CR, pre-beta] Canvas BREAKOUT transition** — owner correction 2026-08-08: this is the
  Canvas's screen-expansion beat itself (the CR-01 zoom breakout), NOT card content latency. The
  owner worked on it and couldn't get it un-clunky — taste-heavy animation choreography. Plan:
  prototype 2–3 DISTINCT transition treatments for on-device feel (per the design-iteration
  directive), in the transition packet.
- **[CR + DESIGN DIRECTION] Publish "press" transition** — card art typically late; the press
  animation mostly shows a blank card until ~1s after landing. Owner's thesis: lean into SLOWER
  transitions that absorb load time; asked for the orchestrator's take → given in chat:
  **choreograph readiness, don't stretch duration** — split transitions into instant "commit"
  feedback + a **reveal gated on a readiness signal** (fonts+image+first canvas frame), with a
  DESIGNED intermediate state (the retro-arcade identity supports diegetic loading — card-printer
  /stamp/scanline conceits), bounded by a cap (~600ms) then progressive reveal. Prereq: the perf
  round-2 P1 typeface cache + P5 prefetch land FIRST (they attack the root cause of the lateness —
  don't tune animation timing around a latency about to shrink). Proposed primitive: one shared
  `useCardReady` signal + a `CardReveal` choreography used by publish, styler→canvas, adopt.
