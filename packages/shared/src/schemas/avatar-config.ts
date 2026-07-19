import { z } from 'zod';

// PROF-08 — the beta "Monogram Forge" avatarConfig (W-4, docs/planning/m6/beta-feature-wave.md §D,
// owner-approved 2026-07-18). A TINY, PUBLIC-SAFE cosmetic descriptor for the monogram the user already
// wears: a colour PAIR (bg + ink), an optional GLYPH override, and an optional FRAME. Stored as a jsonb
// blob on `users.avatar_config`; `null` ⇒ today's DETERMINISTIC default monogram (byte-identical — the
// theme-token panelHi/accent look + the username initials). It rides BESIDE `avatarUrl` on every
// avatar-bearing payload (it's cosmetic, no private data), and the ONE client Monogram component
// consumes it, so every surface renders the config'd monogram automatically.
//
// This is NOT the full avatar DESIGNER — that stays the launch headline: the square-canvas flatten
// pipeline on the Styler/Canvas machinery, still stubbed at /me/avatar/draft → /me/avatar/publish
// (product-spec PROF-08 §10). The Forge is a tight, junk-free schema on purpose (no free-form image
// upload, no arbitrary strings).

/** A 6-digit hex colour (`#rrggbb`). Both bg + ink are validated to this — no shorthand, no named colours. */
export const AVATAR_HEX_RE = /^#[0-9a-fA-F]{6}$/;
const avatarHexSchema = z
  .string()
  .regex(AVATAR_HEX_RE, 'must be a 6-digit hex colour like #1a2b3c');

/**
 * The glyph OVERRIDE — 1–2 letters/digits the user types in place of the derived initials. ABSENT ⇒
 * derive from the username (today's default: the first 1–2 alphanumerics, uppercased). This is the
 * "letterform choice" bounded to a tight, screening-free set — an enum-like grammar (`[A-Za-z0-9]{1,2}`),
 * never free text, so MOD-07 screening isn't needed (there's nothing to hide in ≤2 alphanumerics).
 */
export const AVATAR_GLYPH_RE = /^[A-Za-z0-9]{1,2}$/;
const avatarGlyphSchema = z
  .string()
  .regex(AVATAR_GLYPH_RE, 'the glyph must be 1–2 letters or digits');

/** The small FRAME set — 3 treatments + none. Renderable with border styles alone (no flatten pipeline). */
export const AVATAR_FRAMES = ['none', 'ring', 'inset', 'double'] as const;
export const avatarFrameSchema = z.enum(AVATAR_FRAMES);
export type AvatarFrame = (typeof AVATAR_FRAMES)[number];

/**
 * The avatarConfig blob. `.strict()` rejects unknown keys (no junk). `glyph`/`frame` are OPTIONAL —
 * absent ⇒ the derived initials / no frame. The whole object is nullable at the field/column level
 * (null ⇒ the default monogram); this schema shapes the NON-null value.
 */
export const avatarConfigSchema = z
  .object({
    bg: avatarHexSchema,
    ink: avatarHexSchema,
    glyph: avatarGlyphSchema.optional(),
    frame: avatarFrameSchema.optional(),
  })
  .strict();
export type AvatarConfig = z.infer<typeof avatarConfigSchema>;
