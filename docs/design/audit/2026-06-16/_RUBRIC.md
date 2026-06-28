# State-File DS-Conformance Rubric — derived from `InGame Design System Catalog.dc.html` (v0.4)

**Source of truth:** `docs/design/mockups/InGame Design System Catalog.dc.html`.
**What you audit:** one screen's `*-states.html` mockup. **Goal:** does its product UI obey the
catalog's dimensional + foundational constraints — **font sizes, GameCard sizes, button/keycap
sizes** first, then the foundation rules.

---

## SCOPE — what is and isn't product UI

Each state file renders one or more **404 px phone frames** (`.device`, 404×884) and wraps them in
**documentation chrome**: `.canvas`, `.canvas-head` (h1/p), `.artboard-label`, `.caption` (h3/p).

- **AUDIT only what is inside the phone:** the `.screen` / `.screen-bezel` content (the app UI) and
  the **shell** furniture (`.device`, `.top-band`, `.logo`, `.nav-band`, `.nav-btn`, `.pip`, screws).
- **DO NOT audit the doc chrome** (`.canvas-head`, `.artboard-label`, `.caption`). Those 11–17 px
  text blocks are the mockup's annotations, not the product — flagging them is a false positive.
- **Two surfaces, two rule-sets (F-08):**
  - **SCREEN** (everything inside the bezel): font = **Chakra Petch**; on-screen chrome is **square
    (90°)**; 4-step type scale applies.
  - **SHELL / plastic** (`.device`, `.logo`, `.nav-*`, power label): font = **Paytone One**; radius
    lives here; nav keycaps are device-scale (≈54 px is fine — the catalog's 44 px NavKeycap was a
    compact swatch, **not** a size spec). Don't apply screen rules to the shell.

Method: read the `<style>` block (the `:root` tokens + component classes carry most of the truth),
then scan the body for **inline overrides** that deviate from those classes.

---

## P0 — THE THINGS THE OWNER ASKED FOR

### P0.1 — Type scale (F-06): the 4 steps are **21 / 15 / 11 / 9**
On-screen UI text must sit on the scale, by role:
| px | token | used for |
|----|-------|----------|
| **21** | display | screen headers (`h2`), hero titles, profile name |
| **15** | emphasis | stat values, strip titles, CountKeycap number |
| **11** | body | buttons, chips, sub-rows, list rows, links, search field |
| **9** | micro | section heads / eyebrows, tags, stat labels |

**VIOLATION** = on-screen text doing one of those roles at an off-scale size (e.g. a button at
12 px, a header at 20 px, a body row at 10 px, a link at 10.5 px, a section eyebrow at 8 px).

**ALLOWED off-scale — DO NOT FLAG:**
- **Card plates** (print; scale with the card): hero ≈10, grid ≈8, mini ≈4.5, thumb ≈3.2.
- **Plate legibility floor** in fan/picker: **forefront ≥10, neighbours ≥9** (§1.2; **thumbs exempt**).
  Flag only if a fan/picker forefront plate is **below 10** or a neighbour **below 9**.
- **Tags / pills / dense commerce chips** in the **8–9 px** band (catalog ships OwnedTag 8, MatchTag
  8.5, PackTile sublabels 7.5–8). Only flag tags that are egregiously off (≥12 or ≤6).
- **Big display glyphs** for empty/error states (`+`, `!`) at 30–32 px.
- **Shell/plastic labels** (Paytone One): logo 21, nav 11, power 9 — governed by the shell.
- A **18 px** "someone-else's-profile" display variant is catalog-sanctioned (ScreenHead/whose).

### P0.2 — GameCard sizes (F-01)
Four canonical sizes, ratio **63/88** (≈0.716), TL+BR pixel **step** (clip-path notch), face never cropped:
| size | dims | step | plate |
|------|------|------|-------|
| **/hero** | 138×193 | 4/8 | ≈10 px |
| **/grid** | width by column, `aspect-ratio: 63/88` | 4/8 | ≈8 px |
| **/mini** | ≈64 wide, 63/88 | 3 | ≈4.5 px |
| **/thumb** | 44×62 | 2.5 | ≈3.2 px |

