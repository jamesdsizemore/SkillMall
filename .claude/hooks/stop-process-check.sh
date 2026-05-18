#!/bin/bash
# Stop hook — fires when Claude attempts to stop
# Checks if mandatory skills were applied and injects reminder if not
# Prevents stopping silently after plan work without review

# Prevent infinite loop
if [ "$CLAUDE_STOP_HOOK_ACTIVE" = "1" ]; then
  exit 0
fi

INPUT=$(cat)

# Check what files were modified in recent git activity
MODIFIED_PLANS=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep "docs/superpowers/plans/.*\.md" || true)
MODIFIED_BOARDS=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep "docs/goals/.*/state\.yaml" || true)
MODIFIED_CODE=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep -E "\.(ts|tsx)$" | grep -v "\.d\.ts" || true)

# Also check untracked new files
NEW_PLANS=$(git -C "$CLAUDE_PROJECT_DIR" ls-files --others --exclude-standard 2>/dev/null | grep "docs/superpowers/plans/.*\.md" || true)
NEW_BOARDS=$(git -C "$CLAUDE_PROJECT_DIR" ls-files --others --exclude-standard 2>/dev/null | grep "docs/goals/.*/state\.yaml" || true)

ALL_PLANS="${MODIFIED_PLANS}${NEW_PLANS}"
ALL_BOARDS="${MODIFIED_BOARDS}${NEW_BOARDS}"

# Only inject if relevant work happened
if [ -z "$ALL_PLANS" ] && [ -z "$ALL_BOARDS" ] && [ -z "$MODIFIED_CODE" ]; then
  exit 0
fi

REMINDERS=""

if [ -n "$ALL_PLANS" ]; then
  PLAN_LIST=$(echo "$ALL_PLANS" | tr '\n' ', ' | sed 's/,$//')
  REMINDERS="${REMINDERS}
PLAN DOCUMENTS MODIFIED: $PLAN_LIST
  [ ] feature-inventory-check run?
  [ ] plan-review Pass 1 (self-containment) done?
  [ ] plan-review Pass 2 (drift/conflicts) done?
  [ ] plan-review Pass 1 again after fixes?
"
fi

if [ -n "$ALL_BOARDS" ]; then
  BOARD_LIST=$(echo "$ALL_BOARDS" | tr '\n' ', ' | sed 's/,$//')
  REMINDERS="${REMINDERS}
GOALBUDDY BOARDS MODIFIED: $BOARD_LIST
  [ ] GoalBuddy checker run (node ~/.claude/skills/goalbuddy/scripts/check-goal-state.mjs)?
  [ ] All task receipts present for done tasks?
  [ ] No duplicate status fields (active/queued conflict)?
"
fi

if [ -n "$MODIFIED_CODE" ]; then
  CODE_LIST=$(echo "$MODIFIED_CODE" | head -5 | tr '\n' ', ' | sed 's/,$//')
  REMINDERS="${REMINDERS}
CODE MODIFIED: $CODE_LIST...
  [ ] npx tsc --noEmit exits 0?
  [ ] npm run lint exits 0?
  [ ] npm run build succeeds?
  [ ] npm test passes?
  [ ] Code review (step 9) done?
  [ ] Second code review (step 11) done?
"
fi

if [ -n "$REMINDERS" ]; then
  OUTPUT=$(python3 -c "
import json, sys

reminders = '''$REMINDERS'''

print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'Stop',
    'additionalContext': f'PROCESS CHECKLIST — verify before this session ends:\\n{reminders}'
  }
}))
")
  echo "$OUTPUT"
fi

exit 0
