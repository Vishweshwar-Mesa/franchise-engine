#!/bin/sh
# Warns when files other than CLAUDE.md change without CLAUDE.md changing.
# Pre-commit: checks staged files. CI: pass a git range, e.g. scripts/check-context.sh origin/main...HEAD
if [ -n "$1" ]; then
  CHANGED=$(git diff --name-only "$1")
else
  CHANGED=$(git diff --cached --name-only)
fi
[ -z "$CHANGED" ] && exit 0
OTHERS=$(echo "$CHANGED" | grep -v '^CLAUDE.md$')
if [ -n "$OTHERS" ] && ! echo "$CHANGED" | grep -q '^CLAUDE.md$'; then
  echo "WARNING: files changed but CLAUDE.md did not."
  echo "Add a dated Change Log entry to CLAUDE.md (see its first paragraph)."
  [ -n "$STRICT_CONTEXT_CHECK" ] && exit 1
fi
exit 0
