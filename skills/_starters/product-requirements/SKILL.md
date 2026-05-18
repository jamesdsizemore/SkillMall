---
name: product-requirements
description: "Write a PRD that owns outcomes, not outputs. Covers problem statements, MUST/SHOULD/COULD/WON'T requirements, and success metrics."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: business
  tags: "product, prd, requirements, planning, stakeholders"
---

# Product Requirements Document (PRD) Writing

Write rigorous PRDs that drive outcome ownership, not output delivery. Based on the SVPG product vs. feature team model: your team is accountable for solving a problem, not shipping a spec.

## When to Use

- Writing a new PRD for a feature, product, or initiative
- Reviewing an existing spec that has drifted into output-only thinking
- Facilitating requirements alignment across engineering, design, and stakeholders
- Do NOT use when: the problem hasn't been validated — run discovery first

## The Three Questions Check

Before writing a single requirement, answer these three questions. If any answer is "we don't know," stop and do discovery first.

1. **Is the problem real?** What data, user research, or market evidence confirms this is a problem people actually have?
2. **Is the solution buildable?** Has engineering assessed feasibility? Are there known technical blockers?
3. **Will people actually use it?** What evidence suggests users will adopt this solution over existing alternatives?

## Problem Statement First

Write the problem statement before any solutions. Format:

> We believe **[user persona]** struggles with **[specific problem]**. Evidence: **[quantitative or qualitative data]**. If we solve this, we expect **[leading indicator]** to improve by **[target]**.

A problem statement is invalid if it contains the words "should," "could," or "will" — those belong in requirements, not the problem.

## Non-Goals Are Mandatory

Every PRD must have an explicit non-goals section. Non-goals accomplish two things: they prevent scope creep during development, and they force you to acknowledge what you're deprioritizing intentionally.

Format: "This PRD does NOT address: [X]. Rationale: [why we're deferring or excluding this]."

If you can't articulate why something is out of scope, you haven't finished scoping.

## Requirements: MUST / SHOULD / COULD / WON'T

Use MoSCoW to categorize every requirement:

- **MUST** — Non-negotiable. Launch cannot happen without this. If it fails, the product fails.
- **SHOULD** — High value, expected by most users. Cut only if engineering time is truly exhausted.
- **COULD** — Nice-to-have. Low cost if included, but low risk if deferred to the next release.
- **WON'T** — Explicitly out of scope for this release. Acknowledging WON'Ts prevents repeated re-scoping discussions.

Write each requirement as a testable statement: "The system must allow a user to X" — not "The system should be easy to use."

## Success Metrics: Leading vs. Lagging

Every PRD needs both types:

- **Leading indicators** — measurable within days/weeks of launch (activation rate, feature adoption, task completion rate). These tell you early whether the product is working.
- **Lagging indicators** — measurable over months (retention, revenue, NPS). These confirm the problem was actually solved.

Format: "[Metric name]: [baseline] → [target] by [date]. Measurement method: [how you'll track it]."

Metric: [FILL-IN: success-metrics]

## Handling Requirements Conflicts

When stakeholders disagree on requirements, use this escalation order:

1. User evidence first — what does research say the user actually needs?
2. Business priority second — which option better achieves the stated goal?
3. Engineering cost third — if options are otherwise equal, prefer the lower-complexity path
4. Escalate to PM/leadership only if the above three are genuinely tied

Document every conflict resolution in the "Open Questions" section with the decision rationale, so future readers understand why requirements are what they are.

## PRD Checklist Before Sharing

- [ ] Problem statement written before any solution language
- [ ] Non-goals explicitly listed
- [ ] All requirements categorized MUST/SHOULD/COULD/WON'T
- [ ] At least one leading and one lagging success metric
- [ ] Open questions section populated
- [ ] Engineering has reviewed for feasibility
- [ ] Design has reviewed for user experience gaps

## Supporting Files

- Template: [resources/templates/prd-template.md](resources/templates/prd-template.md)
- Template: [resources/templates/one-pager-template.md](resources/templates/one-pager-template.md)
