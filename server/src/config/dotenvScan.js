'use strict';

/**
 * Scans dotenv file text for duplicate variable assignments.
 * Ignores blank lines and comment lines (starting with #).
 * On any duplicate found: writes to stderr and exits with code 1.
 * @param {string} text - raw .env file content
 * @returns {Set<string>} empty set (no duplicates) — exits before returning if duplicates found
 */
function scanDotenv(text) {
  const counts = new Map();
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  }
  const duplicates = new Set(
    [...counts.entries()].filter(([, v]) => v >= 2).map(([k]) => k)
  );
  if (duplicates.size > 0) {
    process.stderr.write(
      `[dotenvScan] Duplicate variable assignments detected: ${[...duplicates].join(', ')}\n`
    );
    process.exit(1);
  }
  return duplicates;
}

module.exports = { scanDotenv };
