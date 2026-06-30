import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATCH_ME_FIELDS } from '@ingame/shared';

// CONVENTIONS rule 3 — the api-contract FIDELITY snapshot (decision 0045/0051 promised; distinct from
// the presence-lint). The shared PATCH /me REQUEST schema must transcribe the api-contract body
// field-for-field, never a paraphrase. If the contract row changes, this test fails until the shared
// schema is reconciled (the seam moving is a same-PR api-contract edit, CONVENTIONS rule 7).

describe('rule-3 fidelity: shared PATCH /me schema == api-contract body', () => {
  it('the shared request fields equal the api-contract PATCH /me body fields', () => {
    const contract = readFileSync(join(process.cwd(), 'docs', 'spec', 'api-contract.md'), 'utf8');
    const row = contract
      .split('\n')
      .find((line) => /\|\s*PATCH\s*\|\s*`\/me`/.test(line));
    expect(row, 'PATCH /me row not found in api-contract.md').toBeTruthy();

    const body = /\{([^}]*)\}/.exec(row ?? '');
    expect(body, 'PATCH /me body shape `{ … }` not found on the row').toBeTruthy();

    const contractFields = [...(body?.[1] ?? '').matchAll(/([a-zA-Z][\w]*)\?/g)].map((m) => m[1]);
    const norm = (arr) => [...new Set(arr)].sort();

    expect(norm(contractFields)).toEqual(norm([...PATCH_ME_FIELDS]));
  });
});
