# T008 - Docs Receipt

## Decision

Pass.

## Summary

Updated Provider Center docs to describe the corrected auth contract:

- OpenAI Codex uses `codex_app_server` and renders app-server session objects with `authUrl` or `verificationUrl` plus `userCode`.
- Claude Code supports separate `local_cli_session` and `claude_setup_token` paths.
- Setup-token storage uses an app-managed encrypted stored provider secret ref and is separate from `ANTHROPIC_API_KEY`.
- API keys, provider account auth, local CLI auth, setup-tokens, gateway virtual keys, and local runtime auth remain separate concepts.
- Docs explicitly reject browser/session tokens, cookies, credential-file contents, and prompt/response provider-test payloads.

## Changed Files

- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`
- `docs/reference/provider-catalog.md`

## Verification

```bash
rg -n "Codex app-server|authUrl|verificationUrl|userCode|Claude Code|setup-token|local CLI|API key|redacted|cookie|session blob|credential file" docs/user docs/reference
```

Result: pass. The approved docs now contain the corrected Codex app-server, Claude setup-token/local CLI, API-key separation, redaction, and unsafe credential-flow language.

```bash
rg -n "prompt\?: string|ignored for storage|browser/session tokens|cookies|credential-file contents|setup-token is an Anthropic API key|setup-token.*API key|auth is complete" docs/user/configuring-providers.md docs/reference/api-routes.md docs/reference/provider-catalog.md
```

Result: pass for the T008 scope. The old `POST /api/providers/test` prompt field is gone, and the remaining credential/token references are warnings or explicit rejection language.
