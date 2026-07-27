#!/usr/bin/env bash
# check-deps.sh — wraps npm audit + npm outdated; exits non-zero on high/critical advisories.
#
# Exit codes:
#   0  — clean (no high/critical advisories)
#   1  — high or critical advisories found
#   2+ — misconfiguration or infrastructure error (lockfile missing, network, etc.)
#
# Usage: bash server/scripts/check-deps.sh (run from repo root or server/ dir)
# Make executable: chmod +x server/scripts/check-deps.sh
#
# References: server/SECURITY.md § Dependency Hygiene

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$SERVER_DIR"

# ── Preflight: lockfile must exist ────────────────────────────────────────────
if [ ! -f package-lock.json ]; then
  echo "AUDIT_STEP_MISCONFIGURED: package-lock.json not found in $SERVER_DIR" >&2
  exit 1
fi

# ── npm audit ─────────────────────────────────────────────────────────────────
echo "=== npm audit (high/critical) ==="

set +e
npm audit --audit-level=high 2>/tmp/check_deps_audit_stderr.txt
AUDIT_EXIT=$?
set -e

# npm audit exit codes:
#   0  — no vulnerabilities at/above audit-level
#   1  — vulnerabilities found at/above audit-level
#   2  — misconfiguration / network error / registry unavailable
if [ "$AUDIT_EXIT" -eq 2 ]; then
  echo "AUDIT_STEP_MISCONFIGURED: npm audit exited with code 2 (network or registry error)" >&2
  cat /tmp/check_deps_audit_stderr.txt >&2
  exit 2
fi

# ── npm outdated ──────────────────────────────────────────────────────────────
echo ""
echo "=== npm outdated (summary) ==="
# npm outdated exits non-zero when packages are behind — treat as informational only
npm outdated || true

# ── Final verdict ─────────────────────────────────────────────────────────────
echo ""
if [ "$AUDIT_EXIT" -ne 0 ]; then
  echo "✗ High or critical vulnerabilities found. Fix before merging." >&2
  exit 1
fi

echo "✓ No high or critical advisories."
exit 0
