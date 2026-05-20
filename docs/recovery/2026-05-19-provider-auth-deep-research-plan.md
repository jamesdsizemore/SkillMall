# SkillMall Provider/Auth Deep Research Plan

Date: 2026-05-19
Branch: `codex/agent-operating-contract-auth-token-skill`
Status: Plan-only artifact for user approval

## Purpose

This plan defines the provider/auth research and design work that must happen before any provider/auth code is implemented, salvaged, staged, committed, or pushed.

It responds to the current recovery state where provider/auth dirty files are classified as `REWORK` in `docs/recovery/2026-05-19-provider-recovery-inventory.md`.

The central correction is:

- ChatGPT Pro/Codex subscription/account auth is not the same thing as OpenAI Platform API-key access.
- Claude account/Max auth is not the same thing as Anthropic API-key access.
- Claude Code CLI auth is not a generic Claude account token that SkillMall can initiate, collect, store, or replay without an officially supported integration path.
- OpenAI/Codex auth tokens and Anthropic bearer/OAuth tokens must be researched as OAuth/token-auth paths, but they are not assumed to be safe or permitted for SkillMall to initiate, receive, store, or replay directly.
- API-key access remains useful, but it must be labeled as API access and treated as optional.

## Explicit Non-Authorization

This document does not authorize:

- implementation
- cleanup
- deletion
- reverting dirty files
- staging
- committing
- pushing
- PR creation
- credential storage changes
- provider UI changes
- OAuth initiation, token collection, credential storage, or token replay

Any implementation PR must be approved after this plan is reviewed.

## Local Source Receipts

Read before writing this plan:

- `AGENTS.md`
- `docs/recovery/2026-05-19-provider-recovery-inventory.md`
- `docs/recovery/2026-05-19-skillmall-recovery-auth-token-plan.md`

Local provider/auth surfaces inspected:

- `app/api/providers/route.ts`
- `app/api/providers/configure/route.ts`
- `app/settings/providers/page.tsx`
- `lib/providers/types.ts`
- `lib/providers/index.ts`
- `lib/providers/catalog.ts`
- `lib/providers/config-store.ts`
- `lib/providers/claude-code.ts`
- `lib/providers/openai.ts`
- `lib/providers/anthropic.ts`
- `lib/providers/defaults.ts`
- `docs/reference/api-routes.md`
- `docs/reference/pipeline-architecture.md`
- `docs/developer/getting-started.md`

Local finding:

The dirty provider work currently mixes provider IDs, auth modes, model discovery, local config writes, `.env.local` writes, runtime `process.env` mutation, and settings UX into one narrow API-key-centered path. The plan below treats that as a design failure to research, not an implementation to polish.

## Current Official Source Receipts

Sources checked on 2026-05-19:

