# T006 Allowed File Amendment

Date: 2026-05-21

Decision: approved.

## Amendment

Add `components/skill-mall/providers/ProviderCatalogList.tsx` to T006 allowed files.

## Reason

T004 added a new `provider_account_auth` access mode and `openai_codex` provider row. `ProviderCatalogList.tsx` owns catalog grouping and access-mode labels. Without a small update there, the OpenAI Codex row can exist in API data but fail to appear in the Provider Center sidebar.

## Scope Limit

Only update grouping/label behavior for `provider_account_auth`. Do not make broader catalog UI changes in this task.
