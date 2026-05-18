---
name: onboarding-guide
description: "Create team onboarding guides that get new hires doing real work in week one, not just reading docs."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: writing
  tags: "onboarding, team, documentation, hiring, productivity"
---

# Team Onboarding Guide Creation

Create onboarding guides that follow Shape Up's philosophy: new hires ship something real in week one. Not just "read this repo" and "set up your laptop." Real work, real merge, real contribution.

## When to Use

- Writing or overhauling a team onboarding guide
- Creating a structured 30-60-90 day plan for a new hire
- Auditing an existing guide for completeness and staleness
- Do NOT use when: the team has no documented processes — document processes first, then write the onboarding guide

## The Week-One Principle

New hires forget most of what they read. They remember everything they do. The single most effective onboarding investment is ensuring the new hire merges something to production by the end of week one.

The first task must be:
- **Real** — touches actual production code or docs, not a sandbox
- **Small** — completable in 1-3 hours by someone unfamiliar with the codebase
- **Merged** — a PR that gets reviewed, approved, and merged, not just submitted

[FILL-IN: first-task] — Replace this with the actual first task for [FILL-IN: team-name].

## Day One: Accounts Before Code

New hires cannot contribute if they cannot access systems. Complete account setup in this order — blocking on access wastes days.

1. **Identity and auth first** — SSO, password manager, MFA
2. **Communication tools** — Slack/Teams, email, calendar
3. **Code access** — GitHub/GitLab org membership, repository permissions
4. **Infrastructure access** — cloud console, staging environments
5. **Project management** — Linear/Jira/Notion, relevant boards and spaces
6. **Specialty tools** — design tools, analytics, monitoring

Tools required for [FILL-IN: team-name]: [FILL-IN: tools-list]

The day one checklist template automates this sequence. Do not skip steps — skipped steps cause "my PR can't be reviewed" problems on day two.

## The Onboarding Buddy System

Assign one person as the new hire's onboarding buddy. The buddy is responsible for:
- Being the first contact for any question, no matter how basic
- Unblocking day one account setup within hours, not days
- Scheduling a 30-minute sync on day one and day three of week one
- Flagging to the team lead if week-one progress is stalled

The buddy is NOT the whole team. Routing all questions through one person prevents the new hire from feeling like they're interrupting everyone and allows the team to continue normal work. The buddy rotates — no single person does this more than once per quarter.

## 30 / 60 / 90 Day Structure

**First 30 days — Learn the system**
Goal: understand how work gets done here before trying to change it. Read the major architectural decisions. Shadow one user research session. Complete two assigned tasks with close buddy support.

**Days 31-60 — Contribute to the system**
Goal: operate independently on scoped work. Own at least one task from kickoff through production. Ask for help when stuck, but identify the problem before asking.

**Days 61-90 — Improve the system**
Goal: identify one thing the team does that could be done better and propose a change. This surfaces how well the new hire has internalized the team's values and working style.

## Documentation That Expires

Onboarding guides become inaccurate within months. Every guide must include:

- **Last updated date** — visible in the header, not buried in git history
- **Quarterly review reminder** — a calendar event or automated issue that triggers a review
- **Owner** — one person responsible for keeping the guide current (typically the team lead or a designated DRI)

Stale onboarding guides are worse than no guide — they send new hires down dead ends with confidence.

## What NOT to Include

- The full company history and org chart — link to the company wiki
- Every possible edge case and exception — document the common path; let the buddy handle exceptions
- Aspirational process that the team doesn't actually follow — document reality, not ideals
- Anything that changes more than once per quarter in prose form — link to the live source instead

## Onboarding Guide Checklist

- [ ] Accounts and tools list is complete and in setup order
- [ ] First task is identified, real, and completable in week one
- [ ] Onboarding buddy assigned before the new hire's start date
- [ ] 30-60-90 day plan written with concrete deliverables per period
- [ ] Last updated date visible in the header
- [ ] Quarterly review owner and reminder in place

## Supporting Files

- Template: [resources/templates/day-one-checklist.md](resources/templates/day-one-checklist.md)
- Template: [resources/templates/30-60-90-plan.md](resources/templates/30-60-90-plan.md)
