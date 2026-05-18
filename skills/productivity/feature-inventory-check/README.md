# feature-inventory-check

Mandatory pre-flight before writing any phase plan. Cross-references every feature in the spec against every task in the plan. Prevents features from being silently omitted.

## Why this exists

Features were missed from Phase 1 and Phase 2 plans and discovered only after both phases were declared complete. Agent Budget Analyzer, Domain Starter Templates, Codebase-to-Skill Extractor, Skill Dependency Graph, Skill Testing Framework, and Multilingual Support were all in the spec with explicit phase assignments, and none appeared as Worker task cards in their assigned plans.

## The rule

Every feature in the spec with a phase assignment must appear as a Worker task card (with `allowed_files`, `verify`, `stop_if`) in that phase's plan. A prose mention is not a task card.

## When to use

- Before writing a phase plan
- Before `$goal-prep` for a new phase
- Before marking a phase completion audit `full_outcome_complete: true`
