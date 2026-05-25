# Provider Center Auth Token Correction Goal

Follow `docs/recovery/2026-05-21-provider-center-auth-token-correction-implementation-plan.md`.

## Owner Outcome

Provider Center treats OpenAI Codex and Claude Code auth as real, first-class setup objects instead of fake local CLI side effects. OpenAI Codex must render the Codex app-server auth URL or device-code object in the UI. Claude Code must honestly support local CLI login and setup-token configuration without pretending those are the same as Codex app-server browser auth.

## Completion Oracle

The goal is complete only when:

- dirty state and branch/worktree authority are recorded before implementation;
- current source, corrected research, OpenClaw reference code, Codex app-server generated protocol, local Codex CLI, local Claude CLI, and relevant Next.js docs are revalidated;
- a Judge-approved auth contract exists before Worker code edits;
- OpenAI Codex auth uses Codex app-server as the primary path and renders `authUrl` or `verificationUrl` plus `userCode` in Provider Center;
- Codex completion is tied to app-server `loginId` completion notification or an explicitly approved equivalent, not blind `codex login status` polling;
- Claude Code is split into honest local CLI login and setup-token paths unless new evidence proves a true web auth object exists;
- setup-token, API key, local account auth, and gateway/env references remain separate auth concepts;
- raw tokens, cookies, credential-file contents, browser-session blobs, prompt bodies, and response bodies are never returned in UI/API/log/doc/test/receipt output;
- focused and broad verification commands are run or blocked with exact evidence;
- browser proof captures the actual OpenAI Codex auth object rendering and the honest Claude Code behavior;
- code review findings are fixed or documented with exact non-blocking rationale;
- final GoalBuddy receipt has `decision: complete`;
- incomplete work, blockers, changed files, and next safe action are documented.

## Hard Constraints

- Do not implement until the user explicitly approves by running this goal.
- Do not continue from assumptions. Revalidate the corrected research and current source first.
- Do not use direct OpenClaw-style OpenAI device-code endpoints unless Codex app-server is blocked and the user explicitly approves the fallback.
- Do not collapse OpenAI API-key access, ChatGPT/Codex account auth, Claude setup-token, Claude local login, and Anthropic API-key access into one token field.
- Do not scrape browser sessions, copy credential files, ask users for cookies, or ask users to paste copied browser/session tokens.
- Do not claim completion from CLI status checks alone.
- Do not stage, commit, push, or open a PR without explicit user approval.

## Starter Command

```bash
/goal Follow docs/goals/provider-center-auth-token-correction/goal.md.
```
