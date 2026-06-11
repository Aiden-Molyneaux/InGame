# 0012 — Collection view modes, error surfacing, screen theme & friend-chrome toggle

- **Date:** 2026-06-10
- **Status:** accepted
- **Related IDs:** COL-07, DEV-03/04, COSM-01, SYS-02/10, PROF-05/COL-10
- **Source:** second round of owner mockup review (follows decisions 0010/0011).

## Collection view modes — three named presentations (COL-07 interpreted)
The owner proposed a **compact grid without game names** as the denser view. Adopted, with two
constraints that fall out of existing rules:
- **Shelf** — the showcase: large cards in the device.
- **Compact grid** — dense browsing: **smaller full card faces, never cropped** (the OQ-014
  foundation), **no added label chrome**. Note: a card's *title is baked into its flattened image*
  (it's a composition layer, CARD-01/15) — so "no names" means no extra labels, not stripped cards.
- **Dense list** — management: thumb + title + **hours/status per row**. Kept deliberately: card
  faces never show stats (they live on the back), so the list is the **only** mode where a
  Completionist can scan hours/status without flipping cards. Revisit-flag: if real use shows the
  compact grid covers management, dropping the list is a one-line COL-07 edit.

## Feedback & error surfacing is a global pattern (design-req §1.8)
Owner flagged error surfacing as an unconsidered element. Made a Part-1 pattern, not per-screen
improvisation: **inline validation** for fixable fields · **toast/banner + retry** for transient
action failures · a named **load-error state with retry** (same family as the inviting empties) ·
**offline ≠ error** (SYS-10 stays calm) · **destructive actions always confirm**. The per-screen
state matrix (decision 0011) makes these definition-of-done.

## The "theme changer" is the in-app screen theme, and it lives in the Device editor (DEV-04)
Owner leaned Device editor and asked for a recommendation; agreed — **Device editor**, because:
1. **It's device identity, not a preference.** The content area *is* the device's screen; theming it
   is customizing your device (shell : outside :: screen theme : inside).
2. **Settings stays functional** (account/privacy/notifications) per the "legible navigation"
   doctrine — expression lives in editors.
3. **It's monetizable** as a cosmetic type (`screen_theme` added to COSM-01) with the standard free
   baseline + preview-then-acquire — a Settings toggle couldn't be.
Constraint: themes carry a **legibility floor** (contrast on functional UI) — the screen-side
companion to DEV-03's nav rule. If a pure-accessibility display need (e.g. high-contrast mode)
appears later, that's a *separate* Settings concern, not this cosmetic.

## Friend-view chrome is a toggle, not automatic (closes OQ-012)
Owner direction: visiting a friend's Profile/Collection **keeps your own chrome by default**; their
device renders as an on-screen hero with an explicit **"view in their device" toggle** that
temporarily swaps the chrome, with an obvious exit. Rationale: your device is your constant frame
(the app's core metaphor shouldn't silently change hands), while the toggle preserves the showcase
payoff as a deliberate act — closer to "try on their setup" than "lose your bearings." Nav is
unaffected in both states (DEV-03).
