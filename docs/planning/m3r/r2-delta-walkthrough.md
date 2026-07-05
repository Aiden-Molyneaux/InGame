# M3-R · R2 — owner device re-acceptance (delta walkthrough)

> **What this is:** the Phase-R2 device pass that closes M3. Run it on the **physical iPhone via Expo
> Go** (your Metro **:8081** — serves the committed `m3` tree). It's a **delta** pass — only the R0
> native mechanics + the R1 fixes, not a full re-review. Mark each step **✅** (matches) or **🚩**
> (flag). Per-surface manifests + receipts live under `docs/planning/m3r/`; verdict tables in
> `docs/planning/m3-review-notes.md`.
>
> **Legend:** `→ do X → expect Y — <note-id>` · 🔬 = device-only probe (from the murr R0 audit) ·
> **❓ = OPEN QUESTION — your judgment decides it** (highlighted; these are the calls owed to you).

---

## 0 · R0 native mechanics — the reason R2 is on-device
These are native RN behaviours invisible on web; this is the core R0 acceptance.
- → open the Collection **Filter drawer** → slides up from the **bottom of the in-app screen** (inside the device frame), never the iPhone's bottom edge — **S3-b**.
- → **Log Hours**, focus the hours field → the field **rises above the keyboard** (visible, not covered) — **S3-l**.
- → **Add-game**, focus the search bar → the docked search **rises above the keyboard** — **S4-d**.
- → nav keycaps idle → a hard **4px drop edge** (raised 3D key); pressed/active → sinks to **1px** — **S1-c**.
- 🔬 **Lifted-sheet hit-test:** with the Log-Hours sheet lifted by the keyboard, tap its **upper half** (title/field area) → it must **not** close (out-of-bounds touch handled). iOS + Android.
- 🔬 **Keyboard-type switch:** focus Add-game search (dock lifted), switch to the emoji keyboard / collapse QuickType → the dock tracks the new height exactly (no double-lift).
- 🔬 **Seed-vs-dismiss bounce:** open the in-place Collection search (keyboard up), then tap **Filter** → watch for a transient bounce as the drawer opens (should be none / self-correcting).
- 🔬 **Android resize:** open/close the keyboard on Android → the DeviceShell compresses gracefully (no odd squish).

## 1 · R1-5 Shell polish — **calibration (your feel)**
The ¼cm nudges were built to sensible pixels; **R2 is their calibration gate — tell me to tune any.**
- → top bar (POWER / logo / grille) → nudged **up ~¼cm** — **S1-a**. *tune?*
- → nav keys → **down ~¼cm** (closer to the bottom) — **S1-b**. *tune?*
- → **DISCOVER / PROFILE** labels → a couple px **higher** — **S1-d**. *tune?*
- → the black frame/screen border → **thinner** (was 9px → 6) — **S6-b**. *tune?*
- *(bezel colour stays `#0b0a13` — **OQ-132 resolved**, leave-as-is.)*

## 2 · R1-1 Collection
- → view chip → reads **"TOP 10"** (not "TOP") — **S3-d**.
- → **Status** + **Genre** filter sections → each has an **"All"** option — **S3-f/g**.
- → **Sort** tool → ASC/DESC folded **in** (no standalone direction button) + the active direction shown — **S3-h/i**.
- → apply a filter → an **orange pip** on the Filter tool — **S3-k**.
- → tools bar → **icon-only** buttons (no labels), mockup icons — **S3-n**.
- → gold **ADD** button → **larger** + the **TL/BR pixel-stepped** corners (F-02) — **S3-o/p**.
- → count chip → unfiltered **"N game(s)"**, filtered **"N of M games"** (singular-aware) — **S3-j**.
- → **Log Hours** → the current value is **pre-filled** (Save-as-is keeps it; *clearing* is what errors) — **S3-m**.
- ❓ **OQ-131** — the Now-Playing **hero yields (hides) while a search query is active** → **confirm this reading is right.**
- ❓ **OQ-129** — from a fresh screen pick **"A–Z"** → does the direction read right, or show "A–Z ↓" (Z-first, wrong)? → **your call on per-key direction defaults.**
- ❓ **OQ-130** — filter to **zero** matches → the body is blank (no "no results" beat designed) → **do you want a no-results state?**

