# Friends (§3.3) — design-track kickoff: THREE drafts → gate → converge

Authored by the FRIENDS track (self-briefed from ui-design-req §3.3 + product-spec §5.10 Social +
the api-contract Social section + the sibling boards' grammar). Friends is the next unstarted primary
tab in `SCREEN-STATUS.md` (row 3.3, `⬜`). The standing multi-draft rule applies (novel surface → 3
distinct treatments → gate → converge). This file is the plan; the gate ruling gets appended verbatim
at the bottom.

**Design-side only.** §5.10 Social is fully specified — the drafts render the *page*, never edit the
behavior. Behavior/contract gaps go to `docs/open-questions.md` (one logged this pass — the `/me/feed`
item shape, below).

## The screen (the contract — ui-design-req §3.3)
Friends is a **TOP-LEVEL TAB** — *"keep up with people + find new ones."* Persona: **Socializer**. It
renders **inside the device chrome** — `DeviceShell` + `NavBand` persist (the **FRIENDS** keycap, the
5th/rightmost, active = pressed + pink `PipLight`), content scrolls within (a **tab**, not a
`FlowTakeover`). Must host:

- **Activity feed as the landing view** — aggregated, **deliberately low-noise** (`SOC-06`).
- **Friends list** → friend Profile / read-only Collection (`SOC-01`, PROF-05/COL-10).
- **Requests** — incoming **accept / decline** (decline is **silent**); outgoing **cancel** (`SOC-08`).
- **Find/add friends:** **username search** + **invite link** + **QR** — *no contacts-matching* (`SOC-07`).
- **Block** entry points: a friend's overflow + the report flow (`SOC-09` / MOD-01); the blocked-users
  list itself is managed in **Settings** (4.15), not here.
- **Jump-off to Compare Hours** (`SOC-03`).

## Scope the TAB — don't redraw the sub-screens
The heavy sub-flows have their **own** screens, queued separately: **4.6 Compare Hours · 4.7 Lists/
Top-5 · 4.8 Find/Add Friends**. So the Friends **tab** = the **activity feed** (SOC-06) + the **friends
list** + the **requests inbox** + **jump-offs** into those sub-screens. Compare / Find-Add / Top-5 are
drawn as **entry points** (a chip, a hook, a header key), never as destinations.

## API shapes already drafted (🔶 — page-audit comes at converge)
`GET /me/friends` · `GET /me/friends/requests` · `POST /friends/requests {toUserId}` ·
`POST /friends/requests/:id/accept`·`/decline` · `DELETE /friends/requests/:id` (cancel) ·
`DELETE /me/friends/:userId` (unfriend) · `GET·POST·DELETE /me/blocks` · `GET /users/search?username=` ·
`GET /me/compare/:friendId` · `GET·DELETE /me/recommendations` + `POST /recommendations` ·
`GET /me/feed` · `POST /me/invites` · `GET /invites/:token`.

**Central contract gap (flagged, not fixed):** `GET /me/feed` (api-contract ~line 123) is named
*"low-noise, aggregated friend activity (SOC-06)"* but its **response item shape is not enumerated** —
the page's one real gap. **Logged OQ-071** proposing the aggregated feed-item shape; resolve at the API
page-audit. *(Presence/online state — the roster's "ONLINE NOW" dot + "in HADES" peek — is likewise
unbacked by the spec/contract; drawn **illustratively** and raised at the gate, not logged, to keep this
pass to the one sanctioned append.)*

## OQ-052 is a CUT — no friend-profile SHARE anywhere
Sharing is **self-only** (your own invite link, SOC-07). There is **no SHARE affordance** on a friend's
row, profile, or the actions sheet — the find/invite hook (your link/QR) is the only "share" surface.

## The new components (the headline; FORM is each draft's, NAMES are locked)
Built across all three drafts; ratified + folded into design-spec §1.5 at converge:
- **`FeedRow` / `ActivityRow`** — the SOC-06 **aggregated** item: actor avatar + actor + an **actor+type
  aggregated** predicate (*"Riko added 12 games"* as **one capped row**) + a **capped object peek** (≤3
  card `thumb`s + "+N", or a single published card) + a relative timestamp. **Trivia excluded; the
  initial collection import never floods.** Quiet-vs-active are states of the same component.
- **`FriendRow` / `FriendTile`** — the roster item: avatar + **`PresenceDot`** + username + **`StatPeek`**
  (hours · now-playing, e.g. *"210 H · DESTINY"* / *"ONLINE · IN HADES"*) + a **COMPARE** jump-off (→4.6)
  + overflow. `Row` = list; `Tile` = grid.
- **`RequestRow`** — incoming (avatar + *"@nova wants to connect"* + mutual count + **ACCEPT / DECLINE**)
  and outgoing (avatar + *"@sable · sent 2d"* + **CANCEL**). SOC-08; decline silent.
- **`PresenceDot` / `StatPeek`** — the small presence LED (online · recently · offline) + the one-line
  hours/now-playing readout. **Presence is illustrative** (see the gap note above).
- **`InviteHook`** — the cold-start / find-more CTA: username **search field** + **invite-link** +
  **QR** keys (→ 4.8 Find/Add). The no-friends hero and the C-draft "connect" zone are both built on it.

**Reuse (don't reinvent):** `GameCard/cell|thumb` · the **avatar** monogram (square, `scr.accent`, from
Profile/PROF-08) · the **sheet/drawer** family (P6 actions) · `KeycapButton`/`ToolKeycap` (**flat** — see
buttons) · the COMPARE `chip` (Profile friend-view) · `SectionHeader`(`.sec`) · `Strip`/`ListRow` ·
`EmptyState`/the dashed `inv-card` · the §1.6 **lifecycle** family (Skeleton · Signal-Lost+RETRY ·
Offline writes-gated) · `DeviceShell` + `NavBand`. Any **other** genuinely-needed component → build it,
**flag it at the gate**.

## The three models (different default + different primary surface — not a recolor)
The distinctness axis: **what you land on, and which surface is the body vs a peek/jump-off.** All three
host the same surfaces (feed · roster · requests · find-add) and the same locked components — they differ
in **which one leads** and **how the others are reached** (deliberately three *different* nav models, not
one shared switch with a different default segment).

- **A — "Feed-first"** (the social-stream pole; the IA's stated default → `friends-draft-a-feed.html`).
  The **SOC-06 aggregated feed IS the landing** — one continuous low-noise scroll. Roster is a slim top
  **`ONLINE NOW` presence rail** (avatars) with `ALL FRIENDS →`; requests surface as an **inline top
  banner** (*"2 requests"* → inbox); find/add is a **header key** (person-plus → 4.8). Thesis: **one
  stream; everything else is a peek or a jump-off.** Minimal chrome — no sub-tabs.

- **B — "Roster-first"** (the people-directory pole → `friends-draft-b-roster.html`). The **friends LIST
  is the body** — presence-sorted (online first), each `FriendRow` carrying hours/now-playing + a
  COMPARE jump-off; a **tool bar** (the Collection grammar: presence/A–Z/recent sort) heads it. The feed
  is a **collapsed `RECENT` digest** (2–3 lines, `SEE ALL →`); requests are a **count-badged header key**
  opening the inbox. Thesis: **your people are the body; activity is a digest, growth is a key.**

- **C — "Connect-first"** (the growth pole; tuned to the cold-start / low-friend reality →
  `friends-draft-c-connect.html`). A **priority-stacked** landing: a top **`CONNECT` zone** — pending
  **requests to act on** + the **`InviteHook`** (search · invite-link · QR, → 4.8) as the hero — then
  **`YOUR CIRCLE`** (a compact roster) and an **`ACTIVITY`** digest below. Thesis: **the growth tasks
  lead; maintenance sits beneath** — best when you have 0–3 friends and a request waiting.

Each draft's **P1 promotes one surface to the landing**; that surface's twin detail panel (A→feed,
B→roster, C→requests) is the model's natural deep view. The remaining surfaces are rendered as that
draft frames them.

## Panel contract (each draft renders P1–P6; lifecycle deferred to converge WITH a caption note)
- **P1** — **the landing** (the model thesis: A feed · B roster · C connect-zone).
- **P2** — **the activity feed** (`SOC-06`): actor+type **aggregated** rows — *"Riko added 12 games"*,
  *"Vanta beat HOLLOW KNIGHT"*, *"Riko published a card"*, *"Vanta unlocked an achievement"* — capped,
  low-noise, trivia excluded. **Quiet** (a near-empty digest + nudge) **vs active** variants.
- **P3** — **the friends list** (`SOC-01`): presence + hours/now-playing; tap → friend Profile /
  read-only Collection; per-row **COMPARE** jump-off (→4.6).
- **P4** — **the requests inbox** (`SOC-08`): **incoming** accept / decline-silent · **outgoing** cancel;
  the **re-request cooldown** noted; mutual-friend counts.
- **P5** — **no-friends / cold-start** (`SOC-07/10`): the `InviteHook` hero (username search · invite
  link · QR → 4.8) + a quiet feed; the *"your circle is empty"* invitation, never a scold.
- **P6** — **a friend row's actions** (a bottom **sheet**): **VIEW PROFILE · COMPARE HOURS** (→4.6) **·
  RECOMMEND A GAME** (SOC-05 → their What-to-Play) · a divided safety section **REPORT** (→4.16, MOD-01)
  **+ BLOCK** (SOC-09, silent). **NO SHARE** (OQ-052 cut). Unfriend (silent, SOC-08) lives here too.

**Deferred to converge (caption it):** `Skeleton` · `LoadError` "Signal Lost" + RETRY · `Offline`
(SYS-10 — feed/roster read from cache; **writes** — accept/decline/cancel/recommend/block — **gated**) ·
reduce-motion notes. Grammar reused verbatim from the sibling boards' §1.6 family.

## Buttons + marker — the OWNER-PICKED flat style (Inset Recess · B, 2026-06-17)
On-screen keycaps are **flat**: idle = flat fill, **pressed/selected = darkened fill + inner shadow, NO
travel** (no `shadow.key` raised edge, no translate). Built from
`collection/collection-flat-buttons-drafts.html` variant **B** + `game-page/
game-page-dual-dossier-flat-buttons.html`. The shell **NavBand** keys stay **physical** (`0 4px 0`,
press-down). On-screen selection/active marker (any segmented or selected on-screen control) = the
**orange pixel-square / accent border** (`scr.accent`, flat, notched corners) — **never** the pink
`ChipPip` (pink = shell LED only, F-05). *(design-spec F-03 still reads the old 3D mandate — its re-word
is owed separately; built to the owner pick.)*

## Hard rules (carried from the tracks)
- **Compose from the design-spec §1.5 catalog**; reuse locked names (above). **Tokens verbatim** (Teal
  shell `--plastic`/`--silk` + Midnight screen `--scr-*`; `--accent` pink = shell, `--scr-accent` orange
  = screen; `--gold` reserved for **card-creating** only — there is none on Friends, so **no gold keys**).
  Standalone HTML artboards (Claude Design exports lack local deps). Google Fonts via `media="print"
  onload`; **built-in / hand-drawn SVG only**. The **PIXELS mark / `ic-pix` is NOT used** — Friends is
  non-commerce. The **Store** nav key stays **gilt/yellow**, **Collection** pink (the locked NavBand).
- **Sample data** (consistent across drafts; illustrative — OQ-002/011, presence un-specced): **Maverick
  = self** (MV) · **Riko** (RI, `#6c4fd8`) + **Vanta** (VA, `#3a3a42`) = friends, plus **Kai · Nova ·
  Sable** to populate the roster/requests; **Destiny (210 H)** = Maverick's now-playing anchor; friends'
  feed activity references the house real-game set (Hades · Hollow Knight · Celeste · Elden Ring …).
  Presence/counts/mutuals **caption-marked illustrative**.
- **HTML only — never commit PNGs.** Headless-Edge self-checks go to TEMP and are **deleted before the
  turn ends**.
- **Scope discipline:** behavior questions → **APPEND to `docs/open-questions.md` only** (one logged:
  OQ-071, the feed shape). Do NOT edit product-spec / api-contract / design-spec / catalog / other
  tracks' files, or any `SCREEN-STATUS` row other than **3.3 Friends**. Personal git identity
  (Aiden-Molyneaux; HTTPS; don't override); `git pull --rebase` before every push (parallel tracks
  active — a Game-page converge agent + a spec-owner agent are live).

## File map
Folder: `docs/design/mockups/friends/` — `friends-draft-a-feed.html` · `friends-draft-b-roster.html` ·
`friends-draft-c-connect.html` (README gets a row per draft).
**Converge target (LATER, after the owner picks):** `friends/friends-states.html` (full matrix incl.
lifecycle).

## Process
1. Author this brief → commit/push. Flip `SCREEN-STATUS` §3.3 Friends **⬜ → 🔶** (in pass). Touch only
   the 3.3 row. Append OQ-071 to the inbox.
2. Draft A → verify headless (delete shots) → README row → commit → push. Same for B, then C.
3. **Present at the owner gate (STOP):** each model's thesis (the nav-model difference made explicit) ·
   its handling of the cold-start/low-friend reality + the SOC-06 low-noise mandate · the flagged gaps
   (feed shape OQ-071 · presence) · every judgment call. **Do NOT converge** — await the owner's pick +
   iteration notes.

---

## Owner gate ruling — A "Feed-first" WON (2026-06-22/23)
Owner chose **A "Feed-first"** as-drawn (post the 2026-06-18 presence/mutual-count cuts); **B "Roster-first"
/ C "Connect-first" retired to history**. Converged → **[`friends-states.html`](friends-states.html)**: P1–P6
carried; **lifecycle drawn** (L1 Skeleton · L2 Signal-Lost+RETRY · L3 Offline writes-gated) + **Q1
quiet-feed/empty-requests**; **flat buttons rippled to Scanline Energize** (F-03; the draft predated the
sweep); F-06 clean. Find/add + full requests inbox = **4.8** (the header key + banner jump there). **SOC-05
recommend-compose** surface deferred → **OQ-075**. Burt PASS (1 owner-ratification: `.achv` gold-as-achievement
glyph). Design-spec §1.5 formalization + API page-audit (OQ-071/075) owed to the spec-owner. (No iteration
notes given — converged A as-drawn.)
