# Architecture Decision Records Starter

A starter skill for writing ADRs (Architecture Decision Records) in the Nygard format. Keeps a durable, numbered log of significant architectural decisions so future engineers understand the "why" behind the code.

## What's included

- Nygard/adr.github.io format: Context → Decision → Consequences
- Status lifecycle: Proposed → Accepted → Deprecated → Superseded
- Standard ADR template
- Superseded ADR template
- Team-customizable directory and numbering scheme

## Fill-in markers

### [FILL-IN: github-username]
Your GitHub username for the author field.

### [FILL-IN: adr-directory]
Path where ADRs are stored in your repo. Examples:
- `docs/decisions/`
- `architecture/adr/`
- `docs/adr/`

### [FILL-IN: numbering-scheme]
Your numbering convention. Examples:
- `ADR-001` (zero-padded 3 digits)
- `0001-` (prefix format)
- `YYYY-MM-DD-` (date prefix)

## Source

Based on [adr.github.io](https://adr.github.io/) and Michael Nygard's original ADR format.
