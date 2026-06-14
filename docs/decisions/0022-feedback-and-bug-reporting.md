# 0022 — In-app feedback & bug reporting (SYS-11)

- **Date:** 2026-06-13
- **Status:** accepted
- **Related IDs:** **SYS-11 (new)** · SYS-04/05/09, MOD-01/07, CARD-02 (product-spec 0.22) ·
  `POST /feedback`, `POST /feedback/:id/logs` (api-contract 0.22) · design-req §4.15 (0.17) ·
  **OQ-060 (new)**.
- **Source:** owner direction (2026-06-13), during **Settings (4.15)** design prep.

## Context
Settings was queued for design. The owner asked for a place where users can leave **feedback,
suggestions, and bug reports** — and, for bugs, an option to **upload InGame device logs** to the
server. The log format isn't defined yet; the UI should **leave room** for it. This is new behavior
(a submission + a data model + an endpoint + the app's first client→server binary upload), so per the
one-editor rule (00-INDEX §4) it is formalized here **before** Settings is drawn.

## Decision
**+SYS-11.** A Settings feedback surface with three **types** — feedback / suggestion / bug — each
carrying a freeform **message**. It is **support/moderator-facing only**, never rendered to other
users, so it is **outside MOD-07 screening** (exactly like the report `details` note, MOD-01).

A **bug** report may **opt in to attach the app's on-device diagnostic logs**. The attach is
**opt-in and consent-gated** (a toggle + a one-line consent note, never auto-attached). The bundle is
treated as **opaque** — its structure is **undefined in v2** (→ **OQ-060**); the contract reserves
`POST /feedback/:id/logs` and stores the bundle in **access-controlled object storage** (`log_ref`).
Submission is **rate-limited** (SYS-05). It **pairs with Help/Contact** (SYS-09), which remains the
*reach-support* channel.

## Rationale / alternatives
- **Structured feedback vs. just expanding Help/Contact (SYS-09):** a typed feedback/suggestion/bug
  stream is triageable product input; Help/Contact is a support escape-hatch (mailto/form). Both kept,
  kept distinct.
- **Diagnostic-log upload vs. the "no uploads" stance:** the no-image-uploads rule (CARD-02 / §9) is
  about user *content* rendered to others (the reason there's no upload-moderation pipeline). A
  diagnostic bundle is a **private support artifact** — never rendered, access-controlled — so it does
  **not** reopen that rule. Called out explicitly so it doesn't read as a contradiction.
- **Opaque + opt-in + consent-gated, structure deferred:** logs can carry PII/identifiers, so v2 will
  not auto-collect, and the schema/redaction/retention is **deferred to OQ-060** rather than guessed —
  the UI and contract leave room without committing to a shape or a capture mechanism.
- **Naming:** the owner's "device logs" = the app's **on-device runtime/diagnostic logs**, *not* the
  `DEV-` *Device* cosmetic; the spec uses "diagnostic logs" to avoid the collision (the user-facing
  control may still read "device logs").

## Ripple
- **product-spec 0.22:** +SYS-11; SYS-05 rate-limit list; §6 `feedback_submissions`; §9 log-bundle
  storage note.
- **api-contract 0.22:** +`POST /feedback`, +`POST /feedback/:id/logs` (opaque bundle, OQ-060).
- **design-req §4.15 (0.17):** the feedback/bug surface added to Settings must-host + a design-direction
  note + its states.
- **open-questions:** +OQ-060 (log bundle structure / capture / redaction / retention).
- **Design (owed at converge):** the Settings board's feedback surface + states, **design-spec**, and
  **SCREEN-STATUS 4.15** re-sync when that pass lands.
