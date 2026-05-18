# Incident Postmortem Starter

A starter skill for writing blameless incident postmortems based on Google's Site Reliability Engineering practices. Produces structured documents that stakeholders trust and engineering teams can act on.

## What's included

- Blameless postmortem methodology
- 5-whys root cause analysis
- Impact quantification
- Action items framework (owner + due date + priority)
- Templates for the full postmortem and action items tracker
- Team-customizable severity matrix and on-call tool reference

## Fill-in markers

### [FILL-IN: github-username]
Your GitHub username for the author field.

### [FILL-IN: severity-matrix]
Your team's incident severity definitions. Example:
- SEV1: Revenue impact > $10k/hr or > 10% of users blocked
- SEV2: User-facing degradation < 10% of users
- SEV3: Internal tool outage, no user impact

### [FILL-IN: on-call-rotation]
Your team's on-call tool or rotation. Examples:
- `PagerDuty team: platform-oncall`
- `OpsGenie schedule: backend-rotation`
- `Slack channel: #oncall-alerts`

## Source

Based on [Google SRE Workbook: Postmortem Analysis](https://sre.google/workbook/postmortem-analysis/).