| Area | Current source | Key finding for SkillMall |
|---|---|---|
| OpenAI Codex auth | OpenAI Codex auth docs: https://developers.openai.com/codex/auth | Codex has separate ChatGPT subscription sign-in and API-key sign-in paths. Codex cloud requires ChatGPT sign-in. CLI/IDE support both. API-key usage is billed through the OpenAI Platform account. |
| OpenAI Codex app server | OpenAI Codex app-server docs: https://developers.openai.com/codex/app-server and `openai/codex` app-server README | Maintainer docs expose account state such as `authMode: "apikey"` or `authMode: "chatgpt"`, plus browser and device-code ChatGPT flows. This is evidence that account/subscription auth and API-key auth are distinct modes. |
| OpenAI Codex access tokens | OpenAI Codex access token docs: https://developers.openai.com/codex/enterprise/access-tokens | Codex access tokens are for trusted programmatic Codex local workflows with ChatGPT Business/Enterprise workspace identity. The docs explicitly say Platform API keys remain the right choice when they work, and access tokens are not general OpenAI API keys. |
| OpenAI/Codex ChatGPT auth tokens | OpenAI Codex app-server docs: https://developers.openai.com/codex/app-server | Maintainer docs expose `chatgptAuthTokens` as an app-server login type. SkillMall must research whether a third-party local app is expected to initiate this OAuth flow itself, delegate to the official Codex app-server, or avoid the token path entirely. It must not be collapsed into OpenAI API-key access. |
| OpenAI API auth | OpenAI API authentication docs: https://developers.openai.com/api/reference/overview#authentication | OpenAI API calls use API keys; keys must not be exposed in browser/client code and should be loaded from server-side environment variables or key management. |
| OpenAI models | OpenAI model docs: https://developers.openai.com/api/docs/models | Model lists and model recommendations are live and drift-prone. SkillMall should not freeze static model lists without refresh/fallback policy. |
| Claude Code auth | Claude Code authentication docs: https://code.claude.com/docs/en/authentication | Claude Code supports Claude.ai subscription login, Console/API credentials, cloud-provider auth, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `apiKeyHelper`, and `CLAUDE_CODE_OAUTH_TOKEN`, with explicit precedence rules. |
| Claude subscription vs API key | Claude Help Center: https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan | If `ANTHROPIC_API_KEY` is set, Claude Code uses API-key authentication instead of the subscription path, which can create unexpected API charges. |
| Claude OAuth restrictions | Claude Code legal/compliance docs: https://code.claude.com/docs/en/legal-and-compliance | Anthropic says third-party developers should use API-key auth or supported cloud providers and may not offer Claude.ai login or route through Free/Pro/Max plan credentials on behalf of users. |
| Claude Agent SDK credit change | Claude Help Center: https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan | A new Agent SDK credit model is described as starting on 2026-06-15. Because this date is in the future from this plan date, implementation must re-check the docs before relying on it. |
| Anthropic API auth | Anthropic API auth docs: https://platform.claude.com/docs/en/api/authentication/overview | Anthropic API supports API keys and Workload Identity Federation. API keys are static secrets for direct API access, not Claude account/Max auth. |
| Gemini API | Google Gemini API docs: https://ai.google.dev/gemini-api/docs and https://ai.google.dev/gemini-api/docs/api-key | Gemini API keys are created/managed in Google AI Studio. Gemini also offers OpenAI-compatible endpoints, but that is still Gemini API access. |
| Gemini models | Google Gemini model docs: https://ai.google.dev/gemini-api/docs/models and https://ai.google.dev/api/models | Gemini model names, availability, deprecation status, and capabilities change. Live model discovery and capability filtering need current docs/API support. |
| Groq API | Groq API reference: https://console.groq.com/docs/api-reference | Groq exposes an OpenAI-compatible models endpoint authenticated with `GROQ_API_KEY`. This belongs in API-key access. |
| Ollama local runtime | Ollama API docs: https://docs.ollama.com/api and https://docs.ollama.com/api/tags | Ollama is a local runtime with default API at `http://localhost:11434/api`; `/api/tags` lists locally available models. It is neither account auth nor API-key auth unless using a hosted gateway. |
| OpenRouter gateway | OpenRouter docs: https://openrouter.ai/docs/api-reference/overview and https://openrouter.ai/docs/api/api-reference/models/get-models | OpenRouter is an OpenAI-compatible gateway with one API key and broad model discovery. It should be modeled as gateway/API access, not as native provider auth. |
| Vercel AI Gateway | Vercel AI Gateway docs: https://vercel.com/docs/ai-gateway and https://vercel.com/docs/ai-gateway/models-and-providers | Vercel AI Gateway offers a unified model gateway, budgets, monitoring, fallbacks, BYOK, and OpenAI-compatible access. It belongs in gateway/API access. |
| Secret storage | OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html | Secrets should not be hardcoded or casually placed in config. Prefer secret managers/key management, lifecycle handling, rotation, and clear storage boundaries. |
| Local OS secret storage | `keytar` maintainer repo: https://github.com/atom/node-keytar | `keytar` maps to macOS Keychain, Linux Secret Service/libsecret, and Windows Credential Vault. It is a candidate, not approved until maintenance, packaging, and Next/CLI compatibility are checked. |
| Next env behavior | Next.js env docs: https://nextjs.org/docs/14/pages/building-your-application/configuring/environment-variables | `.env.local` loads into `process.env`, while `NEXT_PUBLIC_` controls browser exposure. Runtime behavior must be researched against the installed Next docs before implementation because `AGENTS.md` warns this repo's Next version may differ. |

## Research Questions To Answer

### RQ1: What provider/auth modes should SkillMall expose?

Required output:

- A provider/auth taxonomy that separates:
  - `subscription-account`
  - `official-cli-session`
  - `api-key`
  - `cloud-identity`
  - `gateway-api-key`
  - `local-runtime`
  - `custom-openai-compatible`
- Stable provider IDs and display labels.
- Explicit unsupported states.

Non-negotiable labels:

