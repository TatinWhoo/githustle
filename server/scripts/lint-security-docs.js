#!/usr/bin/env node
// lint-security-docs.js
// Usage: node server/scripts/lint-security-docs.js [path/to/SECURITY.md]
// Exit 0 = pass, Exit 1 = fail

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REQUIRED_SECTIONS = [
  '## Threat Model',
  '## Authentication',
  '## Rate Limits',
  '## HTTP Headers',
  '## Secret Rotation',
  '## Incident Response',
  '## Reporting a Vulnerability',
  '## Clerk Migration Plan',
];

// Keywords that must appear somewhere inside the named section's content.
// Each entry is { section, keywords: string[] }
// For keywords with alternatives, supply an array-of-arrays: inner array = OR group.
const SECTION_KEYWORDS = [
  {
    section: '## Rate Limits',
    keywords: [
      ['300'],
      ['15 min', '15min'],
      ['10'],
      // per-email login: 5 requests per 15-min window
      // Accept inline form (5/15min) OR table form (separate "5" row + "15 min" column)
      // "5" and "15 min" are already checked individually above/below; this group
      // specifically validates the per-email limit value "5" is present.
      ['5/15min', '5 / 15 min', '5'],
      ['60 min'],
      // per-IP/email password-reset: 3 per 60-min window
      ['3/60min', '3 / 60 min', '3'],
      // per-IP refresh: 60 per 15-min window
      ['60/15min', '60 / 15 min', '60'],
      ['120'],
      ['RATE_LIMITED'],
    ],
  },
  {
    section: '## HTTP Headers',
    keywords: [
      ['X-Content-Type-Options'],
      ['nosniff'],
      ['X-Frame-Options'],
      ['DENY'],
      ['Referrer-Policy'],
      ['strict-origin-when-cross-origin'],
      ['Permissions-Policy'],
      ['Cross-Origin-Opener-Policy'],
      ['Cross-Origin-Resource-Policy'],
      ['Content-Security-Policy'],
    ],
  },
  {
    section: '## Secret Rotation',
    keywords: [
      ['JWT_ACCESS_SECRET'],
      ['DATABASE_URL'],
      ['REDIS_URL'],
      ['RESEND_API_KEY'],
      ['ANTHROPIC_API_KEY'],
      ['SENTRY_DSN'],
      ['git filter-repo', 'git-filter-repo'],
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return true if at least one alternative in the OR group exists in text. */
function anyMatch(text, alternatives) {
  return alternatives.some((alt) => text.includes(alt));
}

/** Describe the OR group for error messages. */
function describeGroup(alternatives) {
  return alternatives.join(' | ');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // Resolve path
  const argPath = process.argv[2];
  let filePath;
  if (argPath) {
    filePath = path.resolve(process.cwd(), argPath);
  } else {
    // Try to find SECURITY.md in a few likely locations:
    // 1. <cwd>/server/SECURITY.md  (running from repo root)
    // 2. <cwd>/SECURITY.md         (running from server/ dir)
    // 3. <script-dir>/../SECURITY.md (running from anywhere, script is at server/scripts/)
    const candidates = [
      path.resolve(process.cwd(), 'server', 'SECURITY.md'),
      path.resolve(process.cwd(), 'SECURITY.md'),
      path.resolve(__dirname, '..', 'SECURITY.md'),
    ];
    filePath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
  }

  // Read file
  if (!fs.existsSync(filePath)) {
    process.stderr.write(`FAIL: SECURITY.md not found at ${filePath}\n`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // ---------------------------------------------------------------------------
  // 1. Collect all ## headings and their positions
  // ---------------------------------------------------------------------------
  // A section heading is a line that starts exactly with "## " (two hashes + space)
  // or equals "## <title>" — we match lines where trimmed starts with "## ".

  const foundHeadings = []; // { title, lineIndex }
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimEnd();
    if (/^## /.test(trimmed)) {
      foundHeadings.push({ title: trimmed, lineIndex: i });
    }
  }

  let failed = false;

  function fail(section, reason) {
    process.stderr.write(`FAIL: ${section} - ${reason}\n`);
    failed = true;
  }

  // ---------------------------------------------------------------------------
  // 2. Each required section appears exactly once
  // ---------------------------------------------------------------------------
  for (const required of REQUIRED_SECTIONS) {
    const matches = foundHeadings.filter((h) => h.title === required);
    if (matches.length === 0) {
      fail(required, 'section heading not found');
    } else if (matches.length > 1) {
      fail(required, `section heading appears ${matches.length} times (expected 1)`);
    }
  }

  // If any heading is missing we can't check order or keywords reliably for those.
  // Continue anyway to surface all errors at once.

  // ---------------------------------------------------------------------------
  // 3. Sections appear in the specified order
  // ---------------------------------------------------------------------------
  // Find the line index of each required section (first occurrence).
  const sectionPositions = REQUIRED_SECTIONS.map((title) => {
    const match = foundHeadings.find((h) => h.title === title);
    return { title, lineIndex: match ? match.lineIndex : -1 };
  });

  for (let i = 1; i < sectionPositions.length; i++) {
    const prev = sectionPositions[i - 1];
    const curr = sectionPositions[i];
    if (prev.lineIndex === -1 || curr.lineIndex === -1) continue; // already flagged missing
    if (curr.lineIndex < prev.lineIndex) {
      fail(
        curr.title,
        `appears before "${prev.title}" (wrong order)`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Extract section body text
  // ---------------------------------------------------------------------------
  // Body = lines from (heading line + 1) up to (but not including) the next ## heading.

  function getSectionBody(sectionTitle) {
    const match = foundHeadings.find((h) => h.title === sectionTitle);
    if (!match) return '';

    const startLine = match.lineIndex + 1;
    // Find next ## heading after this one
    const nextHeading = foundHeadings.find(
      (h) => h.lineIndex > match.lineIndex && /^## /.test(h.title)
    );
    const endLine = nextHeading ? nextHeading.lineIndex : lines.length;

    return lines.slice(startLine, endLine).join('\n');
  }

  // ---------------------------------------------------------------------------
  // 5. Keyword checks
  // ---------------------------------------------------------------------------
  for (const { section, keywords } of SECTION_KEYWORDS) {
    // Skip if section wasn't found (already flagged)
    if (!foundHeadings.find((h) => h.title === section)) continue;

    const body = getSectionBody(section);

    for (const group of keywords) {
      if (!anyMatch(body, group)) {
        fail(section, `missing required keyword: ${describeGroup(group)}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Result
  // ---------------------------------------------------------------------------
  if (failed) {
    process.exit(1);
  }

  process.stdout.write('OK: SECURITY.md passes all checks\n');
  process.exit(0);
}

main();
