# M2 Client Fix-Task — close the Parvati profile+collection flags (paste into OpenCode)

> **Small client-lane fix pass, not a build.** The M2 self-profile + collection render **landed** — the
> DoD-enumerated pieces (device hero, Top-3, Now Playing, stats) are all present. **Parvati** (build-vs-design
> QA) plus the owner's on-device passes found a set of **placement / dropped-field** gaps that are owed at
> M2. Fix these on the **`m2` branch (PR #5)** and keep the six-check spine green. You are in **OpenCode**:
> PR-for-everything cadence, `node scripts/health-check.mjs` (not `/health`), no skills/slash-commands.
> **Commit/push only when the owner asks.** Full triage + citations: [`docs/planning/m2-review-notes.md`](m2-review-notes.md).

## Fixes, in priority order

**1. 🚩 Profile section ORDER (P8).** The self-profile sections render in the wrong vertical sequence. The
mockup order (`docs/design/mockups/profile/profile-states.html:505–547`) is:
**identity → STATS → PINNED FAVOURITE → TOP 3 → NOW PLAYING → MY DEVICE**. Reorder the profile screen to
match. All sections already exist — this is a reorder, not new components.

**2. 🚩 Dropped `/me` identity fields — bio (P1) + gamertags (P4).** `GET /me` returns `bio` and `gamertags`
(0.42 self-shape, OQ-116) and the mockup self-view shows both (bio line `profile-states.html:498`; gamertags
in the identity block `:587`). The render currently drops them. Render the bio line + the gamertags in the
identity block, fed from the `/me` payload.

**3. 🚩 MY DEVICE hero — size + label (P5).** The device is rendering **screen-width** and **unlabeled**,
with a broken frame. The mockup renders it as a **small `.mini-dev`** (~42×92, `profile-states.html:190` /
`:545`) under a **"MY DEVICE"** heading. Render it small + labelled. *(NOT in scope here: the full F-03 3D
shell styling → iteration lane; real device customization → DEV-\*/**M4**. The "weird frame" is the
app-wrapping DeviceShell — if that wrapper isn't the intended app chrome yet, that's a separate concern; for
this task just make the profile's MY DEVICE block a small labelled thumbnail, not a full-width panel.)*

**4. 🚩 Collection view-switch DOCKING (C1).** The always-visible view-switch (SHELF/GRID/LIST/TOP) is docked
at the **top**; it belongs in the **bottom tools bar** (`.tools` with `border-top`,
`docs/design/mockups/collection/collection-states.html`). Move it to the bottom. *(The separate sort/filter
**bottom drawer** is **not** in scope — real filtering needs the M3 collection-query backend (COL-07/09), so
the drawer rides M3. Only fix the view-switch placement now.)*

**5. 🟡 Seed count coherence (C4).** The collection shows "15 OF 48" while only 15 cards are seeded — 33
phantom. The count *format* is correct (`total OF collectionTotal`); the M2 **seed** just isn't internally
coherent. Make the seed coherent (seed the full 48 placeholder cards, or set the seeded `collectionTotal` to
the number actually seeded). Real counts come from `/me/collection` at M3 — this is just "don't display a
nonsense total in the meantime."

## Polish / iteration lane (optional — do if cheap, not a DoD blocker)
- **Stats layout (P9):** the stat tiles should be **centered + spanning** (mockup `.stats`,
  `profile-states.html:506`) — currently off-layout.
- **Collection control-bar styling (C2):** the bottom tools-bar visual/token treatment, once its placement
  (fix #4) is right.
- **MY DEVICE F-03 render:** the 3D-shell treatment on the small device thumbnail.

## Explicitly deferred — do NOT build
- **PINNED FAVOURITE set-piece (P2)** — `/me` returns a bare `favouriteGameId`; rendering the favourite
  game's title/art needs the **catalog → M3**.
- **Settings entry (P3)**, **profile EDIT UI (P6)** — later slices (the `PATCH /me` write path is already
  wired; the edit-mode UI isn't in the M2 render DoD).
- **Share / Achievements teaser / Contributions teaser (P7)** — SOC-07 (M7) / ACH (later) / CAT-07 (M3).
- **Card art / composition (C3)** — CARD-15 → **M4**; M2 seeds flat placeholder cards.

## Report back
End with: (1) what changed (files + which fix #); (2) a screenshot or Expo-web capture — at a phone viewport —
of the corrected **profile** (section order + bio + gamertags + small labelled MY DEVICE) and **collection**
(bottom-docked view-switch), per the AGENTS.md "see your own UI before reporting a screen done" convention;
(3) a link to a **green six-check CI run** on the `m2` head.