- `openai-api` means OpenAI Platform API key.
- `codex-chatgpt` or equivalent means official Codex ChatGPT sign-in/session, not an API key. Research must decide whether SkillMall delegates to official Codex tooling or can own an officially supported OAuth flow.
- `codex-access-token` means Codex local automation token for supported ChatGPT Business/Enterprise workflows, not a Platform API key.
- `anthropic-api` means Anthropic API key or WIF-backed API access.
- `claude-code-cli` means the local official Claude Code process/session, not SkillMall-owned Claude account OAuth unless official docs authorize that exact integration.
- `ollama-local` means local runtime.
- gateway providers must be named as gateway providers, not as native OpenAI/Anthropic account auth.

### RQ2: Which account/subscription paths are actually supportable?

Required output:

- A supportability matrix for:
  - OpenAI Codex ChatGPT sign-in
  - OpenAI Codex access tokens
  - OpenAI/Codex ChatGPT auth tokens, including app-server `chatgptAuthTokens`, if officially supportable
  - OpenAI Platform API key
  - Claude Code interactive subscription login
  - Claude Code `ANTHROPIC_AUTH_TOKEN`
  - Claude Code `CLAUDE_CODE_OAUTH_TOKEN`
  - Claude Code Agent SDK subscription credit after 2026-06-15
  - Anthropic API key
  - Anthropic Workload Identity Federation
  - Gemini API key
  - Groq API key
  - Ollama local runtime
  - OpenRouter/Vercel/LiteLLM gateway key

Each row must answer:

- Is this officially documented?
- Is it allowed for a third-party local app?
- Can SkillMall initiate the OAuth/token flow directly?
- Can SkillMall receive/store the resulting credential directly?
- Can SkillMall delegate to an official CLI/process instead?
- Is this for interactive local use, CI, production server use, or all three?
- What billing/usage bucket applies?
- What status should the UI show?

### RQ3: Should SkillMall ever own account/subscription OAuth/token flows?

Starting hypothesis:

No. SkillMall should not ask users to paste raw tokens, copy credential files, or run a SkillMall-owned OAuth/token flow for ChatGPT/Codex or Claude subscription credentials unless official docs authorize that exact integration. It should either:

- delegate to official local tools that own their own auth, or
- use documented API-key/cloud-identity/gateway credentials that users intentionally provide as API access.

Research must verify whether any exception exists for:

- Codex Business/Enterprise access tokens
- OpenAI/Codex ChatGPT auth tokens exposed through official app-server flows
- Claude Code `ANTHROPIC_AUTH_TOKEN`
- Claude Code `CLAUDE_CODE_OAUTH_TOKEN`
- Agent SDK subscription credits after 2026-06-15

Any exception must include a legal/supportability citation and a secret-storage decision.

### RQ4: What is the right local credential storage policy?

Required output:

- Decision between:
  - no credential storage in SkillMall; env vars only
  - OS keychain via a maintained package
  - encrypted local config with keychain-held master secret
  - external secret manager only
  - plaintext config allowed only for non-secret preferences
- Explicit policy for `.env.local`.
- Explicit policy for `~/.skill-mall/config.json`.
- Explicit policy for logs, API responses, browser payloads, and diagnostics.
- Rotation/revocation guidance.

Starting hypothesis:

`~/.skill-mall/config.json` may store non-secret preferences such as selected provider, selected model, endpoint URL, and feature flags. It should not store raw API keys or account tokens unless a security review approves an encrypted/keychain-backed design.

### RQ5: What should model discovery do?

Required output:

- Per provider, define one of:
  - live model list endpoint
  - official docs scrape/manual update only
  - local runtime model list
  - gateway model list
  - static fallback only
- Define cache TTL, refresh UX, stale marker, and fallback behavior.
- Define capability filters for SkillMall needs:
  - structured JSON reliability
  - long-context URL/research summarization
  - tool/function support if needed
  - embeddings support
  - local/offline support

Starting hypothesis:

Static defaults are acceptable only as fallback labels. The settings page should distinguish `live`, `cached`, and `fallback` model lists.

### RQ6: How should provider UX prevent billing and auth confusion?

Required output:

- A settings UX contract that groups providers by access type instead of showing a flat provider list.
- Copy that makes billing mode unavoidable:
  - "Uses your ChatGPT/Codex subscription/session"
  - "Uses OpenAI Platform API billing"
  - "Uses your Claude Code session"
  - "Uses Anthropic API billing"
  - "Uses a local runtime"
  - "Uses a gateway API key"
- A warning when environment variables override subscription sessions, especially `ANTHROPIC_API_KEY`.
- A setup-check flow that reports which credential source is active without revealing secret values.

### RQ7: What architecture should replace the dirty provider files?

Required output:

