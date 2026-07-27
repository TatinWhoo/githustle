/**
 * Regression guard: no SQL injection via template literals or string concatenation
 * in repository files.
 *
 * Validates: Requirements 8.5
 *
 * WHAT IS FLAGGED
 * ───────────────
 * Template literals passed directly to pool.query / db.query where the
 * interpolated expression looks like user-supplied input:
 *   - identifiers that could carry request data: userId, email, id, name,
 *     token, hash, content, body, note, reason, title, description, search,
 *     filter, param, value, req, data, input, args
 *   - property accesses on those: filters.search, data.email, req.body.x
 *
 * WHAT IS ALLOWED (intentional dynamic SQL — not injection-prone)
 * ───────────────
 * Template literals used to BUILD the query string from controlled server-side
 * values that never come directly from request input:
 *   ${col}           — column name from a hardcoded fieldMap
 *   ${i}             — incrementing integer placeholder index
 *   $${i}            — PostgreSQL $N placeholder construction
 *   ${conditions}    — array of safe placeholder strings like `x = $1`
 *   ${setClauses}    — same
 *   ${whereClause}   — assembled from safe condition strings
 *   ${where}         — same
 *   ${orderBy}       — hardcoded string (e.g. 'rank DESC, created_at DESC')
 *   ${rankSelect}    — hardcoded column alias string
 *   ${roleColumn}    — derived from a controlled enum ('client'|'freelancer')
 *   ${extraSet}      — hardcoded SET fragment like ', sent_at = NOW()'
 *   ${setClause}     — assembled from safe clauses
 *   ${conditions.join(' AND ')}  — same as ${conditions}
 *   ${setClauses.join(', ')}     — same
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

// ─── paths ───────────────────────────────────────────────────────────────────

// Support both CJS (__dirname) and ESM (import.meta.url)
const _dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = resolve(_dirname, '../modules');

/** Recursively collect all repository.js files under modules/ */
function collectRepositoryFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectRepositoryFiles(full));
    } else if (entry.endsWith('repository.js')) {
      results.push(full);
    }
  }
  return results;
}

// ─── patterns ────────────────────────────────────────────────────────────────

/**
 * Dangerous user-input identifier roots.
 * These are names that plausibly carry data originating from req.body / req.params /
 * req.query or function arguments named after domain entities.
 */
const DANGEROUS_ROOTS = [
  'userId', 'email', 'role', 'status', 'password', 'token', 'hash',
  'content', 'body', 'note', 'reason', 'title', 'description',
  'search', 'filter', 'param', 'value', 'input', 'args',
  'req', 'data', 'name', 'ip', 'url', 'text', 'msg',
].join('|');

/**
 * Safe server-side SQL-builder identifiers — these are allowed inside template literals.
 * They are either integer indexes, hardcoded column names from fieldMaps, or assembled
 * arrays/strings of safe placeholder expressions.
 */
const SAFE_INTERPOLATION_PATTERN =
  /\$\{(?:\s*)(?:col|column|i|idx|j|k|conditions(?:\.join\(.*?\))?|setClauses(?:\.join\(.*?\))?|setClause|whereClause|where|orderBy|rankSelect|roleColumn|extraSet|extraClauses(?:\.join\(.*?\))?|limitPlusOne|offset|\$\$\{i\}|\$\$\{j\})\s*\}/g;

/**
 * Pattern 1 — Template literal with dangerous interpolation inside a .query( call.
 *
 * Matches: query(`... ${userId} ...`, ...) or similar.
 * We look for: backtick strings containing ${<dangerous identifier>...}
 *
 * Strategy: capture each ${...} block and check if its expression starts with
 * a dangerous root (or is a property access on one).
 */
const TEMPLATE_INTERPOLATION_RE = /\$\{([^}]+)\}/g;

/**
 * Pattern 2 — String concatenation SQL.
 *
 * Matches constructs like: "SELECT * FROM x WHERE id = " + someVar
 * or: 'UPDATE ... SET col = ' + value
 *
 * We look for a SQL keyword–bearing string literal followed by + <identifier/expression>.
 */
const STRING_CONCAT_SQL_RE =
  /(?:'[^']*(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|SET|INTO|JOIN)[^']*'|"[^"]*(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|SET|INTO|JOIN)[^"]*")\s*\+\s*\w/gi;

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the interpolated expression starts with a known dangerous
 * identifier root and is NOT purely a safe construction variable.
 */
