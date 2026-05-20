# HF-001/HF-003 CLI Safety

Findings:

- HF-001: provider CLI rejected raw `--key` values but did not reject the broader unsafe flag family already guarded by policy CLI.
- HF-003: CLI provider/policy command safety lacked focused regression proof.

Fix:

- Added provider CLI unsafe flag rejection for raw keys, tokens, session/browser tokens, credential paths/files, prompts, messages, responses, and outputs.
- Added provider and policy CLI rejection for browser/session cookie aliases and equals-form unsafe flags such as `--key=...` without echoing the value.
- Added focused CLI regression tests for provider and policy unsafe flag rejection and included `cli/**/*.test.ts` in the Vitest test surface.

Verification:

- `npm test -- cli/src/commands/providers.test.ts cli/src/commands/provider-policies.test.ts --reporter=verbose` passed after T708 fixes: 2 files, 24 tests.
- `npm test -- cli components/skill-mall/providers app/api/providers lib/llm/router lib/providers` passed after T708 fixes: 25 files, 200 tests.
- Changed-file scan hits were expected guard strings, synthetic negative fixtures, scrubber patterns, and GoalBuddy receipt text; no raw credential material is persisted.