- A PR-sized architecture plan, not code, covering:
  - provider registry schema
  - auth mode schema
  - credential reference schema
  - model source schema
  - runtime resolver contract
  - settings API response contract
  - configure API request contract
  - docs updates
  - test matrix

Must include how to rework or drop:

- `app/api/providers/configure/route.ts`
- `app/api/providers/route.ts`
- `app/settings/providers/page.tsx`
- `lib/providers/__tests__/config-resolution.test.ts`
- `lib/providers/__tests__/providers.test.ts`
- `lib/providers/__tests__/catalog.test.ts`
- `lib/providers/defaults.ts`
- `lib/providers/index.ts`
- `lib/providers/types.ts`
- `lib/providers/anthropic.ts`
- `lib/providers/catalog.ts`
- `lib/providers/config-store.ts`

## Architecture Options To Evaluate

### Option A: API-Key Providers Only

Description:

Support OpenAI API, Anthropic API, Gemini API, Groq API, OpenAI-compatible custom endpoints, and gateways through explicit API keys or externally supplied env vars.

Pros:

- easiest to support
- clear billing
- works in server/CI/hosted deployment
- aligns with provider API docs

Cons:

- does not satisfy users who expect ChatGPT Pro/Codex or Claude Max subscription usage
- forces pay-as-you-go even when users have subscriptions
- repeats the mistaken design if marketed as account auth

Status:

Likely necessary, but not sufficient.

### Option B: Official CLI Session Delegation

Description:

Use official CLIs as subprocesses for subscription/account-backed local flows:

- Claude Code CLI for `claude-code-cli`
- Codex CLI for `codex-chatgpt` if current docs and app behavior support a stable noninteractive command shape for SkillMall's use case

Pros:

- avoids collecting account tokens
- preserves official auth and credential storage
- maps to user expectations for existing CLI users

Cons:

- local-only unless deployed on a trusted user machine
- process spawning, timeout, prompt formatting, and JSON-output reliability need careful testing
- environment variables can override intended subscription auth
- may be unsuitable for hosted SkillMall

Status:

Promising for local development. Must be researched and tested before approval.

### Option C: Direct Account Token Collection

Description:

SkillMall owns the OAuth/token flow for ChatGPT/Claude account credentials, receives the resulting tokens, stores them, and calls provider endpoints directly.

Pros:

- superficially convenient if officially supported

Cons:

- high legal/supportability risk
- high account-safety risk
- high secret-handling risk
- conflicts with Anthropic's current third-party OAuth restriction
- easy to confuse with API access

Status:

Presumptive `DROP`. Do not implement unless official docs explicitly authorize the exact flow for SkillMall.

### Option D: Codex App Server / Access Token Integration

Description:

Integrate with official Codex local app-server flows or Codex access tokens where supported.

Pros:

- maintainer docs expose account state and ChatGPT/API-key auth modes
- supports official device-code/browser flow patterns
- access tokens support trusted Business/Enterprise automation

Cons:

- access tokens are currently documented for ChatGPT Business/Enterprise, not general Pro subscription use
- app-server API needs supportability review for third-party local apps
- may create more moving parts than SkillMall needs

Status:

Research candidate. Must be separated from generic OpenAI API support.

### Option E: Gateway/Proxy Provider

Description:

Support Vercel AI Gateway, OpenRouter, LiteLLM, or a user-specified OpenAI-compatible endpoint.

Pros:

- broad model choice
- one integration shape can cover many models
- gateways can centralize budgets, routing, and observability

Cons:

- gateway terms and data handling differ from native providers
- model capabilities vary by upstream provider
- gateway API keys are still API/gateway access, not subscription account auth
- self-hosted gateways add security maintenance burden

Status:

Useful as a separate access type. Do not use gateway language to mask account-token routing.

### Option F: Local Runtime Provider

Description:

Support local Ollama or similar runtimes.

Pros:

- no account credential
- works offline after models are installed
- model discovery is local via runtime API

Cons:

- output quality varies
- structured JSON may be less reliable
- local runtime availability and model installation become UX concerns

Status:

Likely keep as a distinct local-runtime mode.

## Evaluation Criteria

Each option and provider must be scored against:

1. Official support: documented by provider or maintainer repo.
2. Legal/account safety: no token replay or prohibited third-party account routing.
3. Billing clarity: user can tell subscription usage from API/gateway billing.
4. Secret safety: no raw secrets in browser payloads, logs, commits, or plaintext config.
5. Local vs hosted suitability: clear boundary for local-only CLI/session providers.
6. Capability fit: structured JSON, long context, embeddings, model refresh, latency.
7. Testability: can be smoke-tested without real secrets, with opt-in live tests.
8. Documentation burden: user/developer docs can explain setup without ambiguity.
9. Drift resilience: model names and auth docs can change without breaking the app silently.

