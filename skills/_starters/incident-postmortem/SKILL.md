---
name: incident-postmortem
description: "Write blameless incident postmortems: timeline, root cause, impact, 5-whys, and actionable follow-ups."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: development
  tags: "incident, postmortem, sre, reliability, blameless"
---

# Incident Postmortem

Produce blameless postmortems that identify systemic causes of incidents, quantify impact, and generate concrete action items with owners and due dates. Based on Google SRE practices.

## When to use

- After any incident that caused user-facing impact or data loss
- After a near-miss that could have caused an outage
- During on-call handoff after a multi-hour incident
- When stakeholders ask "what happened and what are we doing about it?"

## Blameless first

Blame is not useful. Individual errors are symptoms of broken systems. A postmortem that blames a person produces no systemic improvement and damages psychological safety.

Ask: what in the system allowed this error to have the impact it did? The answer reveals actionable improvements.

## Severity classification

Your team's severity definitions: [FILL-IN: severity-matrix]

## Building the timeline

1. Pull logs, chat transcripts, status page updates, and deployment records
2. Reconstruct a chronological timeline with UTC timestamps
3. Mark the key moments: first symptom visible, first alert fired, first responder paged, incident declared, mitigation applied, incident resolved, postmortem published
4. Include decisions made, not just actions taken

## Writing the 5-whys

Start with the user-visible symptom. Ask "why did this happen?" five times (or until you reach a root cause you can actually act on).

Example:
- Users received 500 errors on checkout
- Why? The payment service was unreachable
- Why? The DB connection pool was exhausted
- Why? A migration query locked the main payments table for 4 minutes
- Why? The migration ran without a lock timeout
- Why? We have no policy requiring lock timeouts in migrations — **this is the root cause**

## Action items

Every action item needs an owner, a due date, and a priority. No action item should be "investigate X" — turn it into "add lock timeout to migration template by [date]".

On-call rotation tool: [FILL-IN: on-call-rotation]
