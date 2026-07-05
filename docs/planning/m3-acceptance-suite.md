# M3 Acceptance Suite — manual device pass (M1 → M3)

> **Run this on the physical iPhone via Expo Go**, top to bottom. It covers everything built through
> M3. Every UI element is tagged so you know **what to judge for polish** vs **what is an intentional
> stub** you should leave alone until its milestone. Jot notes against any ✅ item that isn't
> refined enough to be a good reference for M4 code.

## How to read the tags

| Tag | Meaning | What to do |
|---|---|---|
| ✅ **POLISHED** | Real + owed by M3. This is a reference surface. | **Judge it.** Note any deviation from the mockups / DS. |
| 🎨 **POLISH-LANE** | Real data/logic, but visual/DS refinement is expected (the iteration lane). | Note visual gaps; don't treat as broken. |
| 🏗️ **STUB** | Intentional placeholder, deferred to a later milestone. | **Don't judge fidelity.** Just confirm it doesn't break. |
| ⛔ **NOT YET** | Not built this milestone (inert tab / later feature). | Confirm nothing crashes; expect no content. |

**The DS lens for every ✅ item** (Foundation Rules): **F-06** on-screen type is exactly **21 / 15 / 11 / 9**
· **F-02** gold = *acquisitive only* (ADD / value), never decorative · **F-05** pink is the *shell LED
only*, never on-screen · **F-07** on-screen chrome is square (radius lives on the plastic shell) ·
**F-08** one font per surface (Chakra Petch on screen, Paytone One on the plastic). Watch spacing and how
the device frame fits the real iPhone.

---

## Flow 0 — Launch & the device shell (M1 / M2)

- [ ] App launches in Expo Go → splash spinner → **sign-in**. *(No crash, fonts load.)*
- [ ] ✅ **POLISHED** — the persistent **teal DeviceShell** frames the screen: top band with the
  **INGAME** wordmark (Paytone One), the inset midnight screen, the bottom **NavBand** (locked pre-auth).
- [ ] 🏗️ **STUB** — the DeviceShell **decorative chrome** (speaker grille, embossed logo, bevel detailing)
  is deliberately stubbed (M2 iteration-lane). The *structure/dimensions* are ✅; the *ornament* is not.
- [ ] ✅ **POLISHED** — **fit on your actual iPhone**: does the frame sit right (notch clearance, nav keys
  ~half-cm above the bottom, no dead plastic)? This is a top thing to note.

## Flow 1 — Create an account (M2 auth + this session's OQ-119 / OQ-124)

- [ ] Tap **"New here? Create account"**.
- [ ] ✅ **POLISHED** *(new this session — scrutinize)* — the **acceptance row**: a checkbox +
  "I'm 13 or older and agree to the **Terms of Service** and **Privacy Policy**". **Create account** is
  **disabled** until it's checked.
- [ ] Tap **Terms of Service** → 🏗️ **STUB** — an in-app legal screen opens. The *screen/layout* should be
  clean (✅), but the **copy is placeholder** (🏗️ — real ToS/Privacy on a hosted domain is a release task).
  `‹ BACK` returns. Repeat for **Privacy Policy**.
- [ ] ✅ **POLISHED** *(new — OQ-124)* — type a username **with capitals**, e.g. `Aiden_M`. It should be
  **accepted** (no "a–z only" error). The placeholder now reads `A–Z, a–z, 0–9, _`.
- [ ] ✅ **POLISHED** — **W3 live availability**: as you type (≥3 chars) a beat shows **USERNAME
  AVAILABLE / TAKEN / NOT ALLOWED** (try `admin` → NOT ALLOWED).
- [ ] ✅ **POLISHED** — **per-field errors**: submit a too-short password → the error renders **under the
  password field** (not a top banner).
- [ ] Complete a valid registration → lands on the **Collection**. *(Note the email is a stub-verified
  soft state — no real email is sent; 🏗️ the emailer is a stub.)*

## Flow 2 — Sign in / out / session healing (M2 + OQ-123)

- [ ] Sign out, then **sign in** with the account you just made → back to Collection.
- [ ] ✅ **POLISHED** — a wrong password gives a **neutral** error (no "no such account" disclosure).
- [ ] 🎨 **POLISH-LANE / long-wait** — **OQ-123 auto-sign-out**: leave the app idle past the access-token
  TTL (~15 min) then act → the session should **silently refresh** and keep working; only a truly dead
  session ejects you to `/sign-in`. *(Logic is real + tested; this is the live-timing confirmation.
  A transient blip must NOT sign you out — new fix this session.)*

## Flow 3 — The Collection shelf + hero + Log Hours (M3 · decision 0057)

