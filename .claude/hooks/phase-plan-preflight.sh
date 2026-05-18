#!/bin/bash
# UserPromptSubmit hook — fires before Claude responds to a user prompt
# Detects when a phase plan or spec is being requested
# Injects mandatory pre-flight reminder into the conversation context

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('prompt', '').lower())
" 2>/dev/null)

# Detect plan-writing intent
IS_PLAN_REQUEST=false
for keyword in "phase plan" "write a plan" "create a plan" "implementation plan" "phased plan" "write the plan" "rewrite the plan" "new plan"; do
  if echo "$PROMPT" | grep -q "$keyword"; then
    IS_PLAN_REQUEST=true
    break
  fi
done

if [ "$IS_PLAN_REQUEST" = "true" ]; then
  OUTPUT=$(python3 -c "
import json
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'UserPromptSubmit',
    'additionalContext': '''PLAN WRITING DETECTED — MANDATORY PRE-FLIGHT:

Before writing any phase plan, you MUST:

1. Run feature-inventory-check:
   Read the ENTIRE feature spec. List every user-facing feature.
   Assign every feature to a phase or explicitly defer it.
   A feature is only planned if it is a Worker task card with
   allowed_files, verify, and stop_if — not a prose mention.

2. After writing, run plan-review (two passes):
   Pass 1: self-containment, no external references, all decisions made
   Pass 2: file conflicts, drift vectors, board consistency
   Pass 1 again after fixes.

3. Only then commit.

These steps are not optional. Skipping them requires rewriting the plan.'''
  }
}))
")
  echo "$OUTPUT"
fi

exit 0
