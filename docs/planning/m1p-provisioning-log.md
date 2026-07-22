# M1-P Provisioning Log — external accounts & store setup

> The durable record of the **M1-P owner lane** ([road-to-market §4](road-to-market.md), row M1-P):
> what's been provisioned, where every credential lives, and **what's still owed with its due-date**.
> Update this file whenever a provisioning step lands — it is the single place the M5–M8 plans point
> at for external-account state. Companion: [m5-build-task.md §6](m5-build-task.md).
>
> Filed 2026-07-12 (the Apple/RevenueCat sitting, Fable-guided). Owner: Aiden.

---

## 1. What's DONE (as of 2026-07-12)

### Identity / app identity
- **Bundle ID / Android package: `com.aidenmolyneaux.ingame`** — ruled 2026-07-12 after
  `com.ingame.app` was found taken (bundle IDs are globally unique). Permanent. Recorded in
  `apps/mobile/app.json` (both platforms identical).
- Apple **App ID registered** (developer.apple.com → Identifiers) with **Sign in with Apple ON**
  (SIWA — the M2 server support's client half will want it), Apple Pay OFF (IAP ≠ Apple Pay;
  digital currency must use IAP).
  - **Correction (2026-07-22):** the SIWA capability was in fact **not** enabled on the App ID —
    the owner found it unchecked and enabled + saved it during the EAS/SIWA sitting below. The
    identifier itself was verified correct (`com.aidenmolyneaux.ingame`).

### Apple Developer / App Store Connect
- **Apple Developer Program**: enrolled (pre-existing).
- **Paid Applications Agreement**: banking + tax submitted.
  - **US W-8BEN filed** — line 9 (Canada residency) checked; **line 10 left blank deliberately**
    (optional; standard treaty treatment applies; explicit Article XII/0% claim deferred to an
    accountant conversation before real revenue — M8). Title field = "Owner".
  - **Canadian GST/HST Form 506: deliberately NOT filed** — see owed table (§3). Apple requires a
    GST/HST Business Number to sell in Canada; CRA doesn't require registration under $30k/yr
    (small supplier), and voluntary registration creates standing filing obligations. Decision
    deferred to M8: register (after accountant check) **or** exclude Canada from paid availability.
- **App record**: "InGame", iOS, primary language English (Canada), SKU `ingame-ios`, Full Access.
- **In-App Purchase Key** (StoreKit 2) generated — **.p8 in the owner's password manager**
  (one-time download; only regenerable, never re-downloadable) + Key ID + Issuer ID; uploaded into
  RevenueCat. Never stored in the repo.
- **Sandbox tester** account created (Users and Access → Sandbox Testers) — for the G-J pass.
- **5 IAP products created** (decision 0072 pricing), all **Consumable**, availability **all
  territories**: `px_pack_starter` $0.99/12PX (once/account — **server-enforced**, Apple sees a
  plain consumable) · `px_pack_010` $1.99/10 · `px_pack_030` $4.99/30 · `px_pack_065` $9.99/65 ·
  `px_pack_140` $19.99/140.
  - **Status "Missing Metadata" is the correct resting state** — the missing piece is the App
    Review screenshot, which requires the built Store screen (M5 P6) and is owed at M8
    pre-submission, not before.
- **EU DSA trader banner: deliberately deferred** — gates EU App Store availability only (not
  TestFlight, not the build). At M8: declare trader (contact info becomes public on the EU store —
  wants a non-home address) **or** exclude the EU from availability.

### RevenueCat
- **Account + Project "InGame"** created (free tier — $0 until >$2.5k/mo).
- **Apple App Store app** added: bundle ID + the In-App Purchase key (.p8/Key ID/Issuer ID).
- **App Store Server Notifications URL** from RevenueCat pasted into App Store Connect (App
  Information → both Production and Sandbox) — the ECON-09 refund-event pipe.
