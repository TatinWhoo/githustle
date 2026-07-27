#!/usr/bin/env node
// check-sql-injection.js
// Scans all *.repository.js files under server/src/modules/ for SQL injection
// risk patterns. Exit 0 = clean. Exit 1 = real violations found.
//
// A violation is when a user-derived value (req.body/query/params, or a raw
// variable whose name suggests external input) is interpolated directly into a
// SQL string rather than being passed as a parameterized bind.
//
// SAFE patterns NOT flagged:
//   - `WHERE ${conditions.join(' AND ')}`  — conditions array contains only '$N'
//     placeholder strings; user values go in the params array.
//   - `SET ${setClauses.join(', ')}`        — same pattern (whitelist-built column assignments)
//   - `SET status = $2${extraSet}`          — extraSet is a hardcoded string literal
//   - `SET ${setClause}`                    — setClause built from hardcoded column names
//   - `values.push(\`%${x}%\`)`            — LIKE wrapper added to params array, not SQL
//   - `count + 1`, `reminder_count + 1`    — arithmetic, not string concat in JS
//   - `$${i}` patterns                     — dynamic PostgreSQL placeholder numbering

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT      = path.resolve(__dirname, '..', 'src', 'modules');
const FILE_GLOB = /\.repository\.js$/;

// SQL keywords that must appear for a line to be a candidate
const SQL_KW = /\b(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|JOIN|SET|INTO|VALUES)\b/i;

// ── Pattern definitions ───────────────────────────────────────────────────────
//
// We look for template literals where the interpolated expression looks like
// a user-supplied value, not a safe internal variable.
//
// "User-derived" heuristic: the interpolated expression matches one of:
//   req.body.x, req.query.x, req.params.x, body.x, query.x, params.x,
//   data.x (when data comes from the function parameter representing request body)
//
// We do NOT flag:
//   conditions.join(...)    — pre-built $N placeholder arrays
//   setClauses.join(...)    — same
//   extraSet                — hardcoded SET fragment
//   setClause               — same
//   $${i}                   — dynamic parameter index
//   variables that hold the entire SQL string (sql, sqlText, queryText)

// Regex: template literal interpolation of user-derived names
// Matches `${req.body.x}`, `${req.query.x}`, `${req.params.x}`,
//          `${body.x}`,     `${query.x}`,     `${params.x}`,
// but NOT `${conditions.join}`, `${setClauses.join}`, `${i}`, `${extraSet}`, etc.
const USER_INPUT_INTERP = /\$\{(req\.(body|query|params)|body\.|query\.|params\.)/;

// String concatenation where the right or left operand is a user-derived name
// Pattern: `"SQL..." + userId` or `userId + "SQL..."`
// We require that a SQL keyword is on the same line (already checked by the
// outer SQL_KW guard) AND that a `+` operator connects a string literal to
// what looks like a user-derived identifier adjacent to the SQL.
const USER_CONCAT = /"[^"]*\b(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|JOIN|SET|INTO|VALUES)\b[^"]*"\s*\+\s*(?!['"])|\+\s*(?:req\.|body\.|query\.|params\.)/i;

// ── Helpers ───────────────────────────────────────────────────────────────────

function collectFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectFiles(full));
        } else if (entry.isFile() && FILE_GLOB.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

function auditFile(filePath) {
    const violations = [];
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');

    for (let idx = 0; idx < lines.length; idx++) {
        const raw    = lines[idx];
        const text   = raw.trim();
        const lineNo = idx + 1;

        // Skip blanks, comments
        if (!text || text.startsWith('//') || text.startsWith('*')) continue;

        const hasSqlKw = SQL_KW.test(text);

        // Pattern 1 — template literal with user-derived interpolation in SQL context
        if (text.includes('`') && USER_INPUT_INTERP.test(text)) {
            violations.push({
                file:   path.relative(process.cwd(), filePath),
                line:   lineNo,
                text:   raw.trimEnd(),
                reason: 'User-derived value interpolated directly into SQL string',
            });
            continue; // don't double-report the same line
        }

        // Pattern 2 — string concatenation of user input with SQL
        if (hasSqlKw && USER_CONCAT.test(text)) {
            violations.push({
                file:   path.relative(process.cwd(), filePath),
                line:   lineNo,
                text:   raw.trimEnd(),
                reason: 'User-derived value concatenated into SQL string',
            });
        }
    }

    return violations;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
    if (!fs.existsSync(ROOT)) {
        console.error(`[check-sql-injection] modules directory not found: ${ROOT}`);
        process.exit(1);
    }

    const files         = collectFiles(ROOT);
    const allViolations = [];

    for (const f of files) {
        allViolations.push(...auditFile(f));
    }

    if (allViolations.length === 0) {
        console.log(`[check-sql-injection] ✓ ${files.length} file(s) checked — no violations found.`);
        process.exit(0);
    }

    console.error(`[check-sql-injection] ✗ ${allViolations.length} violation(s) found:\n`);
    for (const v of allViolations) {
        console.error(`  ${v.file}:${v.line}  (${v.reason})`);
        console.error(`    ${v.text}`);
        console.error('');
    }
    process.exit(1);
}

main();
