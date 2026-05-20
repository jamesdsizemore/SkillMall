# Docs Parity After Phase 7 Hardening

Docs updated:

- `docs/developer/cli-reference.md` now states that provider and policy commands reject raw keys, tokens, browser/session cookies, credential paths, prompts, messages, responses, and outputs.
- `docs/reference/database-schema.md` now states that request and event metadata scrub prompt/response bodies and raw credential-like metadata before serialization.

Docs intentionally did not claim:

- `cheapest_compatible` is implemented.
- `quality_first`, semantic, learned, complexity, or eval routing is implemented.
- New auth modes or credential storage are implemented.
- Hosted gateway/control-plane infrastructure is required.

Verification:

- `rg -n "cheapest_compatible|quality_first|semantic|credential-file|prompt body|response body|reference metadata|live account availability|Phase 7" docs/reference docs/developer docs/user docs/recovery/2026-05-20-provider-auth-router-phase-7-final-e2e-audit-hardening-plan.md` passed.

Classification:

- Expected Provider/Auth Router docs hits preserve unsupported-mode boundaries for `cheapest_compatible`, `quality_first`, semantic routing, learned routing, complexity routing, eval routing, keychain auth, OAuth device flow, Codex session auth, Claude Code token auth, browser session-token handling, and credential-file/path rejection.
- Expected docs hits preserve reference metadata vs live account availability wording for Portkey/LiteLLM/OpenRouter capability and pricing metadata.
- Expected docs hits preserve prompt/response/body storage boundaries for routing policies, policy simulation, request ledger metadata, and event metadata.
- Unrelated hits in prompt-engine, FAQ, pipeline architecture, and API-reference wording are not Provider/Auth Router drift.
