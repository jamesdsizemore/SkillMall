# T009 - Code Review Receipt

## Decision

Pass after required fixes.

## Findings

### Finding 1 - High - New auth modes did not typecheck across shared surfaces

`npx tsc --noEmit --pretty false` initially failed after the Codex/Claude setup-token implementation. The failures were not cosmetic: `PolicyControlPanel` narrowed auth modes to the old set, CLI status helpers assumed every non-`none` secret ref had `.name`, model discovery tried to resolve stored provider secrets as env vars, and Codex env objects were inferred too narrowly.

Fixes applied:

- `components/skill-mall/providers/PolicyControlPanel.tsx` now carries `codex_app_server` and `claude_setup_token` into policy candidates and uses a stored setup-token ref for Claude setup-token policy drafts.
- `app/api/providers/route.ts` and `cli/src/commands/providers.ts` now label `codex_app_server` and `claude_setup_token` as `provider_account_auth`.
- `cli/src/commands/configure.ts` and `cli/src/commands/providers.ts` now render stored provider secret status without assuming `.name`.
- `lib/providers/model-sources.ts` no longer treats stored provider secrets as env refs.
- `lib/providers/codex.ts`, `lib/providers/codex-app-server-auth.ts`, and `lib/providers/claude-code-env.ts` now use env typing that compiles while still clearing conflicting auth env.
- `lib/providers/types.ts`, `lib/providers/registry.ts`, and `lib/providers/__tests__/registry.test.ts` now classify `openai_codex` as `provider_account_auth`.

Status: fixed.

### Finding 2 - Medium - Root typecheck needed CLI package dependencies installed in the clean worktree

The clean worktree had root dependencies installed, but `cli/node_modules` was absent. Root `tsc` includes `cli/**/*.ts`, so it could not resolve `@clack/prompts`.

Fix applied:

```bash
npm install --prefix cli
```

This installed CLI dependencies from `cli/package-lock.json`; no tracked package files changed.

Status: fixed.

## Review Scope

Reviewed changed files under:

- `components`
- `app`
- `lib`
- `cli`
- `docs`

## Verification

```bash
npx tsc --noEmit --pretty false
```

Result: pass.

```bash
npm test -- lib/providers app/api/providers components/skill-mall/providers lib/llm/router
```

Result: pass. `26 passed (26)` test files, `191 passed (191)` tests.

## Residual Risk

No high or medium severity finding remains open from this review. Browser proof and broad verification still belong to T010.
