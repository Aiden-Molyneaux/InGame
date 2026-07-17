# P8 · Find / Add Friends (4.8) — build manifest

> Surface: the ADD FRIENDS hub (search · invite link + QR) · the full requests inbox · the SOC-10
> InviteLanding FlowTakeover. Board: `docs/design/mockups/find-add-friends/find-add-friends-states.html`.
> IDs: SOC-07/08/09/10. Companion: `friends-manifest.md`.

## Routes
| route | file | board | notes |
|---|---|---|---|
| `/add-friends` | `app/add-friends.tsx` | 4.8 P1/P2/P2b/P6 | the hub — FIND SOMEONE (docked SearchField → inline PersonRow results / no-result invite bridge) · INVITE LINK + QR keys → `/invite-friends` · REQUESTS preview → `/friend-requests`. |
| `/invite-friends` | `app/invite-friends.tsx` | 4.8 P3 | YOUR INVITE — copyable link (COPY / SHARE… native sheet) + QrCard (client-rendered, OQ-073). |
| `/friend-requests` | `app/friend-requests.tsx` | 4.8 P4 / friends P4 | full inbox: INCOMING (ACCEPT/DECLINE-silent) · SENT (CANCEL) · cooldown row (disabled + reason). |
| `/invite/[token]` | `app/invite/[token].tsx` | 4.8 P5 (SOC-10) | InviteLanding FlowTakeover — resolve → SenderSummary + relationship-aware one-tap ADD; ✕ → home; INVITE_INVALID/EXPIRED → expired terminal. Deep-link parked (dev-reachable route). |

## Components (`src/components/social/`)
- `PersonRow.tsx` — the relationship spine (search result). searchRelationship → the one action.
- `RequestRow.tsx` — incoming/outgoing/cooldown row (ACCEPT/DECLINE/CANCEL; requestId-driven).
- `QrCard.tsx` — `react-native-qrcode-svg` QR from the invite token/url (the rule-08 dep).
- `SenderSummary` — inlined in the landing route.
- (reused) `SearchField`, `RelationshipAction` (P9), `ConfirmSheet`, `ReportSheet`, `Avatar`, `Toast`, lifecycle kit.

## State-by-state (find-add board)
| board state | built | status | notes |
|---|---|---|---|
| P1 hub landing (search entry · invite keys · requests preview) | ✅ | OWED | |
| P2 search results (PersonRow spine, docked field) | ✅ | OWED | exact-username; results = PersonRow. |
| P2b no-results (invite bridge) | ✅ | OWED | "@x isn't here" → SHARE AN INVITE LINK; field stays docked. |
| P3 your invite (link + QR) | ✅ | OWED | COPY (clipboard) · SHARE… (native `Share`) · QrCard. |
| P4 requests inbox (incoming · sent · cooldown) | ✅ | OWED | |
| P5 InviteLanding (SenderSummary + one-tap ADD) | ✅ | OWED | relationship-aware: friend→VIEW PROFILE (no dup ADD); outgoing/incoming→right chrome; none→ADD. |
| P6 PersonRow every state + sent Toast | ✅ | OWED | none→ADD · outgoing→REQUESTED · incoming→respond-in-requests · friend→profile · cooldown→disabled+reason · blocked→never surfaces. |
| L1/L2/L3 lifecycle | ✅ / ⚠️ | OWED / EXPECTED(L3) | Skeleton/LoadError built; L3 offline-gated-writes chrome EXPECTED (SYS-10 pass). |

## PersonRow relationship spine (searchRelationship → action)
| relationship | action | mechanism |
|---|---|---|
| `none` | + ADD (live) | POST /friends/requests → sent Toast; 409 REQUEST_COOLDOWN → local disabled + `cooldownUntil` reason |
| `outgoing` | REQUESTED (quiet tag) | **GAP** — search shape carries no `requestId` (OQ-072), so no inline CANCEL; cancel lives in `/friend-requests`. |
| `incoming` | WANTS TO CONNECT › | taps to `/friend-requests` (accept/decline need `requestId`, not on the search shape — same GAP). |
| `friend` | FRIENDS › | taps to `/user/[id]`. |
| `cooldown` | + ADD disabled + reason | `cooldownUntil` from the payload → "TRY AGAIN {date}". |
| `blocked` | (never surfaces) | mutually invisible server-side; the value exists for the shared component only. |

## Data / API
- `friendApi.searchUsers` (lazy, GET /users/search?username=) · the request-lifecycle mutations (see friends-manifest).
- `inviteApi.ts` (new): `createInvite` (POST /me/invites → {token,url,expiresAt}) · `resolveInvite` (GET /invites/:token → {sender,relationship,prefilledRequest}); INVITE_INVALID/EXPIRED surface as the RTK error.
- Invite share via native `Share.share` (the shareCard.ts precedent); COPY via `expo-clipboard`.

## New dependency (rule-08 · G-M glance queued)
- **`react-native-qrcode-svg`** — client-renders the invite QR from the token/url (OQ-073, board P3/find-add). Rides the existing `react-native-svg@15.12.1` (peer). Justification written to `tools/deps/justifications.json`. No other new runtime dep.

## ASSUMPTIONS / GAPS / EXPECTED
- **GAP (OQ-072) — search PersonRow lacks `requestId`:** so `outgoing`/`incoming` search rows can't inline cancel/accept/decline; they route to `/friend-requests` where `FriendRequestItem.requestId` IS present. Faithful to the schema; the board's inline CANCEL/ACCEPT on search rows is deferred to that shape gap. Full lifecycle IS live in the requests inbox.
- **EXPECTED — deep-link / unauthenticated landing:** `/invite/[token]` is dev-reachable; universal-links + cold-install attribution + the store-listing fallback are parked (§10, P15/P16). An authed user gets the full one-tap ADD; an unauthed resolve still shows the SenderSummary (AUTH-LOOKUP read), and ADD routes through the normal auth guard.
- **avatarRef vs avatarUrl:** the shapes carry `avatarUrl` (matching every built serializer; the contract's `avatarRef` is the P1/P2-flagged drift — not this packet's to resolve).
