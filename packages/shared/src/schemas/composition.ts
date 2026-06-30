import { z } from 'zod';

// F21 — the card composition carries a schemaVersion from the first persisted draft + a version-aware
// hash; asset/effect IDs are append-only. OUT of M1: the full composition schema DESIGN and the skia
// flatten/render pipeline (deferred to M4 / G-H). Only the version discriminator + the version-aware
// hash are must-now — you cannot retro-stamp v1 onto an un-versioned corpus of immutable user blobs.

export const COMPOSITION_SCHEMA_VERSION = 1 as const;

export const compositionSchema = z
  .object({
    // flatten dispatches on this + REJECTS unknown versions (decision 0051/F21).
    schemaVersion: z.literal(COMPOSITION_SCHEMA_VERSION),
    // The element schema itself is deferred to M4; the array exists so the hash has content to bind.
    elements: z.array(z.unknown()).default([]),
  })
  .passthrough();

export type Composition = z.infer<typeof compositionSchema>;

/** Stable, sorted-key canonical JSON — the input to the version-aware hash. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

/**
 * A deterministic, dependency-free (RN-safe) version-aware hash. FNV-1a over the canonical form,
 * prefixed with the schemaVersion so CARD-19 dedup can never collide across schema versions. A
 * cryptographic content-hash can replace this when the real composition schema lands at M4 — the
 * contract here is only: deterministic, content-sensitive, and version-aware.
 */
export function compositionHash(composition: Composition): string {
  const canonical = canonicalize(composition);
  const FNV_PRIME = 0x100000001b3n;
  const MASK = 0xffffffffffffffffn;
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < canonical.length; i++) {
    const code = canonical.charCodeAt(i);
    h = ((h ^ BigInt(code & 0xff)) * FNV_PRIME) & MASK;
    const hi = code >> 8;
    if (hi) h = ((h ^ BigInt(hi)) * FNV_PRIME) & MASK;
  }
  return `v${composition.schemaVersion}-${h.toString(16).padStart(16, '0')}`;
}
