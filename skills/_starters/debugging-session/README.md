# Debugging Session Starter

A starter skill for running structured debugging sessions based on the scientific debugging methodology: form a hypothesis, test it, record what you learned.

## What's included

- Scientific debugging loop: reproduce → hypothesize → test → narrow → fix → prevent
- Debugging session log template to track what you tried
- Bug report template for documenting the outcome
- Team-customizable observability tools and rollback command

## Fill-in markers

### [FILL-IN: github-username]
Your GitHub username for the author field.

### [FILL-IN: observability-tools]
Tools available in your stack for gathering evidence. Examples:
- `Datadog, Sentry, console.log, Chrome DevTools`
- `CloudWatch Logs, X-Ray, local pino logs`
- `Prometheus, Grafana, Rails logs, byebug`

### [FILL-IN: rollback-command]
How to quickly undo a bad change in your environment. Examples:
- `git revert HEAD && git push && ./scripts/deploy.sh`
- `kubectl rollout undo deployment/api`
- `heroku rollback`

## Source

Based on [A Debugging Manifesto](https://jvns.ca/blog/2019/06/23/a-debugging-manifesto/) by Julia Evans.
