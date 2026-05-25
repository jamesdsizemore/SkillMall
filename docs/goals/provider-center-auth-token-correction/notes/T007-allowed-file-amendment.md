# T007 Allowed File Amendment

Date: 2026-05-21

Decision: approved.

## Amendment

Add these files to T007 allowed files:

- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`

## Reason

T007 owns Claude setup-token storage/runtime behavior. The setup-token field already exists from T006, but without UI wiring it cannot call the new credential route, clear the token after save, or show redacted save status.

## Scope Limit

Only wire Claude setup-token save behavior. Do not change Codex UI behavior or unrelated Provider Center layout.
