# The Beta Feature Wave — pre-store polish, organized (2026-07-18)

> The owner's call: keep packing features into the beta — fast, but well-thought-out — then start the
> store lane. This brief turns the accumulated rulings into ordered packets so we stop iterating blind.
> Pattern per packet: contained ones build now; the two big ones get a **design+spec sitting first**
> (the Wave-D pattern: draft → owner nod → build). Builder≠verifier · combined verify · explicit
> pathspec — all standing discipline holds.

## A · The wave (feature packets)

| # | Packet | Size | Model | State / gate |
|---|---|---|---|---|
| W-1 | **Contributor VIEW ALL to completion** (+ drop the Profile Achievements VIEW-ALL button) | S | opus | **DISPATCHED** |
| W-2 | **Email substrate + Forgot Password** — a transactional-email seam (provider: recommend **Resend**; needs a sending domain → pairs with the P15 Cloudflare sitting) + hashed single-use reset tokens (TTL, rate-limited, enumeration-neutral) + the client flow | M | fable server / opus client | **Spec pass first** (AUTH- IDs); the email-domain half is an owner sitting item |
| W-3 | **Sign in with Apple** — `expo-apple-authentication` + backend identity-token verify (JWKS) + create/link + the AUTH-09 `usernamePending` completion flow (already drawn in the contract) | M | fable | Needs the App-ID capability toggled (owner, ~5 min). **Note: SIWA can't run in Expo Go** — it lands with the P16 EAS dev-build, so W-3 builds now but *verifies* on the first TestFlight build |
| W-4 | **Avatar v1 — the "Monogram Forge"** (recommendation below, pending your nod) | M | opus | Nod on the shape |
| W-5 | **Ultimate colour-customizable cosmetics** (OQ-154; per-design single-SKU, colour picked in the editor via the shared ColorPicker, colour rides the composition; a new Ultimate *pixel-price* tier — **no IAP/RevenueCat dependency**, cosmetics are Pixel-priced) | L | design→fable | **Design sitting → nod → build** |
| W-6 | **Wiki game-detail editing + edit history** (OQ-155; recommended posture: edits go live + fully reversible history now, review rides the M7 mod console) | L | design→fable | **Design sitting → nod → build** (the biggest) |
| W-7 | **P2b — real-RevenueCat Android + G-J + sandbox pass** — **NOW UNBLOCKED** (Play Console fully verified + Android device in hand, 2026-07-18) | M | owner-parallel sitting | Schedule with the sitting batch |

**Order:** W-1..W-4 build in sequence/parallel now (W-2's spec pass first — it and W-3 share the auth
tree, so they run as one auth epic, not concurrently on the same files). W-5/W-6 design drafts get
written meanwhile and land at the next sitting; their builds follow the nods.

## B · The road back (what we're "back to" after the wave — the standing queue)

1. **Your device walk** of Wave D + round-5 (+ the wave as it lands) — the visual gate; fix rounds as needed.
2. **The owner sitting batch** (~30–40 min, batched once): G-D re-fire demo · §1-GO ratify · ACH
   no-farm demo · G-K nods (49-PX set · rate buckets · fuzzy search) · **+ the two W-5/W-6 design
   nods** · **+ the legal/E decision** · **+ the email sending-domain setup (W-2)** · **+ W-7 RevenueCat Android**.
3. **The beta exit lane (P15/P16)**: R2/Cloudflare + API host + managed Postgres provisioning (G-C) →
   EAS builds → **TestFlight (iOS)** + **Play internal testing (Android)** → the close-friends alpha wave.
4. **M7 opens with PUSH** (NOTIF-*) — closes the cross-device real-time gap (N5 residual).

## C · Store lane — first-timer map (owner has never shipped to either store)

- **iOS:** EAS build → App Store Connect → **TestFlight internal** (up to 100 testers, no review, minutes)
  → TestFlight *external* needs a light beta review (~1 day). The close-friends alpha = internal track.
- **Android:** Play Console → **internal testing** (instant, up to 100) → **closed testing**: personal
  accounts must run a closed test with **12 testers opted-in for 14 days** before production access —
  start recruiting the 12 early; the alpha friends double as them.
- **Both stores hard-require a real Privacy Policy URL at submission** — so bucket E (the legal
  placeholder pages) stops being a taste call and becomes a **submission blocker**: real ToS/Privacy
  copy on a hosted domain is owed before the store lane, i.e. it rides the P15 Cloudflare sitting.
- App-privacy questionnaires (Apple nutrition label / Play Data safety) get drafted by Claude from the
  spec's data model at P16.

## D · Avatar recommendation (W-4, pending the owner's nod)

**End-state (full launch): your avatar is a DESIGN** — a square canvas on the same Styler/Canvas
machinery as cards, published through the already-stubbed `/me/avatar/draft → /me/avatar/publish`
flatten pipeline (PROF-08's original vision). Identity as a crafted pixel object. **No photo uploads,
ever** — off-brand, and it drags in UGC-image moderation the beta doesn't need.

**Beta v1: the "Monogram Forge"** — customize the monogram you already wear: its **colour pair**
(shared ColorPicker), a **letterform/glyph** choice, and a small **frame** set. Stored as a tiny
`avatarConfig` on the user (no flatten pipeline needed); renders everywhere the monogram already
renders. Real identity expression for beta friends, nothing throwaway, and the full designer stays a
launch headline.

## E · OWNER SIGN-OFF (2026-07-18) — agenda approved with 3 amendments
All 14 nod-items **approved** except as amended:
1. **W-5 amendment — no promotion:** existing designs KEEP their normal single-colour versions at
   their current tiers; ULTIMATE colour-customizable versions are **minted as separate catalog
   entries** alongside (e.g. MARQUEE 8 PX fixed + MARQUEE ULTIMATE 10 PX customizable). No
   grandfathering needed (nothing changes for existing owners).
2. **W-6 amendment — card reports for incorrect details:** users may report CARDS for incorrect
   details too — the card report-reason enum gains `incorrect_info` (details-required), additive
   MOD-01 amendment; those reports feed the same wrongness signal as game `incorrect_info`.
3. **W-6 amendment — the edit age-gate:** accounts must be **≥ 14 days old** to edit game details;
   **`role='admin'` exempt** (the role model is live — PROF-09/0034; the console stays M7). New
   refusal code (e.g. `ACCOUNT_TOO_NEW`).
Avatar W-4 = the Monogram Forge — **approved**. Builds fan out now: auth-server lane (P-A→P-B→P-D
sequential, same tree) ∥ W-4 ∥ W-6; W-5 + the auth client screens follow as lanes free.
