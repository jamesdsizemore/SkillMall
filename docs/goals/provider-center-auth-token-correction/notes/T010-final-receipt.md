# T010 - Final Receipt

## Decision

Complete.

## Summary

Provider Center now treats OpenAI Codex and Claude Code auth as first-class setup objects instead of fake local CLI side effects.

- OpenAI Codex uses Codex app-server auth and renders the returned session object with `verificationUrl`, `userCode`, `loginId`, `flowId`, status, and expiry.
- The Codex app-server stdio transport now performs the required `initialize` request and `initialized` notification before account auth methods. Browser proof found this live blocker and the fix was verified against the running app.
- Claude Code exposes honest `local_cli_session` and `claude_setup_token` paths. Setup-token storage uses the app-managed encrypted provider secret store and runtime-only `CLAUDE_CODE_OAUTH_TOKEN` injection.
- API keys, Codex account auth, Claude local login, Claude setup-token, gateway virtual keys, and local runtime auth remain separate concepts.

## Browser Proof

Artifacts:

- `docs/goals/provider-center-auth-token-correction/notes/browser-proof/browser-proof.json`
- `docs/goals/provider-center-auth-token-correction/notes/browser-proof/desktop-codex-selected.png`
- `docs/goals/provider-center-auth-token-correction/notes/browser-proof/desktop-codex-auth-object.png`
- `docs/goals/provider-center-auth-token-correction/notes/browser-proof/desktop-claude-auth-paths.png`
- `docs/goals/provider-center-auth-token-correction/notes/browser-proof/mobile-codex-selected.png`
- `docs/goals/provider-center-auth-token-correction/notes/browser-proof/mobile-codex-auth-object.png`
- `docs/goals/provider-center-auth-token-correction/notes/browser-proof/mobile-claude-auth-paths.png`

Result:

- desktop Codex proof: `verificationUrl`, `userCode`, and `loginId` rendered; no token-shaped text rendered.
- mobile Codex proof: `verificationUrl`, `userCode`, and `loginId` rendered; no token-shaped text rendered.
- desktop Claude proof: `CLAUDE CODE AUTH PATHS`, `LOCAL CLI LOGIN`, and `CLAUDE SETUP-TOKEN` rendered; no false Claude web-auth claim.
- mobile Claude proof: `CLAUDE CODE AUTH PATHS`, `LOCAL CLI LOGIN`, and `CLAUDE SETUP-TOKEN` rendered; no false Claude web-auth claim.

## Verification

```bash
npm test -- components/skill-mall/providers
```

Result: pass. `1 passed (1)` test file, `10 passed (10)` tests.

```bash
npm test -- lib/providers app/api/providers
```

Result: pass. `11 passed (11)` test files, `95 passed (95)` tests.

```bash
npm test -- lib/providers app/api/providers lib/llm/router
```

Result: pass. `25 passed (25)` test files, `181 passed (181)` tests.

```bash
npm test -- lib/providers app/api/providers components/skill-mall/providers lib/llm/router
```

Result: pass. `26 passed (26)` test files, `191 passed (191)` tests.

```bash
npm test
```

Result: pass. `58 passed (58)` test files, `444 passed (444)` tests.

```bash
npx tsc --noEmit --pretty false
```

Result: pass.

```bash
npm run lint
```

Result: pass with no warnings after the polling-effect dependency fix.

```bash
git diff --check
```

Result: pass.

```bash
rg -n "sk-ant-oat01-[A-Za-z0-9_-]{4,}|sk-[A-Za-z0-9_-]{16,}|accessToken|refreshToken|access_token|refresh_token" docs/goals/provider-center-auth-token-correction/notes/browser-proof
```

Result: pass. No token-shaped text in browser proof artifacts.

```bash
node /Users/jamesdsizemore/.codex/plugins/cache/goalbuddy/goalbuddy/0.3.7/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/provider-center-auth-token-correction/state.yaml
```

Result: pass.

## Secret Scan Note

The broad source scan found only test sentinel field names or fake redaction fixtures such as `refreshToken: 'redacted-refresh-token'` and `refreshToken: 'must-not-store'`. The browser proof artifact scan found no token-shaped text.

## Changed Files From Final-Proof Fixes

- `lib/providers/codex-app-server-auth.ts`
- `app/api/providers/__tests__/providers-route.test.ts`
- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `lib/providers/__tests__/claude-code-auth.test.ts`
- `lib/llm/router/__tests__/request-ledger.test.ts`
- `docs/goals/provider-center-auth-token-correction/notes/browser-proof/*`

## No Remaining Blockers

No high or medium review finding remains open. No final verification blocker remains.
