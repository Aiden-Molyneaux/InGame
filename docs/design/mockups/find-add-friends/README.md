# Find / Add Friends (§4.8) — mockups

The **§4.8 Find / Add Friends** design track — the screen that **populates the social graph** and the
**destination of the Friends tab's find/add hooks** (§3.3 → the `ADD FRIENDS` header key). This is
**one coherent build** (not a 3-direction exploration): it inherits Friends **draft A**
([`../friends/friends-draft-a-feed.html`](../friends/friends-draft-a-feed.html)) verbatim and composes
the §4.8 states in the same grammar, so 4.8 reads as the same app. Design-side only — §5.10 Social
(SOC-07/08/09/10) is specified; shape gaps go to the inbox (OQ-072/073).

See **[`find-add-friends-brief.md`](find-add-friends-brief.md)** for the contract, the relationship-state
machine, the panel/state map, and the hard rules.

## The board (for the owner gate — 2026-06-22)
| File | What it is |
|---|---|
| [`find-add-friends-states.html`](find-add-friends-states.html) | The full §4.8 states board — **P1 hub landing** · **P2 username search** (results, the live state spine) · **P2b no-results** (invite bridge) · **P3 your invite** (link + `QrCard`) · **P4 requests inbox** (incoming/sent/cooldown) · **P5 invite-landing** (`SenderSummary` + one-tap ADD, SOC-10) · **P6 PersonRow state spine** + the sent-confirm Toast · **L1 Skeleton · L2 Signal-Lost · L3 Offline** (writes-gated, §1.8). |

**Status:** in pass → owner gate. **Do not converge** until the owner signs off. Converge target (later):
the design-spec §1.5 ratification of the new components + the API page-audit (OQ-072/073).

## The relationship-state machine (the spine)
Every person surface (search result · requests row · invite-landing) shows one **relationship state** →
the single right **action**:

| State | Action | Endpoint |
|---|---|---|
| `none` | **+ ADD** | `POST /friends/requests {toUserId}` |
| `outgoing` | **CANCEL** (PENDING marker) | `DELETE /friends/requests/:id` |
| `incoming` | **ACCEPT** / **DECLINE** (silent) | `POST …/:id/accept` · `/decline` |
| `friends` | open profile (no add) | row → `/users/:id` |
| `cooldown` | ADD **disabled** + reason | (SOC-08 / SYS-04) |
| `blocked` | limited / hidden (mutually invisible) | `/me/blocks` (LIST in Settings) |

## Built off draft A
Inherits the DeviceShell + NavBand (FRIENDS active), the Teal/Midnight tokens, the flat **Inset-Recess**
keycaps, the orange StateMark, the **F-06** type scale, and the §1.8 lifecycle grammar. **Reuses:**
`RequestRow`, `InviteHook`, the avatar monogram (PROF-08), `SectionHeader`, the §1.6 lifecycle family.
**Inherited current state:** presence + mutual-friend counts stay **CUT** (owner, 2026-06-18). **New
components** (form is this board's; names proposed, ratified at converge): `PersonRow`/`SearchResultRow`,
the bottom-docked `SearchField` (OQ-035), `QrCard`, `InviteLanding`/`SenderSummary`.

## Non-commerce (the law honored)
**No gold anywhere** (adding a friend creates no card; gold = card-creating only, F-02) · **no friend
SHARE** (OQ-052 cut — sharing is self-only: your invite link) · **no contacts-matching** (SOC-07) · the
**PIXELS mark is unused**. Block is a relationship state here; the blocked LIST lives in **Settings**
(4.15).

## Flags raised (design-side only — never edited the spec)
- **OQ-072** — `GET /users/search?username=` PersonRow response shape (the relationship enum that drives
  every person surface) is unenumerated; proposed in the inbox.
- **OQ-073** — `GET /invites/:token` resolve shape (SenderSummary + prefilled request) + the **QR
  generation** question (client-side from the token vs server-rendered); proposed in the inbox.

## Burt audit
**PASS ✅** (0 blocker · 0 major), reconciled against Foundation Rules F-01..F-09 + the flat-F-03 /
StateMark-F-09 in-flight directives. One minor fixed in-pass (the SearchField caret recolored pink →
`--scr-accent`, so no on-screen pink remains). **Documented deviations kept:** flat buttons = **Inset
Recess** (matches draft A; the `friends/` family isn't yet rippled to the locked Scanline — isolated to
one `.btn`/`.head-act` rule) · the `.err-card .bang` 34px Signal-Lost glyph (verbatim §1.6 sibling
grammar, app-wide consistent — owner-ratification).