## 3 · R1-2 Add-game
- → open Add-game → a **3-up CardFan** (centre fore + two rotated neighbours) with ‹ dots › + a **SWIPE** hint — **S4-c**.
- → fan meta → **NAME first**, meta **above** the fan, "IN N COLLECTIONS" + "ADDED BY" credit — **S4-f**.
- → tap a **side** card → it rotates to the fore (auto-shows details); tap the **fore** → nothing (M4 navigate) — **S4-g**.
- → **no count chip** anywhere on this screen — **S4-e**.
- → header → **left** title + **"‹ RETURN TO COLLECTION"** link (no bare X) — **S4-a**.
- 🔬 **N1 — NavBand tap-through:** on Add-game, tap **COLLECTION** or **PROFILE** in the nav → it **navigates away** (nav is live on Add-game). *(route murr-confirmed; this is the eyes-on tap that was owed.)*
- ❓ **Add-game polish (GAP-1..4)** — **your judgment:** fan-nav **dot count/window** (a long POPULAR list = many dots?), **square-vs-notched** dots, **fore-focus-by-default** (addable without a tap?), **status-beat copy** ("ADDED TO YOUR SHELF" vs board "IN HAND — SET ITS STATUS").

## 4 · R1-3 Welcome/Auth + Register + Legal
*(On device the phone hits the working API — so the availability/error items that the broken web lane couldn't show ARE confirmable here.)*
- → sign-in password field → a **FORGOT?** link on the label row; tap → a "coming soon" beat — **S2-h**.
- → **(iOS)** below SIGN IN → an **"OR CONTINUE WITH"** divider + a compact **Sign in with Apple** button; tap → "coming soon" — **S2-i**.
- → tap **SHOW** on the password → the value reveals (**HIDE** toggles back) — **S2-j**.
- → the mode swap → a **text link** ("New to InGame? CREATE ACCOUNT"), not a full button — **S2-g**.
- → **SIGN IN / CREATE** with an empty or erroring field → **disabled** (not only the checkbox) — **S2-a**.
- → in Create, type a **taken** username → "USERNAME **NOT AVAILABLE**"; a **screened** one → "NOT ALLOWED" — **S2-c**.
- → trigger a field error, then **edit that field** → the error clears as you type (+ the availability line returns) — **S2-e/f**.
- → open **Terms / Privacy** from the consent links → **"‹ BACK"** sits **under** the title — **S2-b**.

## 5 · R1-4 Profile
- → open **Profile** → a fixed **"PROFILE"** title band at the top (21px cream bold) — **S5-a**.
- → **Now Playing** → the display (or "Nothing pinned…"), with **no** dead-end "SET NOW PLAYING" button — **S5-b**.

---

## The open questions, collected (your calls at R2)
| ❓ | Where | The question |
|----|-------|--------------|
| **OQ-131** | Collection | Confirm the Now-Playing hero yields while a search is active. |
| **OQ-129** | Collection | Per-key sort-direction defaults (A–Z should start ascending)? |
| **OQ-130** | Collection | A "no results" beat for filtered-to-zero? |
| **GAP-1..4** | Add-game | Fan-nav dot count/window · dot shape · fore-focus-default · status-beat copy. |
| *(resolved)* | Shell | OQ-132 bezel colour — **leave as-is** (ruled). |
| *(open, later)* | app-wide | OQ-127 (GameCard F-02 step not rendered app-wide) → flagged for the **M4-entry DS pass**, not R2. |

## Sign-off
When every step is ✅ (or its 🚩/❓ recorded), **M3 closes**. The remaining M3 tail — the M2+M3 gate
batch · G-K lever values · OQ-119/125/126 rulings · `/code-review` + `/security-review` at PR time —
rides the same sitting or its existing plan (`m3r-build-task.md` §4).
