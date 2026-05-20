# HF-004 Ledger Secret Metadata

Finding: request-ledger metadata scrubbing removed prompt/response/body-like fields, but did not explicitly remove secret-like metadata keys or credential-like values under safe-looking metadata keys.

Fix:

- Added secret-like metadata key detection in `lib/llm/router/request-ledger.ts`, including API keys, auth headers, bearer tokens, browser/session tokens, browser/session cookies, raw keys, credentials, and secrets.
- Added value-level redaction for credential-like strings such as bearer headers, raw `sk-`-style keys, browser/session cookie assignments, and `.codex`/`.claude` credential paths even when they appear under otherwise safe metadata keys.
- Kept existing prompt/response/body/message scrub behavior.
- Added focused regression tests in `lib/llm/router/__tests__/request-ledger.test.ts` proving secret-like keys are removed and credential-like values are redacted from serialized ledger metadata.

Verification:

- `npm test -- cli/src/commands/providers.test.ts cli/src/commands/provider-policies.test.ts lib/llm/router/__tests__/request-ledger.test.ts --reporter=verbose` passed after T708 fixes: 3 files, 37 tests.
- `npm test -- cli components/skill-mall/providers app/api/providers lib/llm/router lib/providers` passed after T708 fixes: 25 files, 200 tests.
- `git ls-files -m -o --exclude-standard | xargs rg -n "apiKey|api_key|raw[_-]?key|token|sessionToken|session-token|session[_-]?cookie|browser[_-]?cookie|cookie|credentialPath|credential-path|authorization|bearer|prompt|response|do not store|raw-api-key|raw-token|/Users/test|sk-"` scanned modified and untracked Phase 7 files.
- Changed/untracked-file scan hits were expected scrubber patterns, CLI unsafe flag names, synthetic negative fixtures, docs boundary language, and GoalBuddy receipt text; no raw credential material is persisted.
