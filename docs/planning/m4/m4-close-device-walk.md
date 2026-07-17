# M4 close — the on-device walk (one pass, phone-ordered)

> **What this is:** the single device pass that closes M4. Everything below is **owed on device**
> because automation can't drive it (OS reduce-motion + VoiceOver/TalkBack toggles, native skia paint,
> native gesture surfaces, real contrast on a real panel). The build is complete + machine-verified
> (0-flag parvati + clean murr on every surface); this walk is the owner's eyes doing what the web lane
> can't. **Do it in this order** — it walks the phone screen-by-screen so you're not hopping around.
>
> **Setup:** dev build on the phone (Metro :8081 — your lane), `demo@ingame.app` / `InGameDemo1!`.
> Toggle **reduce-motion** and **VoiceOver/TalkBack** live from Control Center / Settings shortcuts so
> you can flip them mid-walk. **Outcome per section: 👍 sign-off, or lean tagged notes** (next-agent
> style, not a punch-list — the acceptance-walkthrough-notes convention).

---

## 1 · Device editor — GATE-5 TASTE (the one taste gate still open)
The reworked sticker editor (your four notes: StickerRail · chin-off · 4-arrow position · spacing) +
the D5 preview. This is the **go/no-go** for the surface.

- **STICKERS section** — the placed-decal **StickerRail** (a tile per on-shell decal, tap-to-select).
  Does managing decals via the rail feel right? Is the panel **no longer crowded** (the `stickerBody`
  gaps)?
- **Chin is OFF** — decals only land on the forehead now; confirm nothing shingles under the nav
  keycaps (the reason chin went off; the code/schema stayed, just toggled).
- **Position by 4 arrows** — the ▲◀▶▼ d-pad (mirrors the Canvas Transform). Does nudging a decal by
  arrows feel as good as it does in the Canvas?
- **Place / select / transform feel** — tap a tray glyph → it lands → select → move/scale/rotate. The
  native gesture surface (web renders decals 0-size, so this is genuinely first-look).
- **D5 on-shell preview** — the try-it-on beat.
- **SHELL · THEME** — five shells, six themes, whole-app re-theme. Taste on the palette identities
  (midnight/teal + the four others).

**→ 👍 = Device gate-5 signed. This is the surface's M4 acceptance.**

## 2 · Light-theme contrast floor sweep (OQ-144 — still open)
While you're in THEME, switch to each of the **3 light themes** (paper + the two others) and eyeball the
**signed surfaces** for legibility. The tokens were built (`scr.key`/`value`/`valueInk`/`isLight`,
decision 0070); this confirms the ≥4.5:1 / ≥3:1 floors on real glass:

- **Buttons** — cream `/secondary` faces (SIGN OUT, SWITCH CARD) — do they read against the light bg, or
  vanish? (the original OQ-144 failure was ~1.1:1 cream-on-paper.)
- **Gold signals** — DESIGN NEW, EQUIPPED tags, F-02 gold — still legible + still reading as "gold"?
- **Carbon shell nav-label ink** — the one shell-contrast check distinct from the screen tokens: nav
  labels on Carbon's dark plastic.

**→ 👍 = OQ-144 floors confirmed → mark OQ-144 resolved-verified.**

## 3 · CARD-16 — reduce-motion + screen-reader (the a11y gate)
Toggle **reduce-motion ON**, then walk the animated surfaces — each must **instant-swap, never freeze
mid-motion** (the KeepBeat lesson):

- **Device shell** boundary-zoom · **Canvas** breakout zoom · **PulledSheet/ConfirmSheet** slides ·
  **KeepBeat** pulse (the one that regressed — confirm it doesn't flash-then-freeze) · **COL-12** card
  flip (see §5).
- Toggle **VoiceOver/TalkBack ON**, spot-walk: the editors' **live-region announcements** (save-lines,
  caps, offline/preview strips, errors fire on transitions) + the **non-gesture sticker selection**
  (transparent select-targets) + the ColorPicker `adjustable` steppers.

**→ 👍 = CARD-16 device pass done** (its release-block attaches to the M6 beta, but the work closes here).

## 4 · Device decals — visual walk (native, web can't render them)
Covered partly by §1, but explicitly confirm the **visual** decal render + the refusal grammar
(⊘ / NAV-KEEP-CLEAR when a decal would cross a keycap) + re-zone — these are native-only (RN-web renders
the band 0-size; server truth + geometry are unit-tested, but the pixels are your eyes).

## 5 · COL-12 — collection peek-flip (device flip pass)
The automation renderer won't paint the skia front faces or the rotateY motion, so this is first-look on
device:

- **Shelf + grid** — tap a card → it **flips in place** to the CARD-01 stats back (HOURS · % · STATUS ·
  SINCE · CARD ARTIST) → tap back → art face. **Long-press** (or VIEW GAME on the back) = navigate.
- **Dense-list** stays NAVIGATE (unchanged). **Now-playing hero** never flips.
- **Transient** — flip resets on view-switch (shelf↔grid) + on leaving Collection.
- **First-run coachmark** — "Tap a card to flip it" shows once, then not again.
- Under **reduce-motion** (from §3) — the flip should instant-swap, no spin.

**→ 👍 = COL-12 accepted.**

---

## When all five are 👍
M4 is **closed** — every surface built, machine-verified, and owner-accepted; Onboarding deferred past
M4 (entry-log 0.2); the closed beta retimed to M6 (0071). M4 completes internally, no external release.
Next milestone: **M5 (economy + card sharing)** — the publish/adopt/wallet/IAP path the §0.8 boundary
parked, gated on M4 + M1-P. File a one-line M4-exit note in `m4-review-notes.md` and flow to the M5
brief.

**Anything not 👍** → lean tagged notes here or in-app; I triage (behavior→spec / presentation→
design-spec), formalize first, build, re-verify (murr + parvati → 0 flags), receipt, hand back.
