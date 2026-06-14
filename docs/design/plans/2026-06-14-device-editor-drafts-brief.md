# Device editor (§4.5) — design-track kickoff: a conventional control surface + a divergent device-edit/sticker surface ×3 → gate → converge

Authored by the DEVICE EDITOR track (self-briefed from ui-design-req §4.5 + §1.2–1.3 + the api-contract
`Device (DEV-)` / `Cosmetics` sections + design-spec §1.1–1.6 + product-spec `DEV-01..04`, `COSM-01/03`,
decision 0017 / OQ-042 / OQ-045). The Device editor is the **next queued coverage-closer** in
`SCREEN-STATUS.md` (UP NEXT #2 — *"owes OQ-045; shells per 0017"*). Per `DEV-01` it is **lighter than the
card editor — NOT the full vector toolkit**. This file is the plan; the gate ruling gets appended verbatim at
the bottom.

## The split — what's conventional, where the divergence budget goes
Most of the Device editor is **conventional and reuses the Store board** — picking a **shell** (own/switch,
`activeShellId`, `DEV-02`), a **shell colour** (the 5 §1.1 colourways), and a **screen theme** (`DEV-04` —
the whole-page re-theme preview with a legibility floor) are all `PreviewStage` / `PreviewStrip` / `ItemTile`
/ `ReconcileSheet` patterns **already designed on `store-states.html`** (P2/P3/P4). We **compose** those, we
don't re-explore them.

The genuinely **novel** problem — and the only place the divergence budget goes — is: **how do you edit the
device that IS the persistent frame, and specifically how do you place / scale / rotate stickers on the
shell?** (`DEV-01` sticker placement + **`OQ-045` the sticker-placed-on-shell preview**, the specific debt
this pass closes — explicitly deferred on the Store board: *"PLACE · SCALE · ROTATE ON YOUR SHELL IN THE
DEVICE EDITOR (DEV-01) · ON-SHELL PREVIEW COMING LATER (OQ-045)"*, `store-states.html` P2b). That gets the
**multi-draft divergence** (3 distinct interaction models → gate → converge).

### The 3-draft count — sound, not a contrivance (the divergence-rule check)
The standing A/B/C poles (continuity · breakout · metaphor) map **cleanly** here, and they double as the
app's locked **spatial tiers** (sheet/in-frame · breakout · diegetic — decision 0014), which the card editor
already split into the **Styler (in-frame)** and **Canvas (breakout)** postures:
- **A — in-frame live edit** = continuity / the FlowTakeover tier (kin to the Styler).
- **B — workbench breakout** = breakout / tier-3 (kin to the Canvas print-shop).
- **C — dressing room** = metaphor / diegetic (the C-line lineage: styler-workbench · canvas-press · discover-arcade).

The sticker place/scale/rotate task — manipulating decoration on a curved, framed plastic body while the
**5 nav keycaps must stay legible** (`DEV-03`/`F-04`) and the **on-shell preview** must read true (`OQ-045`)
— is genuinely worth three takes (in-place vs roomed-out vs diegetic each answer "where does the fiddly
transform happen?" differently). **All three are built.**

## The page (the contract — ui-design-req §4.5, `DEV-01..04`; cite IDs, never restate)
Reached from **Profile's MY DEVICE strip** (§3.5 — `MiniDevice` `Strip`; design-spec §2.2). A **`FlowTakeover`**
(`FlowHeader` ◂ "DEVICE"; the device **frame + `NavBand` persist**, **PROFILE keycap active** — the Settings
pattern). **Commerce-adjacent → the PIXELS mark IS in play** (premium cosmetics are priced): the header
carries the `CurrencyCounter` (gold `CountKeycap` → Wallet), reusing the Store's currency set.

**Must host (the §4.5 inventory):**
- **Shell select + switch** — own/switch shells; the free **default device always renders** (`DEV-03`).
  v2 = **one handheld body**; shells are **outfits/wraps**, not alternate shapes (`DEV-02`, decision 0017 /
  OQ-042). The before→after `MiniDevice` pair (Store P4 grammar).
- **Shell colour** — the **5 §1.1 colourways** (Teal ★ · Grape · Sunset · Pink · Carbon) as the real token
  values (`shell.plastic`/`plasticHi`/`plasticLo` per colourway).
- **Screen theme** (`DEV-04`) — the **6 §1.1 themes** (Midnight ★ · Deep Sea · Berry / Paper · Mint · Lilac);
  free baseline + premium **preview-then-acquire** (`COSM-03`); the **whole-page live preview** under
  `PreviewStrip`; the **contrast/legibility floor** honored visibly.
- **Sticker placement** (`DEV-01`) — **place / scale / rotate** from the library; free baseline + premium
  **preview-then-acquire** → `ReconcileSheet`; the `stickerComposition` payload. Sticker packs are **SHELL
  items** (`COSM-01` shell_sticker_pack; the card canvas sells nothing, OQ-047) — reuse the Store's
  `gl-*` glyph set.

**Hard behavior rules to honor visibly (must prove in every draft):**
- Decoration must **never obscure the 5 nav keycaps** (`DEV-03` / `F-04`) — a **protected no-go zone** the
  placement surface enforces; nav keycaps always render **above** any sticker.
- The screen theme must **preserve content legibility** (`DEV-04`) — the whole-page preview keeps the
  contrast floor; the **shell stays the owner's plastic** while only the screen restyles.
- **Personal only** — devices are **never published/adopted** (unlike cards). No share/adopt verbs anywhere.

**States the DRAFTS draw** (the divergent surface — 6 core panels each; the full §1.6 lifecycle
`Skeleton`/`Offline`/`LoadError` is **deferred to converge**, as every prior track's drafts did):
**editing** · **shell-switch** · **theme-preview (whole-page)** · **sticker place/scale/rotate (handles)** ·
**OQ-045 sticker-on-shell preview** · **premium-reconcile** (`ReconcileSheet` + the short-by-N bridge).

## Reuse everything conventional (locked §1.5 catalog names — compose, don't re-invent)
`DeviceShell` · `MiniDevice` (+`/lg`) · `NavBand`/`NavKeycap` (must stay legible through every shell/sticker)
· `PreviewStage` (`.pstage`) · `PreviewStrip` (`.preview-strip` — the DEV-04 whole-page theme banner +
`scr.*` theme-override class) · `ItemTile`/`AisleIndex` (the shell/theme/sticker pickers) · `ReconcileSheet`
(`.reconcile` — premium keep-gate · hold-to-buy · the `PackTile` short-by-N bridge) · `OwnedTag`/`LockedTag`
· `KeycapButton/*` · `ToolKeycap` · `SectionChips` · `IntensitySlider` (if a control wants it) · `BuyBar`
(hold-to-buy) · `PriceChip` · `CurrencyCounter`/`CountKeycap` · the PIXELS mark · the §1.6 lifecycle family
(`Skeleton`/`LoadError`/`Offline`/`Toast`). **Tokens verbatim** — the 5 shell colourways + 6 screen themes
are the real §1.1 values.

## New components this screen introduces (design-spec §1.5 "To design" gaps) — FLAGGED at the gate
Introduced under **working names** (form is mine; names ratified → design-spec at converge). The §1.5 gap
list literally names **"sticker placed-on-shell preview (OQ-045)"** as a Phase-C/D gap — this pass closes it.

- **`StickerStage`** — the **sticker-placement surface**: the editable plastic region(s) where stickers live
  (top-band beside the logo · the side rails · the nav-band **margins**), with the **5 nav keycaps + the
  screen as protected no-go zones** the stage enforces (`DEV-03`/`F-04`). The three drafts differ in **where**
  this stage lives (the live in-frame plastic · a roomed-out bench · a diegetic stand).
- **`TransformBox`** — the **place/scale/rotate handles** (adapted from the Canvas `sel-ring`: accent
  selection ring + 4 corner scale `.h` handles + a **rotate stem**, plus a numeric/percent readout). The
  card editor's `sel-ring` is the lineage; this is its lighter device-side cousin.
- **`PlacedSticker`** (the **OQ-045 payload**) — a sticker actually **rendered on the shell**, transformed
  (scaled/rotated/positioned) in its real spot on the plastic, drop-shadowed onto the surface (the Store's
  `.placed` seed, matured). This is the on-shell preview the debt asked for.
- **`StickerTray`** — the library picker the stickers come **from**: the free-baseline glyphs + premium
  packs (preview-then-acquire), worn as `ItemTile`s / a thumb tray; composed from the Store's `gl-*` set.
- Draft-specific shells: **B's workbench bench** (reuse the Canvas `.shop`/`.shell-swing`/`.bed`) and
  **C's dressing stand/turntable** (the one genuinely new diegetic frame) — flagged, owner picks at the gate.

## The OQ-045 treatment — the thing to prove (carried into all three, three distinct homes)
OQ-045 = *the sticker actually rendered on the shell* (the Store board only showed packs in the library; it
never drew a placed sticker on the plastic). Each draft gives the on-shell preview a **natural home born of
its interaction model**, which is the proof the three models are genuinely different:
- **A (in-frame):** the preview is **continuous** — stickers render live on the very frame you're standing in
  as you transform them (decorate the frame you're inside).
- **B (workbench):** the preview is the **snap-back proof** — you place precisely on the roomy bench, then
  the device **reassembles** and shows the finished shell in-frame with nav legible on top.
- **C (dressing room):** the preview is the **dressed mannequin** on its turntable — you **rotate the body**
  to see the stickers sit on the plastic in the round.

## The three models (the divergence axis = HOW you edit the frame + place stickers)
Each draft hosts the **same content** (shell · colour · theme · stickers + premium reconcile) and draws the
same **6 panels**. **MUST PROVE in every draft:** nav stays legible under stickers (`DEV-03`/`F-04`) and the
theme preview respects the legibility floor (`DEV-04`).

- **A — "IN-FRAME LIVE EDIT"** (continuity pole; the FlowTakeover tier, kin to the Styler). You edit the
  device **in place** — the **live frame is the canvas**, controls **dock on-screen** (a bottom tools dock /
  drawer), and **stickers drop directly onto the visible plastic**. The OQ-045 preview is continuous (it's
  the real frame). The lightest-weight, most legible option (you watch the nav-legibility rule being honored
  the whole time) — best fit for *"lighter than the card editor"*. **MUST PROVE:** the available plastic
  (top-band · rails · nav margins) gives stickers enough room **without ever crowding the 5 keycaps**.
  → `device/device-draft-a-inframe.html`
- **B — "WORKBENCH BREAKOUT"** (breakout pole; tier-3, kin to the Canvas print-shop). The device **pulls
  forward / opens to a workbench** — the shell lies larger/flatter on a press bed for **roomy place/scale/
  rotate** with full `TransformBox` handles, then **snaps back** into the frame. Solves A's thin-plastic
  squeeze by giving the fiddly transform room. **MUST PROVE:** the breakout **earns its weight** on a
  *lighter* editor, and the snap-back proves nav legibility on reassembly.
  → `device/device-draft-b-workbench.html`
- **C — "DRESSING ROOM"** (metaphor pole; diegetic). The device stands on a **turntable / mirror stand** you
  **rotate and dress** — stickers applied from a **tray**, the body spun to see angles, the nav keycaps shown
  as **raised physical hardware that repels stickers** (the no-go rule made diegetic). **MUST PROVE:** the
  metaphor keeps **precision + legibility** (it doesn't trade away the transform handles or the nav rule for
  charm).
  → `device/device-draft-c-dressing.html`

**Track lean (not a decision — owner picks at the gate):** **A** is the natural fit for *"lighter than the
card editor"* (lightest weight · maximal continuous nav-legibility proof · the reflexive charm of decorating
the frame you stand in). **B** answers *"the transform wants room"* but risks importing the Canvas's
heavyweight breakout for a light task. **C** is the delight pole. Presented even-handedly; the gate decides.

## Hard rules (carried from the tracks)
- **Compose from the design-spec §1.5 catalog**; reuse the locked names above. Introduce only `StickerStage`
  / `TransformBox` / `PlacedSticker` / `StickerTray` (+ B's bench / C's stand), each **flagged at the gate** —
  never silently.
- **Tokens verbatim** — the **5 shell colourways + 6 screen themes** are the real §1.1 values
  (`shell.*` per colourway; `scr.*` per theme). PIXELS mark + currency set reused from `store-states.html`.
- **Standalone self-contained HTML artboards** (Claude Design exports lack local deps). Google Fonts via
  `media="print" onload`; **hand-drawn / built-in SVG only** (no external icon libs).
- **HTML only — never commit PNGs.** Headless-Edge self-checks go to TEMP and are **deleted before the turn
  ends** (`msedge --headless=new --screenshot=out.png --window-size=1140,1280 <file>`).
- **Scope discipline:** behavior questions → **APPEND to `docs/open-questions.md` only**. Do NOT edit
  product-spec / api-contract / design-spec / catalog / other tracks' files, or any `SCREEN-STATUS` row other
  than **4.5 Device editor** (+ UP NEXT). Personal git identity (Aiden-Molyneaux; HTTPS; don't override);
  `git pull --rebase` before every push (parallel tracks active — **stage only my paths**).

## Sample data (a signed-in account)
- **Device:** the one handheld; **active shell = Teal ★** (the free default, `DEV-03`); **owns** Carbon +
  Grape shells, the rest of the 5 colourways available (Sunset · Pink — premium/locked or owned mix).
- **Screen theme:** **Midnight ★** active (free baseline); **Deep Sea / Berry / Paper** as premium
  preview-then-acquire options (the DEV-04 whole-page preview shows Deep Sea live, under `PreviewStrip`).
- **Stickers:** a free-baseline glyph set placed live (e.g. **STAR** on the top-band, **BOLT** on a side
  rail) — one **actively transformed** (the `TransformBox` mid-scale/rotate, a percent readout); a premium
  pack (**ARCADE GLYPHS / NEON ZOO**) on the preview-then-acquire path → the reconcile.
- **Wallet:** **27 PX** (Store P3/P4 timeline); the premium pack/shell short-by-N → the bridge in
  `ReconcileSheet`. Values illustrative (OQ-002/OQ-011).

## File map
Folder: `docs/design/mockups/device/` — `device-draft-{a-inframe,b-workbench,c-dressing}.html` (README gets a
row per file). **Converge target (LATER, after the owner picks):** `device/device-states.html` (the chosen
model + the conventional shell/colour/theme surfaces + the full §1.6 lifecycle matrix).

## Process
1. Author this brief → commit/push. Flip `SCREEN-STATUS` §4.5 Device editor **⬜ → 🔶** (in pass); adjust UP
   NEXT (Device editor in pass). Touch only the 4.5 row + UP NEXT.
2. Build `device-draft-a-inframe.html` (the 6 panels) → headless verify (delete shots) → README row →
   commit → push. Same for **B**, then **C**.
3. **Present at the owner gate (STOP):** per draft — the **interaction-model thesis** (how you edit the
   frame) · the **sticker place/scale/rotate treatment** · the **OQ-045 sticker-on-shell preview** · how
   **nav/screen legibility** is kept (`DEV-03`/`DEV-04`) · **premium-reconcile** handling · the **new
   components flagged** · any **OQ logged** · the changed `SCREEN-STATUS` row. **Do NOT converge** — await the
   owner's pick + iteration notes.

---

## Owner gate ruling — <date> (verbatim)

> _(appended after the owner reviews the three drafts)_
