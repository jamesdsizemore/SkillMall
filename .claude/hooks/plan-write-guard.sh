#!/bin/bash
# PostToolUse Write/Edit hook — fires after any file write
# Checks if a plan document, board, or spec was written
# Injects mandatory skill reminders and auto-validates GoalBuddy boards

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
path = d.get('tool_input', {}).get('file_path', '')
print(path)
" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

GOALBUDDY_SKILL="/Users/jamesdsizemore/.claude/skills/goalbuddy"
PROJECT_DIR="/Users/jamesdsizemore/Developer/skill-mall"

# ── Plan document written ─────────────────────────────────────────────────
if echo "$FILE_PATH" | grep -q "docs/superpowers/plans/.*\.md"; then
  PLAN_NAME=$(basename "$FILE_PATH")

  OUTPUT=$(python3 -c "
import json
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'PostToolUse',
    'additionalContext': f'''
PLAN DOCUMENT WRITTEN: {FILE_PATH}

MANDATORY PRE-COMMIT CHECKLIST — do not commit until all pass:

[ ] feature-inventory-check: Read the entire spec, list every user-facing feature,
    verify every feature assigned to this phase is a Worker task card in this plan.
    A prose mention is NOT a task card.

[ ] plan-review PASS 1 (self-containment):
    - Zero phrases like \"see [other document]\" or \"Full implementation is in\"
    - All architectural decisions named explicitly
    - All verify conditions are specific commands with expected outcomes
    - All stop_if conditions cover obvious failure modes
    - All allowed_files are complete

[ ] plan-review PASS 2 (drift and conflicts):
    - All files modified by multiple tasks have explicit sequential ordering
    - Board and plan are consistent — every task card has matching plan specs
    - Merged/cancelled tasks are marked blocked on the board with receipts

[ ] plan-review PASS 1 AGAIN after fixes

Only then: git commit
'''
  }
}))
")
  echo "$OUTPUT"
  exit 0
fi

# ── GoalBuddy board written ───────────────────────────────────────────────
if echo "$FILE_PATH" | grep -q "docs/goals/.*/state\.yaml"; then
  # Auto-run GoalBuddy checker and inject result
  CHECKER="$GOALBUDDY_SKILL/scripts/check-goal-state.mjs"

  if [ -f "$CHECKER" ]; then
    RESULT=$(node "$CHECKER" "$FILE_PATH" 2>&1)
    OK=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print('YES' if d.get('ok') else 'NO')" 2>/dev/null)
    ERRORS=$(echo "$RESULT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
errs = d.get('errors', [])
print('\n'.join(f'  ERROR: {e}' for e in errs) if errs else '  No errors.')
" 2>/dev/null)

    OUTPUT=$(python3 -c "
import json
ok = '$OK' == 'YES'
status = 'PASSED' if ok else 'FAILED'
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'PostToolUse',
    'additionalContext': f'''
GOALBUDDY BOARD VALIDATION: {status}

$ERRORS

{'Board is valid. Proceed.' if ok else 'FIX BOARD ERRORS BEFORE COMMITTING.'}
'''.strip()
  }
}))
")
    echo "$OUTPUT"
  fi
  exit 0
fi

# ── Implementation spec written ───────────────────────────────────────────
if echo "$FILE_PATH" | grep -q "docs/superpowers/specs/IMPLEMENTATION-BLUEPRINT"; then
  OUTPUT=$(python3 -c "
import json
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'PostToolUse',
    'additionalContext': 'IMPLEMENTATION BLUEPRINT WRITTEN. Run plan-review on this document before committing.'
  }
}))
")
  echo "$OUTPUT"
fi

exit 0
