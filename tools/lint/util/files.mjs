import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Shared file-collection + role helpers for the custom CONVENTIONS lints (tools/lint). These run as
// plain Node (like scripts/health-check.mjs) so they are dependency-free and testable against the
// fixtures/bad-pr-corpus. Role is inferred from the path SUFFIX (not an absolute `/src/` prefix) so a
// rule applies identically to real source AND to a corpus fixture.

const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  '.expo',
  '.git',
  'coverage',
  'drizzle',
  'meta',
]);

/** @typedef {{ path: string, abs: string, text: string }} SourceFile */

/**
 * Recursively collect source files under `roots`.
 * @param {string[]} roots
 * @param {{ exts?: string[], cwd?: string }} [opts]
 * @returns {SourceFile[]}
 */
export function collectFiles(roots, opts = {}) {
  const exts = opts.exts ?? ['.ts', '.tsx', '.mjs', '.js'];
  const cwd = opts.cwd ?? process.cwd();
  /** @type {SourceFile[]} */
  const out = [];

  const visit = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        visit(full);
      } else if (exts.some((x) => entry.name.endsWith(x))) {
        out.push({
          path: relative(cwd, full).split(sep).join('/'),
          abs: full,
          text: readFileSync(full, 'utf8'),
        });
      }
    }
  };

  for (const root of roots) {
    try {
      if (statSync(root).isDirectory()) visit(root);
    } catch {
      /* missing root — skip */
    }
  }
  return out;
}

export function isTestFile(path) {
  return /\.test\.[mc]?[jt]sx?$/.test(path) || /(^|\/)test\//.test(path);
}

export function isRepositoryLayer(path) {
  return /(^|\/)repositories\//.test(path) || /(^|\/)db\//.test(path) || /-repo\.[mc]?ts$/.test(path);
}

export function isControllerOrRoute(path) {
  return /(^|\/)(controllers|routes)\//.test(path);
}

/** camelCase identifier → snake_case (drizzle var → SQL table name heuristic). */
export function toSnake(identifier) {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/** Find the balanced `{...}` (or `(...)`) substring starting at the opener index `from`. */
export function matchBalanced(text, from, open = '{', close = '}') {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  return text.slice(from);
}

/** 1-based line number of a character offset. */
export function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

/** Strip block + line comments while PRESERVING newlines (so line numbers stay stable). Keeps `http://`. */
export function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
