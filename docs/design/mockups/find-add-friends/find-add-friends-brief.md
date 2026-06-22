# Find / Add Friends (§4.8) — design-track brief (ONE coherent build off Friends draft A)

Authored by the **4.8 Find/Add Friends** track. 4.8 is the **destination of the Friends tab's
find/add hooks** (§3.3 → the header `ADD FRIENDS` key) and the screen that **populates the social
graph**. This is **one coherent build** (not a 3-direction exploration) — it inherits Friends **draft A**
([`../friends/friends-draft-a-feed.html`](../friends/friends-draft-a-feed.html)) verbatim and composes
the §4.8 states in the **same grammar**, so 4.8 reads as the same app.

**Design-side only.** §5.10 Social (SOC-07/08/09/10) is specified — this board renders the *page*, never
edits behavior. Shape gaps go to [`../../../open-questions.md`](../../../open-questions.md) (two logged
this pass — the PersonRow + invite-resolve response shapes).

## Built off draft A (inherited verbatim)
DeviceShell + `NavBand` (FRIENDS active) · the CSS tokens (Teal shell + Midnight screen) · the
Google-Fonts `media="print"` pattern · the **flat Inset-Recess** keycaps (`.btn` / `.head-act`) · the
orange **StateMark** (`--scr-accent`, never the pink shell pip, F-05) · the **F-06** type scale
(21/15/11/9) · the §1.8 lifecycle grammar. **Reused components:** `RequestRow` (`.reqrow`), `InviteHook`
(`.ihook`/`.ih-field`), the avatar monogram (`.av`, PROF-08), `SectionHeader` (`.sec`), the §1.6
lifecycle family. **Inherited current state:** presence (online/offline) + mutual-friend counts were
**CUT** by the owner (2026-06-18) — **not reintroduced** (no `PresenceDot`/`StatPeek`).

## New components (built in draft A's grammar)
- **`PersonRow` / `SearchResultRow`** (`.prow`) — the canonical person surface: avatar + username + the
  **relationship-state action**. The state→action mapping is the legible spine (below).
- **`SearchField/in-place`** (bottom-docked) — reused from the catalog/Discover (`.tools`/`.field`,
  OQ-035): the resting entry (`.ih-field`) docks to the foot, riding the keyboard, results above.
- **`QrCard`** (`.qrcard`) — the in-person add QR (SOC-07), built-in SVG; from `POST /me/invites`.
- **`InviteLanding` / `SenderSummary`** (`.land`) — the **SOC-10** arrival: sender summary + a prefilled
  **one-tap ADD**; resolves through their Profile; captions the no-app → store fallback.

## The relationship-state machine (the crux)
Every person surface shows a RELATIONSHIP STATE → the single right action:

| State | Action | Endpoint |
|---|---|---|
| `none` (not connected) | **ADD** | `POST /friends/requests {toUserId}` |
| `outgoing` (sent/pending) | **CANCEL** (+ PENDING marker) | `DELETE /friends/requests/:id` |
| `incoming` | **ACCEPT** / **DECLINE** (silent) | `POST …/:id/accept` · `/decline` |
| `friends` | (open profile — no add) | row → `/users/:id` |
| `cooldown` | ADD **disabled** + reason ("TRY AGAIN IN N D", SOC-08/SYS-04) | — |
| `blocked` | limited / hidden (mutually invisible, SOC-09; list lives in Settings) | `/me/blocks` |

## Panel / state contract (the single board renders all)
P1 the **hub landing** (search entry + invite + requests reachable) · P2 **username SEARCH** — bottom-
docked field → results (PersonRows across states) · P2b **NO-RESULTS** + the empty prompt · P3 your
**INVITE** — link (copy/share) + QR (`QrCard`) · P4 **REQUESTS** inbox — incoming (ACCEPT/DECLINE) +
outgoing (CANCEL) + the **cooldown-disabled** re-request · P5 **INVITE-LANDING** (SOC-10) — `SenderSummary`
+ one-tap prefilled ADD · P6 **request-sent confirm** (Toast) + the **PersonRow relationship-state
variants** (the spine, all six). Lifecycle (sibling §1.8 grammar): **L1 Skeleton** · **L2 Signal-Lost +
RETRY** · **L3 Offline** writes-gated (SYS-10).

## Flags raised (design-side only — never edited the spec)
- **PersonRow response shape** — `GET /users/search?username=` enumerates no payload; proposed
  `{ userId, username, avatarRef, relationship ∈ none·outgoing·incoming·friends·blocked·cooldown }` (the
  enum that drives every person surface) → inbox.
- **Invite-resolve shape** — `GET /invites/:token` (SOC-10) names "sender summary + prefilled-request
  affordance" but enumerates no payload; proposed the resolve shape + the **QR-generation** question
  (client-side from the token vs server-rendered image) → inbox.
- **NON-COMMERCE** — no gold anywhere (adding a friend creates no card; gold = card-creating, F-02); no
  friend SHARE / no contacts-matching (cut, SOC-07/OQ-052). Block is a relationship state here; its LIST
  lives in Settings (4.15).

## Kept deviation (documented)
The **flat-button affordance** is inherited from draft A = **Inset Recess (B)**, so 4.8 matches its base
and the seam stays coherent. The design-system since locked **Scanline Energize (F)** (2026-06-18) and
rippled the other 14 boards, but the **`friends/` family has not been rippled** — 4.8 follows its base.
Isolated to the one `.btn`/`.head-act` rule; ripples to Scanline in lockstep when `friends/` does.

## Scope / git
Create only under `docs/design/mockups/find-add-friends/`. Read from `mockups/friends/`. Edit
**SCREEN-STATUS row 4.8** only; **append** to `open-questions.md`. Personal identity (Aiden-Molyneaux,
HTTPS); `git pull --rebase` before every push — parallel tracks are live. **Owner gate after Burt-clean —
do not converge.**