function isDangerousInterpolation(expr) {
  const trimmed = expr.trim();

  // Allow: pure integer placeholder construction like `$${i}`, `$${j}`
  if (/^\$\$\{[a-z]\}$/.test(trimmed)) return false;

  // Allow known safe builder variables (exact or property access)
  const SAFE_VARS = new Set([
    'col', 'column', 'i', 'idx', 'j', 'k',
    'conditions', 'setClauses', 'setClause',
    'whereClause', 'where',
    'orderBy', 'rankSelect', 'roleColumn',
    'extraSet', 'extraClauses',
    'limitPlusOne', 'offset',
  ]);

  // Check if expression is `safeVar` or `safeVar.join(...)` or `safeVar.length` etc.
  const rootMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
  if (rootMatch && SAFE_VARS.has(rootMatch[1])) return false;

  // Flag if expression root matches a dangerous identifier
  // Use \\b (double-escaped) so RegExp constructor sees \b (word boundary)
  const dangerPattern = new RegExp(`^(?:${DANGEROUS_ROOTS})(?:\\b|[.[])`, 'i');
  if (dangerPattern.test(trimmed)) return true;

  return false;
}

/**
 * Scan a file's source for violations.
 * Returns array of { line, column, snippet } for each finding.
 */
function findViolations(source, filePath) {
  const violations = [];
  const lines = source.split('\n');

  lines.forEach((line, lineIdx) => {
    const lineNo = lineIdx + 1;

    // ── Check 1: template literal interpolation ──────────────────────────────
    // We only care about lines that are inside (or start) a .query( call.
    // Simple heuristic: the line or a nearby preceding line contains `.query(`
    // We scan ALL template interpolations on every line but only flag dangerous ones.
    let match;
    TEMPLATE_INTERPOLATION_RE.lastIndex = 0;
    while ((match = TEMPLATE_INTERPOLATION_RE.exec(line)) !== null) {
      if (isDangerousInterpolation(match[1])) {
        violations.push({
          line: lineNo,
          column: match.index + 1,
          snippet: line.trim().slice(0, 120),
          type: 'template-literal',
          expression: match[1].trim(),
        });
      }
    }

    // ── Check 2: SQL string concatenation ────────────────────────────────────
    STRING_CONCAT_SQL_RE.lastIndex = 0;
    if (STRING_CONCAT_SQL_RE.test(line)) {
      violations.push({
        line: lineNo,
        column: 1,
        snippet: line.trim().slice(0, 120),
        type: 'string-concat',
        expression: line.trim(),
      });
    }
  });

  return violations;
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('SQL injection regression guard', () => {
  const repoFiles = collectRepositoryFiles(REPO_ROOT);

  it('should find at least one repository file to audit', () => {
    expect(repoFiles.length).toBeGreaterThan(0);
  });

  it('repository file list matches expected modules', () => {
    const names = repoFiles.map((f) => f.replace(/\\/g, '/').split('/modules/')[1]);
    const expected = [
      'admin/admin.repository.js',
      'ai/ai.repository.js',
      'auth/auth.repository.js',
      'disputes/disputes.repository.js',
      'invoices/invoices.repository.js',
      'jobs/jobs.repository.js',
      'messages/messages.repository.js',
      'notifications/notifications.repository.js',
      'profiles/profiles.repository.js',
      'projects/projects.repository.js',
    ];
    for (const exp of expected) {
      expect(names).toContain(exp);
    }
  });

  describe('no dangerous SQL interpolation or string concatenation', () => {
    // Dynamically generate one test per repository file so failures are easy to locate
    for (const filePath of collectRepositoryFiles(REPO_ROOT)) {
      const relativePath = filePath
        .replace(/\\/g, '/')
        .split('/modules/')[1] ?? filePath;

      it(`${relativePath} — no user-input interpolated into SQL`, () => {
        const source = readFileSync(filePath, 'utf8');
        const violations = findViolations(source, filePath);

        if (violations.length > 0) {
          const report = violations
            .map(
              (v) =>
                `  Line ${v.line}: [${v.type}] expression "\${${v.expression}}" in:\n    ${v.snippet}`
            )
            .join('\n');
          throw new Error(
            `SQL injection risk found in ${relativePath}:\n${report}\n\n` +
              `Fix: move user-supplied values into the params array and use $N placeholders.`
          );
        }

        expect(violations).toHaveLength(0);
      });
    }
  });
});
