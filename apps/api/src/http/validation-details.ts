import type { ZodError, ZodIssue } from 'zod';
import type { ValidationDetail } from '@ingame/shared';

// B1 (api-contract 0.32/0.46) — build the field-targeted `VALIDATION_ERROR` details from a ZodError.
// SYS-02 sanitization is structural: every message is authored HERE from the issue's METADATA
// (minimum/maximum/expected/options — all ours), never from `issue.message` defaults that can echo
// the received value (zod's invalid_enum/invalid_literal defaults do). `custom` issues are the one
// pass-through: their messages are authored in OUR shared schemas, not derived from input.

/** Paths render in the client under their form fields — keep them boring; anything odd is dropped. */
const SAFE_PATH_RE = /^[\w.[\]]{1,64}$/;
/** Bound the payload — a pathological body must not mint an unbounded details array. */
const MAX_DETAILS = 20;

function messageOf(issue: ZodIssue): string {
  switch (issue.code) {
    case 'too_small':
      return issue.type === 'string'
        ? `Must be at least ${issue.minimum} character${issue.minimum === 1 ? '' : 's'}.`
        : `Too small (minimum ${issue.minimum}).`;
    case 'too_big':
      return issue.type === 'string'
        ? `Must be at most ${issue.maximum} characters.`
        : `Too large (maximum ${issue.maximum}).`;
    case 'invalid_string':
      if (issue.validation === 'email') return 'Must be a valid email address.';
      if (issue.validation === 'uuid') return 'Must be a valid id.';
      if (issue.validation === 'url') return 'Must be a valid URL.';
      return 'Contains invalid characters.';
    case 'invalid_type':
      return issue.received === 'undefined' ? 'Required.' : 'Invalid type.';
    case 'invalid_enum_value':
      // The options are OUR schema's — safe to enumerate; the received value is NOT repeated.
      return `Must be one of: ${issue.options.join(', ')}.`;
    case 'custom':
      return issue.message; // authored in our shared schemas — ours, never an input echo
    default:
      return 'Invalid value.';
  }
}

function safePath(path: string): string {
  return SAFE_PATH_RE.test(path) ? path : '';
}

export function sanitizedValidationDetails(err: ZodError): ValidationDetail[] {
  const out: ValidationDetail[] = [];
  for (const issue of err.issues) {
    if (out.length >= MAX_DETAILS) break;
    if (issue.code === 'unrecognized_keys') {
      // The unknown KEY is attacker-controlled — only reflect it when it is a boring identifier.
      for (const key of issue.keys) {
        if (out.length >= MAX_DETAILS) break;
        out.push({ path: safePath(key), message: 'Unknown field.' });
      }
      continue;
    }
    out.push({ path: safePath(issue.path.join('.')), message: messageOf(issue) });
  }
  return out;
}