**VIOLATION:** a card materially off these sizes in that role; wrong aspect ratio that slivers the
art; **face cropped** (F-01 — full face, scaled, never cropped/slivered); plate missing.
Note: `.hero-size {138×193}` and `.grid-size {aspect-ratio:63/88}` are the expected class defs.

### P0.3 — Button / keycap sizes & tiers (F-02 / F-03)
- **Screen action button** (`.btn` tier — ADD/RETRY/EDIT/DELETE/SUBMIT): font **700 11 px**,
  letter-spacing ≈1 px, **3 px drop edge** (`box-shadow: 0 3px 0 …` or `filter: drop-shadow(0 3px 0 …)`).
- **Tool keycap** (sort/filter/search tools): **2 px drop** (`0 2px 0`), ≈32 px, font 700 11 px.
- **Shell nav keycap**: **4 px drop** (`0 4px 0`), radius on plastic, pip beneath. Device-scale size OK.
- **Pressed**: `translateY(2–3px)` + inset shadow (F-03 travel; F-09 named exception).
- **F-02 colour intent:** **gold + step = creates a GameCard** (ADD); **system-orange + step =
  non-card action** (RETRY, ADD FRIEND). Inverting these (gold on a non-card action, orange to
  create a card) is a **violation**. The step (half-scale TL+BR notch) belongs to card-creating /
  card-borrowed buttons; plain chrome buttons are square.

**VIOLATION:** wrong drop depth for the tier (screen action at 2 px or 4 px; tool at 4 px); an
action/tool-tier button not at 11 px; F-02 colour-intent inverted.

---

## P1 — Foundation rules (supporting; flag clear breaks)
- **F-08 one font per surface:** screen text only **Chakra Petch**; plastic only **Paytone One**.
  **Any Silkscreen or third font on screen = violation.** (`:root` should set `--pk: 'Chakra Petch'`,
  `--shell: 'Paytone One'`; expect **no** `Silkscreen`.)
- **F-01 never crop a card:** covered in P0.2 — also watch art `overflow` that clips the face.
- **Tokens match the canonical baseline (Teal shell + Midnight screen).** `:root` should carry
  `--accent:#ff3d77; --gold:#ffd23f; --cream:#f5f1e4; --navy:#1d2a4a; --bezel:#14122a;
  --scr-bg:#232045; --scr-accent:#ff9f43`. Report drift on these brand constants.

## P2 — Note if seen (don't over-rotate)
- **F-07 radius on screen:** on-screen chrome should be square. **Report factually** whether screen
  elements (cards, buttons, chips, panels) carry `border-radius` vs. the squared / clip-path **C5
  stepped** treatment. (A `.c5` class that zeroes radius may be present — note which treatment the
  rendered states actually use; don't assume.)
- **F-05 pips always round**; **F-09 no sunken containers** (selection = accent border + pip, not an
  inset recess; named exceptions: pressed keycaps + text inputs).

---

## OUTPUT FORMAT (return exactly this; raw markdown, no preamble)

```
## <screen> — <PASS | MINOR | VIOLATIONS>  (V<n> / W<n>)

**Files:** <relative path(s)>
**Token block:** <matches canonical | drift: …>
**Type scale:** <conforms | issues>
**GameCards:** <conforms | issues>
**Buttons/keycaps:** <conforms | issues>

### Findings
- [VIOLATION|WARNING|NOTE] (P0.x/P1/P2) <category> — <selector or `file:line`> — expected `<rubric>`, found `<actual>`. <one-line why>
- … (omit this section if none)

### Verdict
<2–3 sentences: overall conformance + the most important fix, if any>
```

Severity: **VIOLATION** = breaks a hard P0/P1 rule. **WARNING** = borderline / role-ambiguous /
small drift. **NOTE** = P2 factual observation. Cite `file:line` where you can. If a category is
clean, say so — don't invent findings. Be precise; quote the actual CSS value.
