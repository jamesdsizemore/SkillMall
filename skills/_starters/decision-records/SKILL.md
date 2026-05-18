---
name: decision-records
description: "Write Architecture Decision Records (ADRs): context, decision, consequences, and status for significant choices."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: development
  tags: "architecture, adr, decision-records, documentation"
---

# Architecture Decision Records

Create ADRs (Architecture Decision Records) that capture significant architectural choices, the context that drove them, and the consequences of making them. Based on the Nygard/Helmsman ADR format used at many engineering teams.

## When to write an ADR

Write an ADR when:
- The decision is hard to reverse without significant cost
- The decision affects multiple teams, services, or layers
- There were real alternatives considered and rejected
- Future engineers will wonder why this choice was made

Do NOT write an ADR for:
- Obvious implementation details ("use a for loop here")
- Decisions with a single obvious answer
- Purely stylistic choices already covered by a linter rule

## ADR structure (Nygard format)

**Title:** Short noun phrase. "Use PostgreSQL for primary data storage", not "Database decision".

**Status:** `Proposed` → `Accepted` → `Deprecated` → `Superseded`

**Context:** The situation that forced this decision. What constraints existed? What problems were we solving? This section is factual, not argumentative.

**Decision:** The change we are proposing or have decided to make. Active voice: "We will use X" not "X was decided."

**Consequences:** What becomes easier? What becomes harder? What tech debt does this create? What is now out of scope?

## ADR numbering and storage

Store ADRs at: [FILL-IN: adr-directory]
Number them: [FILL-IN: numbering-scheme]

Once accepted, an ADR is immutable. If the decision changes, create a new ADR that supersedes the old one. Update the old ADR's status to `Superseded by ADR-NNN`.

## Referencing ADRs

Link from code comments where the ADR explains a non-obvious constraint:
```
// See ADR-012: we use optimistic locking here instead of row-level locks
// because of the expected low write contention on this table.
```

Link from PR descriptions when a PR implements or follows an ADR.
