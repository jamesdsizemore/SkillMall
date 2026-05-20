# Use local SQLite for community state

SkillMall uses `better-sqlite3`, raw parameterized SQL, and migrations in `db/migrations/` for sessions, reviews, install events, feedback, marketplace state, and RAG metadata. We intentionally avoid Supabase, Prisma, and hosted Postgres for the current architecture because the product is local-first, should work without cloud setup, and benefits from direct control over a small schema.

**Status:** accepted

**Considered Options:** Supabase, Prisma, hosted Postgres.

**Consequences:** The Local Data Store module should own schema readiness and migration behavior. Features that need durable community state should use SQLite unless a future ADR supersedes this decision.
