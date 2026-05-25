# T007 - Claude Setup-Token Runtime Receipt

## Decision

Pass.

## Summary

Claude Code now has two explicit Provider Center paths:

- local CLI login remains a local-machine/session setup path and is not described as a web auth object;
- setup-token configuration stores the token through the app-managed encrypted provider secret store, writes only a stored secret reference into provider config, and injects `CLAUDE_CODE_OAUTH_TOKEN` only into the scoped Claude Code runtime environment.

## Changed Files

- `lib/providers/claude-code.ts`
- `lib/providers/claude-code-env.ts`
- `lib/providers/local-cli-auth.ts`
- `app/api/providers/credentials/setup-token/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`
- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `docs/goals/provider-center-auth-token-correction/notes/T007-allowed-file-amendment.md`

## Verification

```bash
npm test -- lib/providers app/api/providers components/skill-mall/providers
```

Result: pass. `12 passed (12)` test files, `105 passed (105)` tests.

```bash
rg -n "setup-token|setup_token|CLAUDE|ANTHROPIC|env|redact|local CLI" lib/providers app/api/providers components/skill-mall/providers
```

Result: expected implementation evidence visible in:

- `lib/providers/claude-code-env.ts` for scoped setup-token env injection and removal of conflicting auth env vars;
- `app/api/providers/credentials/setup-token/route.ts` for setup-token validation, encrypted storage, stored secret refs, and redacted responses;
- `components/skill-mall/providers/ProviderConfigPanel.tsx` for separate local CLI and setup-token UI surfaces;
- `components/skill-mall/providers/ProviderCenter.tsx` for setup-token save flow and non-token UI state.

## Secret Handling

- No setup-token value is written into provider config.
- The setup-token route returns redacted secret status only.
- Runtime injection is scoped to Claude Code execution through `buildClaudeCodeEnv`.
- Existing `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`, and `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR` env values are cleared before setup-token injection.

## Notes

T007 required the approved UI-wiring amendment recorded in `T007-allowed-file-amendment.md` so the setup-token backend was actually reachable from Provider Center.
