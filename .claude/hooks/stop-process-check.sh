#!/bin/bash
# Stop hook — fires when Claude attempts to stop
# Checks if mandatory skills were applied and injects reminder if not

# Prevent infinite loop
if [ "$CLAUDE_STOP_HOOK_ACTIVE" = "1" ]; then
  exit 0
fi

INPUT=$(cat)

# Check what files were modified in recent git activity
MODIFIED_PLANS=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep "docs/superpowers/plans/.*\.md" || true)
MODIFIED_BOARDS=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep "docs/goals/.*/state\.yaml" || true)
MODIFIED_CODE=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep -E "\.(ts|tsx)$" | grep -v "\.d\.ts" || true)

NEW_PLANS=$(git -C "$CLAUDE_PROJECT_DIR" ls-files --others --exclude-standard 2>/dev/null | grep "docs/superpowers/plans/.*\.md" || true)
NEW_BOARDS=$(git -C "$CLAUDE_PROJECT_DIR" ls-files --others --exclude-standard 2>/dev/null | grep "docs/goals/.*/state\.yaml" || true)

ALL_PLANS="${MODIFIED_PLANS}${NEW_PLANS}"
ALL_BOARDS="${MODIFIED_BOARDS}${NEW_BOARDS}"

if [ -z "$ALL_PLANS" ] && [ -z "$ALL_BOARDS" ] && [ -z "$MODIFIED_CODE" ]; then
  exit 0
fi

# Build reminders as separate lines to avoid quoting issues
CONTEXT="PROCESS CHECKLIST — verify before this session ends:"

if [ -n "$ALL_PLANS" ]; then
  PLAN_LIST=$(echo "$ALL_PLANS" | tr '\n' ' ')
  CONTEXT="$CONTEXT\nPLAN DOCUMENTS MODIFIED: $PLAN_LIST\n  [ ] feature-inventory-check run?\n  [ ] plan-review Pass 1 done?\n  [ ] plan-review Pass 2 done?"
fi

if [ -n "$ALL_BOARDS" ]; then
  BOARD_LIST=$(echo "$ALL_BOARDS" | tr '\n' ' ')
  CONTEXT="$CONTEXT\nGOALBUDDY BOARDS MODIFIED: $BOARD_LIST\n  [ ] All task receipts present?\n  [ ] No duplicate active tasks?"
fi

if [ -n "$MODIFIED_CODE" ]; then
  CODE_LIST=$(echo "$MODIFIED_CODE" | head -5 | tr '\n' ' ')
  CONTEXT="$CONTEXT\nCODE MODIFIED: $CODE_LIST\n  [ ] npx tsc --noEmit exits 0?\n  [ ] npm run build succeeds?\n  [ ] npm test passes?"
fi

# Write context to a temp file so Python can read it safely (no quoting issues)
TMPFILE=$(mktemp)
printf '%s' "$CONTEXT" > "$TMPFILE"

python3 - "$TMPFILE" <<'PYEOF'
import json, sys

with open(sys.argv[1]) as f:
    context = f.read()

print(json.dumps({
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": context
  }
}))
PYEOF

rm -f "$TMPFILE"
exit 0
