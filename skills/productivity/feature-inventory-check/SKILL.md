---
name: feature-inventory-check
description: "Run a mandatory feature inventory before writing any phase plan. Every feature in the spec must be explicitly assigned to a phase or explicitly deferred. Zero features may be silently omitted."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: productivity
  tags: "planning, phase-plans, feature-inventory, spec-compliance"
---

# Feature Inventory Check

This skill exists because features were silently omitted from Phase 1 and Phase 2 plans and had to be discovered afterward. Run this skill before writing any phase plan, before marking a phase complete, and before starting a new phase.

## When to Run

- Before writing a phase plan document
- Before running `$goal-prep` for any phase
- Before marking a phase completion audit as `full_outcome_complete: true`
- Any time the question "what else was in the spec?" arises

## The Process

### Step 1: Extract every feature from the spec

Read the feature specification completely. For each numbered feature, section, and subsection, create a line item:

```
Feature: <name>
Source: <spec section>
Phase assignment: <Phase 1 | Phase 2 | Phase 3 | Future Development | Explicitly deferred>
Status: <planned | built | missing>
```

Do not stop at the features you remember. Read every section. Subsections count as features if they represent user-facing functionality.

### Step 2: Cross-reference against all existing plans

For each feature extracted in Step 1, check whether it appears in:
- `docs/superpowers/plans/PHASE-1-PLAN.md`
- `docs/superpowers/plans/PHASE-2-PLAN.md`
- `docs/superpowers/plans/PHASE-3-PLAN.md`

A feature is only "planned" if it appears as a Worker task card with `allowed_files`, `verify`, and `stop_if`. A mention in a list or prose description does not count.

### Step 3: Flag every gap

For every feature that is:
- In the spec with a phase assignment but not in the corresponding plan → **MISSING — add to plan before proceeding**
- In the spec with no phase assignment → **UNASSIGNED — assign explicitly**
- In the spec under "Future Development" → **OK if explicitly called out as deferred**

### Step 4: Do not proceed until the inventory is complete

Do not write the plan document. Do not run `$goal-prep`. Do not start `/goal`. Until every spec feature has an explicit assignment and zero features are missing from their assigned plan.

## The Rule

**Every feature in the spec that was assigned to a phase must appear as a Worker task card in that phase's plan.**

Missing features are not discovered by accident later. They are discovered by reading the spec systematically before writing the plan.

## What Was Missed and Why This Skill Exists

From the SkillMall feature spec:

| Feature | Spec Phase | Plan Status |
|---|---|---|
| Agent Budget Analyzer | Phase 1 | Missing from Phase 1 plan |
| Domain Starter Templates | Phase 1 | Missing from Phase 1 plan |
| Codebase-to-Skill Extractor | Phase 2 | Missing from Phase 2 plan |
| Skill Dependency Graph | Phase 2 | Missing from Phase 2 plan |
| Skill Testing Framework | Phase 2 | Missing from Phase 2 plan |
| Multilingual Skill Support | Phase 2 | Missing from Phase 2 plan |

These were found only after both phases were complete, when the user asked "what remains to be developed?" — that question should never be the mechanism for finding missing features.

## Verification

Before calling a phase plan complete, run this check:

```bash
# Count features in the spec vs tasks in the plan
echo "Spec sections with user-facing features:"
grep -c "^### " docs/superpowers/specs/2026-05-17-skillmall-feature-expansion-design.md

echo "Worker tasks in Phase N plan:"
grep -c "type: worker" docs/superpowers/plans/PHASE-N-PLAN.md
```

The task count will be lower than the section count (some sections are architectural, not features). But every user-facing feature section must map to at least one Worker task.