## Proposed Research Execution

### Step 1: Source Refresh

Create a research receipt table with:

- source title
- URL/repo path
- accessed date
- auth modes confirmed
- billing/usage notes
- storage/security notes
- unresolved questions

Minimum source set:

- OpenAI Codex auth docs
- OpenAI Codex access-token docs
- OpenAI Codex app-server docs/repo
- OpenAI API auth docs
- Anthropic Claude Code auth docs
- Anthropic Claude Code legal/compliance docs
- Anthropic API auth docs
- Claude Help Center subscription/API-key priority docs
- Google Gemini API-key and models docs
- Groq API docs
- Ollama API docs
- at least two gateway docs, currently Vercel AI Gateway and OpenRouter
- one secret-storage standard or security baseline, currently OWASP
- local installed Next docs before any Next route/config code is touched

### Step 2: Supportability Matrix

Produce an auth-mode matrix with rows for each provider/access mode and columns for:

- official source
- current support status
- allowed user credential
- credential owner
- can SkillMall store it?
- recommended storage
- billing bucket
- local/hosted support
- model discovery method
- implementation risk
- UI wording

### Step 3: Provider Registry Contract

Draft the target registry contract as pseudocode/types only. No code edits.

The registry must include:

- provider ID
- provider family
- auth mode
- setup method
- credential reference type
- model source type
- default fallback model
- capability flags
- local-only or hosted-safe flag
- docs URL
- user-facing billing label
- warnings

### Step 4: Credential Broker Decision

Write a decision note that answers:

- whether SkillMall stores secrets at all
- where non-secret preferences live
- whether OS keychain support is required for API-key setup UX
- whether direct `.env.local` writes remain allowed
- how production configuration differs from local development
- how CLI sessions are detected without reading or exfiltrating secrets
- what gets redacted in logs and API responses

### Step 5: UX Contract

Draft a settings page contract that groups providers by access type:

- Subscription/session-backed local tools
- API-key providers
- Gateways and OpenAI-compatible endpoints
- Local runtimes
- Cloud identity providers

Each provider card must include:

- access type
- billing/usage source
- setup state
- active credential source
- model list state
- test connection action
- clear unsupported-state messaging

### Step 6: Implementation PR Plan

Only after Steps 1-5 are approved, create an implementation plan with PR slices such as:

1. Provider/auth taxonomy and docs-only contract.
2. Registry and resolver rework without settings UI.
3. Credential storage/broker implementation.
4. Settings UI rebuild.
5. Provider smoke tests and docs update.

Each PR must define allowed files, verification commands, docs updates, and non-goals.

## Preliminary Recommendation Pending Approval

Based on the current sources, the likely winning architecture is a split provider/auth model:

- Keep API-key access as explicit API access.
- Add local official CLI/session providers only where SkillMall delegates to the official tool and does not collect account tokens.
- Treat Codex ChatGPT auth separately from OpenAI API keys.
- Treat Claude Code CLI auth separately from Anthropic API keys.
- Treat SkillMall-owned Claude.ai OAuth initiation, token receipt, storage, or replay as unsupported unless official docs authorize SkillMall's exact flow.
- Treat gateway providers as gateway/API access.
- Treat local runtimes as no-credential local access.
- Store only non-secret preferences in plain local config.
- Require a keychain/secret-manager decision before any UI accepts persistent API keys.

This is a recommendation for the research/design direction only. It is not approval to implement.

## Immediate Blockers Before Implementation

- No provider/auth code should be salvaged from the dirty `REWORK` files as-is.
- No UI should request raw ChatGPT, Claude.ai, Claude Code, browser session, or credential-file tokens.
- No UI should initiate a SkillMall-owned subscription OAuth/token flow until the supportability report proves that exact flow is officially allowed.
- No API key should be written to `.env.local` or `~/.skill-mall/config.json` until the credential-storage decision is approved.
- No model default list should be treated as current without live refresh or source-dated fallback policy.
- No Claude Agent SDK subscription-credit design should be implemented before re-checking official docs on or after 2026-06-15, because the cited change is future-dated relative to this plan.

## Approval Gate

User approval is required before the next task.

Recommended next approved task:

Create the provider/auth research report and supportability matrix described in Steps 1-2, still with no implementation, no cleanup, no staging, no commit, and no push.
