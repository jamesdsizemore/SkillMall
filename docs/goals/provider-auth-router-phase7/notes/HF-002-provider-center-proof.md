# HF-002 Provider Center Proof

Finding: Provider Center proof was static-render-only and did not have current Phase 7 proof recorded.

Current proof plan:

- Use existing Provider Center regression tests for no raw-secret UI copy, unsupported-mode absence, operation/require-pricing simulation body parity, and distinct actual/estimated cost labels.
- Run focused Provider Center tests during T705.
- Browser walkthrough is optional only if a local dev server starts cleanly and requires no real provider secrets, live provider calls, hosted services, or browser/session tokens.

Verification:

- `npm test -- cli components/skill-mall/providers app/api/providers lib/llm/router lib/providers` passed after T708 fixes: 25 files, 200 tests.
- Existing Provider Center focused tests prove no raw-secret UI copy, unsupported-mode absence, operation/require-pricing simulation body parity, and distinct actual/estimated cost labels.
- Next dev server started cleanly on `http://127.0.0.1:3007` with `npm run dev -- --hostname 127.0.0.1 --port 3007`.
- Unauthenticated `GET /settings/providers` returns an expected 307 redirect to `/api/auth/login`; Provider Center is under the existing settings auth boundary.
- With a temporary local SkillMall app session created in the local SQLite sessions table, `GET /settings/providers` returns HTTP 200 and renders `Provider Center`, `API providers`, and `Cloud / project providers`.
- `GET /api/providers` returns HTTP 200 with 27 provider rows; supported-mode output does not include `cheapest_compatible` or `quality_first`.
- Rendered Provider Center HTML scan found no unsafe raw-key/raw-token/session-cookie/browser-cookie/credential-path/credential-file/unsupported-mode hits.
- The Browser MCP navigate/click tools were not exposed in this session, so the no-secret walkthrough proof used the clean dev server plus authenticated route/API fetches instead of an interactive browser click path.
