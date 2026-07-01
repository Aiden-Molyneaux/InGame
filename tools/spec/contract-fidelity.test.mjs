import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PATCH_ME_FIELDS,
  REGISTER_FIELDS,
  LOGIN_FIELDS,
  APPLE_FIELDS,
  REFRESH_FIELDS,
  LOGOUT_FIELDS,
  RESET_REQUEST_FIELDS,
  RESET_CONFIRM_FIELDS,
  VERIFY_CONFIRM_FIELDS,
} from '@ingame/shared';

// CONVENTIONS rule 3 — the api-contract FIDELITY snapshot (F09; decision 0045/0051, distinct from the
// presence-lint). Each shared REQUEST schema must transcribe its api-contract body field-for-field,
// never a paraphrase. If a contract row's body changes, the matching test fails until the shared schema
// is reconciled (the seam moving is a same-PR api-contract edit, CONVENTIONS rule 7).

const contract = readFileSync(join(process.cwd(), 'docs', 'spec', 'api-contract.md'), 'utf8');

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The field names in the FIRST `{ … }` body on the api-contract row for (method, path). */
function contractBodyFields(method, path) {
  const rowRe = new RegExp(`\\|\\s*${method}\\s*\\|\\s*\`${escapeRegex(path)}\``, 'i');
  const row = contract.split('\n').find((line) => rowRe.test(line));
  expect(row, `row not found for ${method} ${path}`).toBeTruthy();
  const body = /\{([^}]*)\}/.exec(row ?? '');
  expect(body, `body { … } not found for ${method} ${path}`).toBeTruthy();
  return (body?.[1] ?? '')
    .split(',')
    .map((f) => f.trim().replace(/\?$/, '').replace(/[\s:].*$/, ''))
    .filter(Boolean);
}

const norm = (arr) => [...new Set(arr)].sort();

describe('rule-3 fidelity: shared request schemas == api-contract bodies (F09)', () => {
  const cases = [
    ['PATCH', '/me', PATCH_ME_FIELDS],
    ['POST', '/auth/register', REGISTER_FIELDS],
    ['POST', '/auth/login', LOGIN_FIELDS],
    ['POST', '/auth/apple', APPLE_FIELDS],
    ['POST', '/auth/refresh', REFRESH_FIELDS],
    ['POST', '/auth/logout', LOGOUT_FIELDS],
    ['POST', '/auth/password-reset/request', RESET_REQUEST_FIELDS],
    ['POST', '/auth/password-reset/confirm', RESET_CONFIRM_FIELDS],
    ['POST', '/auth/verify-email/confirm', VERIFY_CONFIRM_FIELDS],
  ];

  for (const [method, path, fields] of cases) {
    it(`${method} ${path} body matches the shared schema`, () => {
      expect(norm(contractBodyFields(method, path))).toEqual(norm([...fields]));
    });
  }
});