- [ ] ✅ **POLISHED** — **SHELF** view: one **Now-Playing hero** (card + `NOW PLAYING` eyebrow +
  `{hours}H · {STATUS}` + title + catalog line + **LOG HOURS**) over **two-per-row** card faces.
- [ ] 🏗️ **STUB** — **every card FACE** is the **CARD-18 default face** (title-hue fill + bevel). The real
  vector art + Skia render is **M4** — do not judge the art; do judge the *frame/ratio/placement* (✅).
- [ ] ✅ **POLISHED** — the **count chip** `N OF M` in the header (never a phantom total).
- [ ] ✅ **POLISHED** — **LOG HOURS**: tap → sheet → enter a number → **saves**, the hero stat updates.
- [ ] ✅ *(new fix — verify)* — in Log Hours, tap **Save with the field EMPTY** → it must show an error,
  **not** silently set hours to 0.
- [ ] ✅ **POLISHED** — **empty shelf** (make a fresh account to see it): "YOUR SHELF IS EMPTY" + gold
  **+ Add a game** + a **"Can't find your game? Be the first to add it"** hook. *(The popular-suggestion
  rail lives one tap away in Add-game, by design — not duplicated here.)*

## Flow 4 — Collection views, tools bar, sort/filter drawer (M3 · D2)

- [ ] ✅ **POLISHED** — the **view keycap** cycles **SHELF · GRID · LIST · TOP** (no segmented switcher).
- [ ] ✅ **POLISHED** — **GRID** (faces 🏗️ stub art) and **LIST** (per-row `{hours}H · {status}`).
- [ ] ✅ **POLISHED** — **TOP** view: hours-ranked top-10; the **#1 marker is ORANGE** (F-02 — never gold).
- [ ] 🏗️ **STUB** — TOP is **read-only** and hours-derived. The **ARRANGE** (drag-rerank) + the real
  *curated* Top-10 are **M4** (D3). Don't expect to reorder here.
- [ ] ✅ **POLISHED** — **tools bar**: `⌕ Search` · `Sort` · `Filter` · the **view keycap** · the gold
  **ADD**. Keycaps act; **long-press** opens the drawer at that concern.
- [ ] ✅ **POLISHED** — the **sort/filter drawer**: in-place **Search** · **View** chips · **Sort**
  (+ ASC/DESC) · **Status** filter · **Genre** filter · **RESET** *(new this session — verify it clears
  everything)* · **DONE**. Filtering runs **instantly** over the loaded shelf.
- [ ] ✅ *(new fix — verify)* — apply a **status filter**, then cycle to **TOP** → TOP must **honor the
  filter** (previously it ignored filters).

## Flow 5 — Add a game: search → focus → add / create (M3 · §4.3 boards)

- [ ] Tap the gold **ADD** → the **Add-game** flow.
- [ ] ✅ **POLISHED** — pre-query, the **POPULAR FIRST ADDS** rail (never blank).
- [ ] ✅ **POLISHED** — **tap a card** → it **focuses** (accent ring) and **FocusedMeta** shows
  year · studio, the **CAT-09 presence line** ("IN n COLLECTIONS · n FRIENDS HAVE IT"), and the
  **CAT-05 credit** ("ADDED BY {contributor}"). An already-owned game shows the **own-it ✓**.
- [ ] ✅ *(new fix — verify)* — focus a card, then **change the search text**. The old card must **not**
  stay targeted; **Add** should require a fresh tap (no accidental wrong-game add).
- [ ] ✅ **POLISHED** — **search** is typo-tolerant (try a small typo of a seeded title).
- [ ] ✅ **POLISHED** — **Add** → the **status beat**: all **six** statuses (Backlog · Playing · Beaten ·
  Completed 100% · Dropped · Wishlist) → **"ADDED TO YOUR SHELF"**.
