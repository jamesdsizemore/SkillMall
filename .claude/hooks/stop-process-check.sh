#!/bin/bash
# Stop hook — fires when Claude attempts to stop
# Injects a reminder checklist into the session when relevant work was done

if [ "$CLAUDE_STOP_HOOK_ACTIVE" = "1" ]; then
  exit 0
fi

INPUT=$(cat)

MODIFIED_PLANS=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep "docs/superpowers/plans/.*\.md" || true)
MODIFIED_BOARDS=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep "docs/goals/.*/state\.yaml" || true)
MODIFIED_CODE=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep -E "\.(ts|tsx)$" | grep -v "\.d\.ts" || true)
NEW_PLANS=$(git -C "$CLAUDE_PROJECT_DIR" ls-files --others --exclude-standard 2>/dev/null | grep "docs/superpowers/plans/.*\.md" || true)
NEW_BOARDS=$(git -C "$CLAUDE_PROJECT_DIR" ls-files --others --exclude-standard 2>/dev/null | grep "docs/goals/.*/state\.yaml" || true)

ALL_PLANS="${MODIFIED_PLANS}${NEW_PLANS}"
ALL_BOARDS="${MODIFIED_BOARDS}${NEW_BOARDS}"

if [ -z "$ALL_PLANS" ] && [ -z "$ALL_BOARDS" ] && [ -z "$MODIFIED_CODE" ]; then
  # Nothing relevant changed — approve silently
  printf '{"decision":"approve"}'
  exit 0
fi

MSG="PROCESS CHECKLIST"

if [ -n "$ALL_PLANS" ]; then
  MSG="$MSG\n- Plan docs modified: $(echo "$ALL_PLANS" | tr '\n' ' ')\n  [ ] feature-inventory-check done?\n  [ ] plan-review Pass 1 + Pass 2 done?"
fi
if [ -n "$ALL_BOARDS" ]; then
  MSG="$MSG\n- GoalBuddy boards modified: $(echo "$ALL_BOARDS" | tr '\n' ' ')\n  [ ] All receipts written?\n  [ ] board committed?"
fi
if [ -n "$MODIFIED_CODE" ]; then
  MSG="$MSG\n- Code modified: $(echo "$MODIFIED_CODE" | head -5 | tr '\n' ' ')\n  [ ] tsc + build + tests pass?\n  [ ] code review done?"
fi

TMPFILE=$(mktemp)
printf '%s' "$MSG" > "$TMPFILE"

python3 - "$TMPFILE" <<'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    msg = f.read()
# Stop hook schema: use decision + systemMessage (not hookSpecificOutput)
print(json.dumps({"decision": "approve", "systemMessage": msg}))
PYEOF

rm -f "$TMPFILE"
exit 0
