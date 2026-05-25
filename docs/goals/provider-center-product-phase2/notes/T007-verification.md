# T007 Verification

## Result

Pass. The Provider Center primary UI now exposes the product path only:

- choose one LLM provider;
- API providers show API key setup;
- OpenAI Codex Auth Token shows `CONNECT OPENAI CODEX`;
- Claude Code CLI Auth Token shows `CONNECT CLAUDE CODE`;
- model retrieval and model selection remain visible;
- credential type, routing policy, usage/cost, Provider Center catalog groups, and `USE FOR SKILL CREATION` are not visible in the primary flow.

## Credential Activation Contract

API-key activation stores the credential through encrypted local SkillMall storage and returns only redacted status.

OpenAI Codex and Claude Code local auth-token activation now verifies local CLI auth before accepting the provider config:

- `openai_codex` uses `codex login status`;
- `claude_code` uses `claude auth status`;
- configure rejects the local auth provider when the CLI is missing or not authenticated;
- no browser/session token, credential file, or credential path is accepted.

Local verification on this machine found:

- Codex CLI status: logged in using ChatGPT.
- Claude Code auth status: logged in through `claude.ai` with Max subscription.

No raw token values or credential-file contents were printed or stored in proof artifacts.

## Verification

- `npm test -- components/skill-mall/providers` passed.
- `npm test -- lib/providers app/api/providers` passed.
- `npm test -- lib/providers app/api/providers lib/llm/router` passed.
- `npm test` passed: 56 files, 442 tests.
- `npx tsc --noEmit --pretty false` passed.
- `npm run lint` passed.
- `git diff --check` passed.

## Browser Proof

- `docs/goals/provider-center-product-phase2/notes/browser-proof/desktop-provider-center-simplified.png`
- `docs/goals/provider-center-product-phase2/notes/browser-proof/mobile-provider-center-simplified.png`
- `docs/goals/provider-center-product-phase2/notes/browser-proof/desktop-provider-center-codex-auth.png`
- `docs/goals/provider-center-product-phase2/notes/browser-proof/simplified-proof.json`
- `docs/goals/provider-center-product-phase2/notes/browser-proof/codex-auth-proof.json`

Browser proof checks confirmed:

- Provider Center and provider picker render.
- API key, retrieve models, and select model render for API-backed providers.
- OpenAI Codex Auth Token and Claude Code CLI Auth Token are present.
- Codex selection renders `CONNECT OPENAI CODEX`.
- `CREDENTIAL TYPE` is absent.
- `STAGE 3`, `USAGE + COST`, and `USE FOR SKILL CREATION` are absent.

## Remaining Work

T008 code review is still queued. No commit, push, or PR work was performed.
