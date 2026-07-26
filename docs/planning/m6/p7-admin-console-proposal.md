# P7 — Admin / Ops Console (proposal for owner sitting)

> **Status:** PROPOSAL ONLY — zero code, zero spec edits. The owner sits on this before anything is
> built. Authoritative ask: `walk4-acceptance-notes.md §P7` (Spotlight curation belongs in an admin
> console hosted OUTSIDE the app — "hosting all the functionalities I'll need to configure server
> settings and monitor other statistics from the live app, including beta", wanted before beta).
> Grounded against product-spec (SYS-04/05/08/12, PROF-09, MOD-01/04/10, §10/OQ-080), api-contract
> §MOD, road-to-market §4 (M7), and the current api code. Author: Opus 4.8 · 2026-07-26.

---

## 0. The single most important finding first

**The `/admin/*` console is already fully SPEC'D and the auth+audit foundations are already BUILT —
nothing consumes them yet.** Specifically:

- `role ∈ user|admin` + `adminTier 1..4` columns exist (`db/schema.ts:56-57`), and `/me` already
  serializes `role`+`adminTier`, `/users/:id` a generic `staff` (`serializers/user-shape.ts`,
  PROF-09). **No user is an admin, no endpoint reads the role for authz, and no `requireAdmin`
  middleware exists.**
- The MOD-10 audit trail is **foundation-complete**: `admin_audit_log` table + the transactional
  `ctx.audit(...)` seam in `db/mutation.ts` + `repositories/audit-repo.ts`. **Zero privileged
  operations call it yet** (by design — the operations are M7).
- `api-contract.md §MOD` (lines 197-209) already specs the whole moderation console surface
  (`GET /admin/reports`, resolve/hide/restore, edit-suggestion review, merge, canonical edit, junk
  removal, takedown, suspend, dossier, remediate, notice). **None are built** — no `admin-routes.ts`
  is mounted (`app.ts`), and `report-service` is deliberately capture-only.
- **Spotlight** is `SPOTLIGHT_IDS` in `config/cosmetics.ts:254` — a SYS-04-tunable **config array**
  (same pattern as `TIER_PRICES`), consumed by `GET /store`. It is edited today by **redeploying the
  config file**; there is no write endpoint. The empty-list fallback = newest-N premium ("the
  registry tail" the walk note flags — fine while the seed stands).

So this proposal is **not** "design the admin console from scratch." It is: (a) decide the pre-beta
minimal cut of an ops surface, and (b) recognize that the M7 moderation console the spec already
describes IS the same console, one phase later.

---

## 1. Recommended shape (opinionated, one paragraph)

Build **ONE console, phased** — a single **standalone static SPA** (Vite + React, hosted on
Cloudflare Pages beside the existing Cloudflare estate) that talks to a **new `/admin/*` router on
the existing Express API**, gated by a `requireAdminTier(n)` middleware reading the `role`/`adminTier`
already on the JWT principal, with every privileged write flowing through the existing `ctx.audit()`
seam. **Phase 1 (pre-beta, this workstream)** ships only what a 12-tester beta genuinely needs:
Spotlight curation, a read-only live-stats dashboard, and a read-only reports/feedback viewer — plus
the auth spine that unlocks everything after. **Phase 2 (= M7's moderation console, MOD-04)** adds the
action verbs (resolve/hide/suspend/merge/remediate) onto the *same* SPA and the *same* router when
real moderation load arrives. This is not two surfaces; it is one surface built in the order the
milestones already imply. Keep it tiny — a 12-person beta needs almost no ops tooling, so resist
building the M7 verbs early.

---

## 2. Scope table

Legend: **PRE-BETA** = in this P7 workstream · **DEFER→M7** = the moderation-console phase ·
**DEFER→ext** = the §10 external operator tool (P3/P4/P5 — money/config/governance, off-phone).
Effort: S ≈ ½ day · M ≈ 1–2 days · L ≈ 3+ days (agent-accelerated).

| Capability | Cut | What it needs (schema / endpoints / auth) | Effort |
|---|---|---|---|
| **Auth spine** — `requireAdminTier(n)` middleware + admin router mount + seed one admin user | PRE-BETA (blocks all else) | No new schema (role/adminTier exist). New: middleware reading `principal.role`/`adminTier`; mount an `admin-routes.ts`; a one-off way to grant yourself admin (SQL/seed — assignment is out-of-band by SYS-08/decision 0033, **no in-app grant endpoint**) | **S** |
| **Spotlight curation** — reorder/add/remove the curated premium ids; live preview; empty-list guard | PRE-BETA (the literal ask) | Move `SPOTLIGHT_IDS` from a config constant to a **1-row settings table** (or a `spotlight_ids` key in a generic `server_settings` kv). New: `GET/PUT /admin/spotlight` (Admin IV / P4 Config); `GET /admin/cosmetics/catalog` to pick from. `PUT` writes a MOD-10 audit row. Server-side **non-empty is not required** (the newest-N fallback already guarantees a non-blank shelf) but the UI should **warn** before saving empty | **M** |
| **Live-stats dashboard (read-only)** — signups, DAU-ish, total adopts, total publishes, catalog size, wallet totals | PRE-BETA | **Mostly free from existing schema** via COUNT/aggregate queries (see §3): users, collection entries, published cards, adoptions (entitlement/ledger rows), catalog games, `currency_ledger`. New: `GET /admin/stats` (Admin III+ / P3). **No new event capture needed for v1.** True DAU/funnel = **DEFER** to PostHog (road-to-market §7) | **M** |
| **Reports & feedback viewer (READ-only)** — list `reports` + `SYS-11` feedback rows so the owner can *see* what beta testers flag | PRE-BETA | `reports` table exists (capture-only today); SYS-11 feedback needs its capture table if not built. New: `GET /admin/reports`, `GET /admin/feedback` (read-only, Admin I+). **No action verbs yet** | **S–M** |
| **Error monitoring** | PRE-BETA — but **use Sentry, don't build it** (road-to-market §7); the console links out to the Sentry dashboard | none (Sentry already the plan) | **XS** |
| **SYS-04 tunables editor** — starting balance, daily-bonus, adoption cost, milestone thresholds, caps, cooldowns | **DEFER→M7/ext** | These live in config today and are **fine as config-file-fine for a 12-tester beta** (you control the deploy). A live editor is real money-lever surface → G-K owner-sign-off territory + P4/P5. Only worth it once you're changing values without a deploy | M (when built) |
| **Rate-bucket (SYS-05) tuning** | **DEFER→ext** | Config-file-fine pre-beta. Live tuning is an ops-maturity feature, not a beta need | — |
| **Reports queue ACTIONS** — resolve/hide/restore/suspend/merge/remediate/dossier/notice | **DEFER→M7** | Already spec'd (api-contract §MOD 197-209) + MOD-04. Each write rides `ctx.audit()`. This IS the M7 console | L (M7) |
| **Economy adjustments (ECON-11)** — Pixel grant/clawback, entitlement adjust, wallet visibility | **DEFER→ext** | Explicitly the external operator tool (§10/OQ-080, P3); out-of-band audited service ops + G-L per-op owner gate. **Never on-phone, never a beta need** | — (ext) |
| **Role/tier grant-revoke, audit-ledger viewer, staff roster** | **DEFER→ext** | P5 Governance (§10). Assignment stays out-of-band | — (ext) |
| **Achievements / store / banned-word authoring** | **DEFER→ext** | P4 Config (§10). Config-file-fine pre-beta | — (ext) |

**Pre-beta v1 = the top five rows (Auth spine · Spotlight · Stats · Reports/feedback viewer ·
Sentry link).** Everything else is honestly deferrable.

---

## 3. What's cheap vs what needs new capture (the stats question)

**Free today** (direct aggregate queries against existing tables — one `GET /admin/stats` endpoint):

- **Signups / total users** — `COUNT(users)`; new-in-last-24h via `users.createdAt`.
- **Total adoptions** — count of adoption ledger/entitlement rows (the `ECON-05` adoption signal
  already persists).
- **Total publishes** — `COUNT(cards WHERE status='published')`.
- **Catalog size** — `COUNT(games)` (non-soft-deleted).
- **Collection volume** — `COUNT(collection_entries)`; total hours logged (already aggregated for
  SYS-12 public stats — reuse that recompute).
- **Economy totals** — sum of `wallets.balance`, `currency_ledger` row counts by reason.

**Needs new capture (DEFER — do not build for beta):**

- **True DAU / MAU / retention / funnel** — there's no session/login-event table; DAU needs a
  last-seen stamp or an events sink. Road-to-market §7 already routes this to **PostHog** on the
  `ACH-08` event spine. For a 12-tester beta, "signups + a rough 24h-active proxy off a lastSeen
  column" is plenty; don't stand up analytics infra for 12 people.
- **Error rates** — Sentry owns this; the console just links out.

Recommendation: v1 stats = the free aggregates + a Sentry link. A `lastSeenAt` column on `users`
(cheap, one migration) is the only borderline add — nice for a crude DAU, but **defer even that** to
the PostHog work unless the owner wants a number on the dashboard now.

---

## 4. The M7 relationship — recommend ONE console, two phases

**Recommendation: ONE console, built in two phases — do NOT design two surfaces.**

The spec already points this way and it would be wasteful to fork:

- `api-contract §MOD` already defines the full `/admin/*` surface; MOD-04 already names "an in-app
  Admin console" for P1/P2. The P7 pre-beta console and the M7 moderation console are the **same
  router + same SPA + same auth spine + same audit seam** — M7 just adds action endpoints and
  screens.
- The only spec wrinkle: MOD-04 says the moderation console is **in-app** (Settings → Admin console,
  role-gated). The owner's P7 ask is explicitly **outside the app**. These are reconcilable and I
  recommend **the external SPA becomes the primary home for BOTH** — the in-app MOD-04 entry can stay
  a thin later convenience (or be re-scoped), but building the external SPA first means M7's
  moderation UI lands there too rather than being rebuilt inside Expo. **This is a genuine spec
  question for §6 — the console's home (in-app vs external) is currently split between the P7 ask and
  MOD-04's wording.** Flag it; don't silently resolve it.
- What stays genuinely separate is the **§10 external OPERATOR tool** (P3/P4/P5 — economy, config,
  governance). That's a *third* concern the spec already parks off-phone. The P7/M7 console is
  content+catalog+ops-read (Admin I/II + a read dashboard); the operator tool is money+config+roles
  (Admin III/IV). Keep that line where the spec draws it.

Net: **one console for P7-ops + M7-moderation; the §10 operator tool remains distinct.** Two
surfaces total, not three, and not one-per-milestone.

---

## 5. Auth plan (role-model delta + MOD-10 audit surface)

**Role model — almost nothing new is needed.** The delta is small because SYS-08 was built at
foundation:

1. **New: `requireAdminTier(n)` middleware** — reads `role`/`adminTier` off the request principal
   (already on the JWT, already serialized by `/me`), 403s otherwise. This is the one real auth build.
   Each admin route declares its tier per the SYS-08 permission groups (Spotlight = P4 → Admin IV;
   stats = P3 → Admin III; reports read = P1 → Admin I).
2. **New (one-off): grant yourself admin** — assignment is **out-of-band by decision 0033** (no
   in-app grant endpoint, ever). For the beta: a seed/SQL statement or a protected runbook command
   sets your row to `role='admin', adminTier=4`. The P5 grant/revoke UI stays in the §10 operator
   tool.
3. **No schema change.** `role`/`adminTier` columns, `staff` serialization, PROF-09 badge all exist.

**MOD-10 audit surface — the seam exists; wire the writes.** Every privileged **write** the console
makes must call `ctx.audit({ action, targetType, targetId, reason })` inside its mutation (the seam
is already in `db/mutation.ts`). For pre-beta v1 the only privileged **write** is **Spotlight
curation** — so v1's audit surface is exactly one action (`spotlight.update`), which proves the
console's audit wiring end-to-end before M7 piles on. The read-only stats/reports endpoints are
GETs → no audit row. The **audit-ledger VIEWER** stays out of v2 scope (P5/§10, per MOD-10/MOD-04) —
v1 only guarantees rows are **written**, matching the spec.

**One caveat worth the owner's eye:** exposing admin GETs (stats, reports, dossier-later) means
admins read across users — that's a **new read class beyond SYS-01's four sanctioned doors**. It's
legitimate (admins are trusted principals; MOD-12 already says admins see true state), but the
`requireAdminTier` gate is the *only* thing standing between a bug and a cross-user leak, so it wants
a standing authz test (the SYS-07/G-D pattern, re-fired for the admin class) the same way the public
read class got one.

---

## 6. Hosting / deploy shape

**Recommendation: a standalone static SPA (Vite + React) on Cloudflare Pages, hitting a new
`/admin/*` router on the existing Express API.** Tradeoff:

- **For (recommended):** The API, JWT auth, principal, role model, and audit seam already exist —
  the SPA reuses all of it over the same `/admin/*` endpoints; zero new backend infra. Cloudflare
  Pages is free and sits beside the estate you already own (registrar + DNS + Resend on Cloudflare).
  A static SPA keeps admin code out of the shipped mobile bundle (smaller app, no admin surface for a
  reverse-engineer to find) and out of Expo's build cycle. It's also the natural home for M7's
  moderation UI later.
- **Against / the honest catch:** There is **no prod API host yet** — the API runs only from
  `.env.dev` on localhost + Docker; the prod host + R2 are owed at **P15/G-C** (m1p log §3). So a
  hosted admin SPA has nothing to point at until P15. **Two clean options:** (a) **build the console
  now against the dev stack** (`localhost:4000`) and it goes live the moment P15 lands — the console
  doesn't block on P15, and pre-beta you're the only admin anyway; or (b) run the SPA **locally**
  (`vite dev` against the dev API) as an owner-only tool until prod exists. I recommend **(a)** —
  build against dev, deploy to Pages when P15/G-C lands, which is already on the beta critical path.
- **Rejected — serving admin HTML from Express:** works, but couples the admin UI to the API deploy,
  needs a static-serving path in the API, and offers no upside over Pages here. Skip it.
- **Rejected — in-app (Expo) admin screens for v1:** MOD-04's eventual home, but it puts admin code
  in the shipped bundle and the owner explicitly wants this **outside** the app. Defer any in-app
  entry to the M7 conversation.

Deploy posture is genuinely **pre-prod**, so v1 can live on the dev stack; nothing here forces P15
earlier than the beta already does.

---

## 7. Open questions for the owner (recommendation first)

1. **Console home — external SPA vs in-app (the MOD-04 tension).**
   **Recommend:** external SPA is the primary home for both P7-ops and M7-moderation; treat MOD-04's
   "in-app" wording as a *spec question to resolve* (likely: re-scope MOD-04's home to the external
   SPA, keep an optional thin in-app entry deferred). — Needs a product-spec/OQ ruling; do NOT
   silently resolve.

2. **How minimal is v1?** My cut is: Auth spine + Spotlight curation + read-only stats + read-only
   reports/feedback viewer + Sentry link. **Recommend:** ship exactly that; a 12-tester beta needs
   nothing more, and every deferred row is honestly deferrable. Confirm you don't want any M7 action
   verb (e.g. hide-a-bad-card) pulled forward for the beta's safety rail. *(If one verb IS wanted, my
   pick would be card takedown — MOD-08 — as the single UGC safety valve.)*

3. **Do you want a real DAU number on the dashboard now?** **Recommend:** no — ship the free
   aggregates (signups/adopts/publishes/catalog/economy totals) and defer true DAU/funnel to the
   PostHog work (road-to-market §7). If you do want a crude daily-active count, the minimal price is
   one `users.lastSeenAt` column + a cheap middleware stamp.

4. **Spotlight storage — config constant → DB, now or later?** **Recommend:** move it to a tiny
   `server_settings` kv (or 1-row table) as part of P7 so curation is a live PUT (no redeploy) — that
   IS the point of the ask. If you'd rather keep it config-file-fine for the beta and edit via deploy,
   we can, but then "Spotlight curation in a console" isn't really delivered.

5. **Who is the admin, and how do you become one?** **Recommend:** a seed/runbook SQL grant sets your
   account to `admin/tier-4` (out-of-band per decision 0033); no in-app or in-console grant endpoint
   in v2. Confirm you're fine self-granting via a documented runbook line.

6. **Timing vs P15.** **Recommend:** build the console against the dev stack now; it goes live when
   P15/G-C (prod API host + secret store) lands, which the beta needs anyway. Confirm you don't want
   it gated behind P15 (i.e., you're OK with it being a local/dev tool until prod exists).

---

## 8. Suggested build order (if the owner approves v1)

1. Auth spine — `requireAdminTier(n)` + `admin-routes.ts` mount + a standing admin-class authz test +
   the self-grant runbook line. *(unblocks everything)*
2. Read-only endpoints — `GET /admin/stats`, `GET /admin/reports`, `GET /admin/feedback`.
3. Spotlight — move `SPOTLIGHT_IDS` to `server_settings`; `GET/PUT /admin/spotlight` (+ the one
   `ctx.audit` write); `GET /admin/cosmetics/catalog` for the picker.
4. The SPA — Vite/React on Cloudflare Pages: login (reuse the auth flow), a stats card grid, a
   reports/feedback table, the Spotlight editor (drag-reorder + empty-save warning), a Sentry link.
5. Deploy to Pages when P15/G-C lands.

This is **not** a spec edit — items 1–3 will need api-contract additions (the read endpoints +
`/admin/spotlight`) and OQ #1 above needs a ruling before those land. That's the change-protocol
step after the owner sits on this.
