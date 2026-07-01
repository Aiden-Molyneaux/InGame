# M2 Client Fix-Task — app shell + close the Parvati profile/collection flags (paste into OpenCode)

> **Small client-lane fix pass, not a build.** The M2 self-profile + collection render **landed** — the
> DoD-enumerated pieces (device hero, Top-3, Now Playing, stats) are all present. **Parvati** (build-vs-design
> QA) plus the owner's on-device passes found a set of **placement / dropped-field** gaps that are owed at
> M2, plus one **foundational** gap: the app-wrapping **DeviceShell** isn't the persistent chrome it's meant
> to be. Fix these on the **`m2` branch (PR #5)** and keep the six-check spine green. You are in **OpenCode**:
> PR-for-everything cadence, `node scripts/health-check.mjs` (not `/health`), no skills/slash-commands.
> **Commit/push only when the owner asks.** Full triage + citations: [`docs/planning/m2-review-notes.md`](m2-review-notes.md).

> **⚠️ Preview your work — this is UI (AGENTS.md "see your own UI" convention).** After each fix, run the app
> in **Expo web at a phone viewport (~390×844)**, **screenshot it, and compare against the mockup** before you
> call it done — most of all the shell (#1), where dimensions matter. Web ≈ native for layout/structure; the
> physical iPhone stays the native-fidelity gate. **Do not report a screen done you haven't looked at.**

## Fixes, in priority order

**1. 🚩 FOUNDATIONAL — the app shell (`DeviceShell`) must wrap EVERY screen, at final dimensions.**
The `DeviceShell` (component-map §5.1: the F-03 teal plastic that **"wraps every screen"** ✅⭐) is currently
mounted only in `apps/mobile/app/(tabs)/_layout.tsx`, so it frames collection/profile but **not** sign-in or
the root index, and it re-mounts on entering the tabs. Owner ruling: **the device frame always containerizes
the whole application.**
  - **Hoist `DeviceShell` to the ROOT layout** (`apps/mobile/app/_layout.tsx`) so **one persistent instance
    frames every screen** (sign-in → tabs), never unmounting across navigation.
  - **Wrap everything — sign-in included.** On pre-auth screens the **NavBand shows its `locked` variant**
    (gray, non-interactive — component-map §5.1 NavBand `locked`); active in the app. So the full chrome
    (top-band + nav-band) is present on every screen; only the nav's interactivity changes.
  - **DIMENSIONS FIRST — get as close to the final device dimensions as possible even if you don't render all
    the decorative chrome.** Match the mockup's fixed structural dimensions from the canonical device in
    `docs/design/mockups/profile/profile-states.html` (the shell fills the viewport; these are the fixed
    bands/insets that set the **usable screen area**):
    - outer plastic `.device` (`:48`) — fills the viewport; corner radius ~30,
    - **`.top-band` height 64px** (`:57`) — power LED (left) · INGAME logo (center) · grille (right),
    - **`.screen-bezel`** (`:65`) — padding 9px, radius 20, holding the screen,
    - inner **`.screen`** radius 13 (`:83`), Midnight bg — where the routed screen renders,
    - **`.nav-band` height 128px** (`:66`) — the 5 nav keys (`.nav-btn` 54×54, radius 15, label + pip).
    The point: the **usable screen area (viewport − top-band − nav-band − bezel padding) is correct NOW**, so
    every screen builds into the right space and doesn't need re-layout later.
  - **Decorative chrome is 🎨 iteration-lane, not a blocker:** the grille slats, the embossed INGAME logo, and
    the 3D screw/bevel gradients may be stubbed/simplified this pass — get the **structure + dimensions** right.
  - You **CONSUME** the design authority — cross-check the mockup + `design-spec §1.5` (§5.1 Shell) +
    `component-map §5.1`; do **not** invent component names. **This is the app-wrapping shell — distinct from
    the profile's small MY DEVICE thumbnail (fix #4).**
  - **Preview (required):** sign-in, collection, and profile inside the shell at a phone viewport — the frame
    should read like the mockup's device (right proportions, top-band + nav-band present, nav locked on
    sign-in) on **every** screen.

**2. 🚩 Profile section ORDER (P8).** The self-profile sections render in the wrong vertical sequence. The
mockup order (`docs/design/mockups/profile/profile-states.html:505–547`) is:
**identity → STATS → PINNED FAVOURITE → TOP 3 → NOW PLAYING → MY DEVICE**. Reorder the profile screen to
match. All sections already exist — this is a reorder, not new components.

**3. 🚩 Dropped `/me` identity fields — bio (P1) + gamertags (P4).** `GET /me` returns `bio` and `gamertags`
(0.42 self-shape, OQ-116) and the mockup self-view shows both (bio line `profile-states.html:498`; gamertags
in the identity block `:587`). The render currently drops them. Render the bio line + the gamertags in the
identity block, fed from the `/me` payload.

**4. 🚩 MY DEVICE hero — size + label (P5).** The profile's device preview is rendering **screen-width** and
**unlabeled**. The mockup renders it as a **small `.mini-dev`** (~42×92, `profile-states.html:190` / `:545`)
under a **"MY DEVICE"** heading. Render it small + labelled. *(This is the profile's small device **thumbnail**
— NOT the app-wrapping `DeviceShell` of fix #1; don't conflate them. NOT in scope here: the full F-03 3D
styling → iteration lane; real device customization → DEV-\*/**M4**.)*

**5. 🚩 Collection view-switch DOCKING (C1).** The always-visible view-switch (SHELF/GRID/LIST/TOP) is docked
at the **top**; it belongs in the **bottom tools bar** (`.tools` with `border-top`,
`docs/design/mockups/collection/collection-states.html`). Move it to the bottom. *(The separate sort/filter
**bottom drawer** is **not** in scope — real filtering needs the M3 collection-query backend (COL-07/09), so
the drawer rides M3. Only fix the view-switch placement now.)*

**6. 🟡 Seed count coherence (C4).** The collection shows "15 OF 48" while only 15 cards are seeded — 33
phantom. The count *format* is correct (`total OF collectionTotal`); the M2 **seed** just isn't internally
coherent. Make the seed coherent (seed the full 48 placeholder cards, or set the seeded `collectionTotal` to
the number actually seeded). Real counts come from `/me/collection` at M3 — this is just "don't display a
nonsense total in the meantime."

## Polish / iteration lane (optional — do if cheap, not a DoD blocker)
- **App-shell F-03 chrome (#1):** the grille slats, embossed INGAME logo, and 3D screw/bevel gradients on the
  `DeviceShell` — once its **structure + dimensions** are right.
- **Stats layout (P9):** the stat tiles should be **centered + spanning** (mockup `.stats`,
  `profile-states.html:506`) — currently off-layout.
- **Collection control-bar styling (C2):** the bottom tools-bar visual/token treatment, once its placement
  (fix #5) is right.
- **MY DEVICE F-03 render:** the 3D-shell treatment on the small device thumbnail.

## Explicitly deferred — do NOT build
- **PINNED FAVOURITE set-piece (P2)** — `/me` returns a bare `favouriteGameId`; rendering the favourite
  game's title/art needs the **catalog → M3**.
- **Settings entry (P3)**, **profile EDIT UI (P6)** — later slices (the `PATCH /me` write path is already
  wired; the edit-mode UI isn't in the M2 render DoD).
- **Share / Achievements teaser / Contributions teaser (P7)** — SOC-07 (M7) / ACH (later) / CAT-07 (M3).
- **Card art / composition (C3)** — CARD-15 → **M4**; M2 seeds flat placeholder cards.

## Report back
End with: (1) what changed (files + which fix #); (2) **Expo-web captures at a phone viewport** of — the shell
on **sign-in + collection + profile** (persistent frame, right dimensions, nav locked pre-auth), the corrected
**profile** (section order + bio + gamertags + small labelled MY DEVICE), and the **collection** (bottom-docked
view-switch) — per the AGENTS.md "see your own UI before reporting a screen done" convention; (3) a link to a
**green six-check CI run** on the `m2` head.