- [ ] ✅ **POLISHED** — **create a new game** (a title not in the catalog): the **dedup InlineBanner**
  ("Did you mean…?" with the matched card's face) → **CREATE ANYWAY**. An **exact** match is
  non-overridable. *(Try a non-Latin title too — new fix: it should create, not collide.)*
- [ ] 🏗️ **STUB** — after the status beat the flow **ends**. The **CardPicker face-step** ("ADOPT THIS
  FACE") + the **celebration** beat are **M4** (they need the card render). Don't expect them.
- [ ] ⛔ **NOT YET** — there is **no report/flag path** (CardDetail → ReportSheet, MOD-01). Moderation is
  **M7** — confirmed intentional, not a miss.

## Flow 6 — Profile (M2 shell → M3 real data)

- [ ] ✅ **POLISHED** — section order: **identity → STATS → PINNED FAVOURITE → TOP 3 → NOW PLAYING →
  MY DEVICE**.
- [ ] ✅ **POLISHED** — **identity**: username, bio, gamertags render from `/me`.
- [ ] 🏗️ **STUB** — the **avatar** is the default monogram; the *designed* avatar (PROF-08, reuses the card
  editor) is **M4**.
- [ ] ✅ **POLISHED** — **STATS**: games · hours · **completion %** (real, PROF-04) in the 6-tile grid.
- [ ] ✅ **POLISHED** — **PINNED FAVOURITE**: your favourite game as a card. *(Face = 🏗️ stub art. The
  **VIEW GAME** door is ⛔ NOT YET — the Game page is M-later.)*
- [ ] ✅ **POLISHED** — **TOP 3**: rank chips + **VIEW TOP 10 ›** (opens the Collection TOP view).
  🏗️ the *ranking* is the hours-derived placeholder (real curation is M4 / D3).
- [ ] ✅ **POLISHED** — **NOW PLAYING**: the pinned game (or a **SET YOUR NOW PLAYING** nudge if unset).
- [ ] ✅ *(new fix — verify)* — you can only set Now-Playing to a game **on your shelf** (the app enforces
  it; the picker/flow shouldn't offer unowned games).
- [ ] 🏗️ **STUB** — **MY DEVICE**: a small labelled MiniDevice thumbnail. Real device customization
  (DEV-\*) is **M4** — placeholder is fine.
- [ ] ⛔ **NOT YET** — no **Achievements** / **My Contributions** gateway rows, no **EDIT / SHARE /
  Settings** tools bar. Those are later milestones (M7 / later).

## Flow 7 — The other tabs (nav shell only)

- [ ] ⛔ **NOT YET** — tap **STORE**, **DISCOVER**, **FRIENDS**. The NavBand switches, but there is
  **no screen** behind them yet (Store = M5, Discover/Friends = M6/M7). Just confirm nav doesn't crash.
- [ ] ✅ **POLISHED** — the **NavBand** itself: five keycaps (STORE · DISCOVER · **COLLECTION** centre ·
  PROFILE · FRIENDS), glyphs in the caps, Paytone labels, the always-present pip. Judge the key grammar.

## Flow 8 — DS polish scrutiny pass (cross-cutting — the M4-readiness judgement)

Walk back through the ✅ screens with the DS lens and note anything that would be a *bad* reference:

- [ ] 🎨 **F-06 type scale** — is on-screen text only ever 21 / 15 / 11 / 9? Any off-scale sizes?
- [ ] 🎨 **F-02 gold** — is gold used **only** for ADD / value, nowhere decorative?
- [ ] 🎨 **F-05 pink** — is pink **only** the shell LED, never on the screen?
- [ ] 🎨 **F-07 corners** — on-screen chrome square; radius only on the plastic?
- [ ] 🎨 **F-08 fonts** — Paytone only on the plastic, Chakra Petch only on the screen?
- [ ] 🎨 **spacing & alignment** — consistent rhythm; nothing cramped or drifting on the real screen.

---

## Intentional stubs — the "leave it alone" list (so you don't over-note)

| Element | Tier | Lands at |
|---|---|---|
| Every card **face** (CARD-18 default art) | 🏗️ | M4 (CARD-15 render) |
| Legal screen **copy** | 🏗️ | release (hosted domain) |
| **Avatar** (designed) | 🏗️ | M4 (PROF-08) |
| **MY DEVICE** customization | 🏗️ | M4 (DEV-\*) |
| **TOP** curation / ARRANGE | 🏗️ | M4 (D3 / COL-13) |
| Shelf **peek-flip** (tap face → stats back) | 🏗️ | M4 (COL-12 / D1) |
| Add-game **CardPicker + celebration** | 🏗️ | M4 |
| DeviceShell **decorative chrome** | 🏗️ | iteration lane |
| **STORE / DISCOVER / FRIENDS** screens | ⛔ | M5 / M6 |
| **Game page** (VIEW GAME) | ⛔ | M-later |
| **Report / moderation** (MOD-01) | ⛔ | M7 |
| **Achievements / Contributions** on profile | ⛔ | M7 |

## Report back

For each screen, note: **(a)** ✅ items that aren't polished enough to be a good M4 reference (the
refine-now list), **(b)** any 🏗️/⛔ that behaves *worse than a placeholder should* (crash, broken layout),
and **(c)** any DS (F-0x) violations from Flow 8. I'll turn your notes into a scoped **iteration-lane
punch-list** (via Parvati) before we open M4.