- **Public iOS SDK key** (`appl_…`) → `apps/mobile/.env` `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
  (client-safe by design; gitignored anyway).
- **Secret API key (v2, `sk_…`, named `ingame-server`)** → `apps/api/.env.dev`
  `REVENUECAT_SECRET_API_KEY` (gitignored; placeholder documented in `.env.example`).
- **Products + `default` Offering**: the five SKUs imported / packaged. *(Verify the offering shows
  all five packages on next dashboard visit — last step of the sitting.)*

### EAS / iOS dev build / SIWA E2E (2026-07-22, Claude-guided owner sitting)
- **App ID SIWA capability enabled + saved** (was NOT actually on — see correction above);
  identifier confirmed `com.aidenmolyneaux.ingame`, matching `app.json` and the server's
  `APPLE_BUNDLE_ID` default. Native SIWA needs only this capability (no Service ID/key — that's
  the web-OAuth flavor).
- **eas-cli installed** (global, 21.0.2); **EAS project created + linked**: id
  `e0c1989a-f01a-4c6c-965d-87d9be8ddee6`, owner `aidenmolyneaux` (written into
  `apps/mobile/app.json` by `eas init`).
- **`apps/mobile/eas.json` created** — `development` profile (`developmentClient: true`,
  `distribution: internal`) + a minimal `production` profile for the P16 TestFlight lane.
  `expo-dev-client` added to `apps/mobile/package.json` by the build flow.
- **Owner's iPhone registered** — UDID `00008150-001804D1228A401C`, Apple Team `CQZGXPKBVU`
  (Individual). EAS-managed iOS credentials generated: dist cert (exp. 2027-07-22) + AdHoc
  provisioning profile (portal ID `M62A8VG437`) — stored on Expo's servers, non-interactive
  rebuilds work without Apple login.
- **Dev builds**: build 1 `9600e906` (dead on arrival — see gotcha) → **build 2 `f9c012e6`
  (the good one)**, installed on the owner's iPhone.
  - **The ATS gotcha (cost ~1 h):** SDK 54 dev builds ship
    `NSAllowsArbitraryLoads:false / NSAllowsLocalNetworking:true` — iOS does NOT count
    Tailscale's CGNAT `100.x` as "local", so every cleartext call (Metro AND the `:4000` API)
    was vetoed before touching the network; LAN URLs separately hung on the Windows firewall
    (Wi-Fi = Public profile). Fix: `ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads:
    true` in `app.json` + rebuild. Verified in the shipped `.ipa` (both builds also verified to
    carry the `com.apple.developer.applesignin` entitlement).
- **✅ SIWA VERIFIED END TO END (2026-07-22):** dev build → Metro `:8082` over Tailscale → the
  native Apple button rendered → real Apple sheet → API (real verifier, `APPLE_VERIFIER=apple` in
  `apps/api/.env.dev`) verified the identity token via Apple's remote JWKS (nonce-bound, `aud` =
  bundle id) → `usernamePending` → choose-username → in the app. Server evidence:
  `funnel:"signup", method:"apple"` in the API log. The real verifier was also negatively tested:
  it 401s the stub's forgeable `mock.*` tokens.

### Google Play (VERIFIED — updated 2026-07-19 from owner report)
- **Enrollment 2026-07-12**: personal developer account, $25 paid, identity verification submitted.
- **✅ IDENTITY VERIFICATION COMPLETE + ANDROID DEVICE IN HAND (owner-confirmed 2026-07-18):** "a fully
  verified Google Play Console account" and "officially have an Android device." This UNBLOCKS the Play
  side of RevenueCat (P2b), G-J, and the sandbox pass. **FLAG:** the specific Android device MODEL was not
  reported — capture it here when known (needed only for the QA record, not blocking).

---

## 2. Where every credential lives (no values here — locations only)

| Credential | Location |
|---|---|
| Apple .p8 In-App Purchase key + Key ID + Issuer ID | Owner's password manager (+ uploaded into RevenueCat) |
| RevenueCat public iOS SDK key (`appl_`) | `apps/mobile/.env` (gitignored) |
| RevenueCat secret API key (`sk_`, v2) | `apps/api/.env.dev` (gitignored) |
| RevenueCat webhook auth secret | **doesn't exist yet** — invented at P2b (`REVENUECAT_WEBHOOK_AUTH`) |
| Sandbox tester credentials | Owner's password manager |
| Google Play / RevenueCat dashboards | Owner's Google/RevenueCat logins |
| EAS iOS dist cert + provisioning profile | Expo's servers (EAS-managed; `eas credentials`), account `aidenmolyneaux` |

---

## 3. What's OWED (the do-not-forget table)

| # | Item | Due at | Detail |
|---|---|---|---|
| 1 | ~~Google Play identity verification completes~~ **✅ DONE 2026-07-18** (owner-confirmed) | — | Was the multi-day clock; now verified |
| 2 | ~~Android device acquisition~~ **✅ DONE 2026-07-18** — device in hand | — | Owner has a physical Android device (model TBD — capture when known); doubles as the M6–M8 Android QA unit |
| 3 | **Play device verification** | before the app can go live on Play (M6 beta track prep) | Needs #1 + #2 |
| 4 | **Play app record** (`com.aidenmolyneaux.ingame`) + Play-side IAP products (same 5 SKUs) | after #1; before Play-side sandbox/beta IAP | Mirror of the Apple product sheet (decision 0072) |
| 5 | **RevenueCat Play app + service-account credentials** | with #4 | RC needs a Google Cloud service-account JSON for Play — its docs walk it; Android public SDK key (`goog_…`) → `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` then |
| 6 | **RevenueCat webhook wiring** | **P2b** (m5-build-task §3) | Invent `REVENUECAT_WEBHOOK_AUTH`, register the `/iap/webhook` URL in RC — needs a tunnel or deployed API (localhost unreachable) |
| 7 | **`react-native-purchases` install + keys consumed** | **P2b** | The one sanctioned new runtime dep (decision 0046) |
| 8 | **G-J IAP-live gate + first manual sandbox pass** (iOS) | P2b done + owner sitting | Caveat recorded in §5 G-J: if sandbox returns no products, check the "Missing Metadata" status first |
| 9 | **12 warm-body testers** | M6 closed beta → M8 | Post-Nov-2023 personal Play accounts: production release requires a closed test with 12 testers for 14 days. M6's TestFlight/Play-internal beta is unaffected; recruit toward 12 |
| 10 | **Canadian GST/HST decision** | **M8 launch checklist** | Either register a BN/GST-HST account (15-min accountant check first — standing filing obligations!) and file Apple's Form 506, **or** exclude Canada from paid availability at launch |
| 11 | **W-8BEN line 10 / treaty-article review** | M8 (with #10's accountant) | Filed blank = standard treatment; confirm Article VII vs XII posture before real revenue |
| 12 | **IAP review screenshots** (clear "Missing Metadata" → "Ready to Submit") | M8 pre-submission | Needs the built Store screen (M5 P6) to screenshot |
| 13 | **EU DSA trader declaration** (or exclude EU) | M8 launch checklist | Trader = public contact info on the EU store; consider PO box / exclude EU |
| 14 | **Cloudflare R2 + CDN storage** | before the M6 beta | m5-build-task §0.5 — local-disk StorageProvider until then |
| 15 | **APNs/FCM push credentials** | M7 (push) | The remaining M1-P roadmap line |
| 16 | ~~EAS signing/build setup~~ **✅ DONE 2026-07-22** (iOS) | — | eas.json + EAS project + iOS credentials + dev build `f9c012e6`; SIWA E2E verified. Android EAS build still unconfigured (owed with the Play lane) |
| 17 | **Scope `NSAllowsArbitraryLoads` OUT of production builds** | M8 pre-submission | Set 2026-07-22 for the dev-build loop (Tailscale is non-"local" to ATS); an App-Review flag if shipped. Prod API is HTTPS anyway |
| 18 | **TestFlight internal (P16)** | next iOS distribution step | Foundation now in place: `production` profile stubbed in eas.json; needs `eas build --profile production` + App Store Connect TestFlight setup |

---

## 4. The process, for repetition (Google Play will follow the same shape)

Apple took ~90 min of owner-clicking, Fable-guided: **register App ID → Paid Apps agreement
(banking + W-8BEN; defer regional tax forms) → app record → In-App Purchase key → sandbox tester →
RevenueCat project/app/keys/server-notifications → products (after the pricing ruling, decision
0072) → availability all territories → accept "Missing Metadata" as the resting state.** The
gotchas that cost time: bundle-ID collision (fixed: personal namespace), the GST/HST form (defer),
line-10 treaty fields (leave blank), Title field ("Owner"), Apple Pay capability (irrelevant — IAP
needs no capability).
