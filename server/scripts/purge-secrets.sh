#!/usr/bin/env bash
# purge-secrets.sh — Remove .env* files from entire git history.
#
# Prerequisites:
#   pip install git-filter-repo
#   OR download BFG Repo Cleaner: https://rtyley.github.io/bfg-repo-cleaner/
#
# WARNING: This rewrites git history. All collaborators must re-clone after.
# Run this once, then rotate every secret listed in SECURITY.md.
#
# Usage:
#   bash server/scripts/purge-secrets.sh [--dry-run]
#
# References: server/SECURITY.md § Secret Rotation

set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || { echo "ERROR: not inside a git repo"; exit 1; })"
cd "$REPO_ROOT"

echo "=== GitHustle Secret Purge Script ==="
echo "Repo root: $REPO_ROOT"
echo ""

# Patterns to purge from history
PATTERNS=(
  ".env"
  ".env.local"
  ".env.production"
  ".env.supabase"
  ".env.docker"
  ".env.test"
)

# ── Method 1: git-filter-repo (preferred) ─────────────────────────────────────
if command -v git-filter-repo &>/dev/null; then
  echo "Using git-filter-repo..."
  for pattern in "${PATTERNS[@]}"; do
    echo "  Purging: $pattern"
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  [DRY RUN] Would run: git filter-repo --path \"$pattern\" --invert-paths --force"
    else
      git filter-repo --path "$pattern" --invert-paths --force 2>/dev/null || true
    fi
  done

# ── Method 2: BFG Repo Cleaner (fallback) ────────────────────────────────────
elif command -v bfg &>/dev/null || ls bfg*.jar &>/dev/null 2>&1; then
  BFG_JAR=$(ls bfg*.jar 2>/dev/null | head -1 || echo "bfg")
  echo "Using BFG Repo Cleaner..."
  for pattern in "${PATTERNS[@]}"; do
    echo "  Purging: $pattern"
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  [DRY RUN] Would run: java -jar $BFG_JAR --delete-files \"$pattern\" ."
    else
      java -jar "$BFG_JAR" --delete-files "$pattern" . 2>/dev/null || true
    fi
  done
  echo ""
  echo "BFG done. Running git reflog expire and gc..."
  if [[ "$DRY_RUN" == "false" ]]; then
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
  fi

else
  echo "ERROR: Neither git-filter-repo nor bfg found."
  echo ""
  echo "Install git-filter-repo:"
  echo "  pip install git-filter-repo"
  echo ""
  echo "Or download BFG:"
  echo "  https://rtyley.github.io/bfg-repo-cleaner/"
  exit 1
fi

echo ""
echo "=== Purge complete ==="
echo ""
echo "NEXT STEPS (mandatory):"
echo "  1. Force-push all branches: git push --force --all"
echo "  2. Force-push all tags:     git push --force --tags"
echo "  3. All collaborators must: git clone <repo> (fresh clone)"
echo "  4. Rotate ALL secrets listed in server/SECURITY.md immediately."
echo ""
echo "See server/SECURITY.md for the full rotation procedure."
