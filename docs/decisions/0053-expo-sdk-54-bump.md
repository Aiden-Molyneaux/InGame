# 0053 — Expo SDK 52 → 54 bump (ratified)

**Date:** 2026-06-30 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** none (toolchain / dependency) · **Relates:** the M2 build (PR #5) · surfaced by the M2 lead-audit
**Bumps:** none (records a dependency change + the G-M dependency glance)

## Context
The M2 client build (OpenCode) upgraded the mobile app from **Expo SDK 52 → 54** (`expo ^54.0.0`,
`react-native 0.81.5`, `react 19.1.0`, plus SDK-54 peers `babel-preset-expo`, `expo-linking`,
`expo-constants`, `@expo/metro-runtime`). This was **forced by the owner's device**: the iOS **Expo Go**
client on the App Store tracks the current SDK, so an older-SDK project won't run in Expo Go on the
phone — and the on-device loop (the M2 tangible win, G-B(d)) requires it. The bump is **dependency-only**;
the client code was already React-19-clean. It is *outside* the M2 feature scope but a necessary
toolchain change, disclosed in the M2 receipt and flagged by the lead-audit as owed-formalization.

## Decision — ratified
**Accept the SDK 52 → 54 bump.** On-device testing via Expo Go is a core part of the build loop
(decision 0052 §2), and Expo Go requires an SDK match; staying current avoids a widening drift the
longer we wait. Low code-risk (deps, not logic).

## G-M dependency glance (this is the owner touchpoint)
The new/bumped dependencies are recorded in `tools/deps/justifications.json` and glanced here:
- **SDK/runtime:** `expo ^54`, `react-native 0.81.5`, `react 19.1.0` + the SDK-54 peers above — first-party
  Expo/RN, the reason for the bump.
- **M2 server runtime:** `@node-rs/argon2` (password hashing), `jose` (JWT), `pino` (logging),
  `@sentry/node` (env-gated) — all mainstream, justified in the manifest.
- **M2 client:** `redux-persist`, `expo-secure-store`, `@react-native-async-storage/async-storage`,
  `expo-font`, `@expo-google-fonts/*` — first-party/standard, justified.
Nothing typo-squatted or unmaintained surfaced. Glance = **pass**.

## Build-proof still owed (M2-DoD blocker, tracked separately)
The **full six-check CI spine has not been proven green on SDK-54.** The M2 lead-audit found CI **red**
on PR #5 — a gitleaks false-positive on test-fixture JWT literals halted the single sequential job
**before Build / Export / the F04 bundle-grep ran**. So the SDK-54 **Build + web-export are unverified**.
Ratifying the bump does **not** waive that: the M2-DoD requires the gitleaks allowlist fix + a **full
green spine on the m2 head SHA**, incl. Build + Export on SDK-54 (see the M2 fix-task).

## Ripple
- `CLAUDE.md` §Build/run notes the SDK-54 pin. No spec/behavior change; no version bumps.
- The build-proof (green spine on SDK-54) rides the M2 fix pass, not this record.
