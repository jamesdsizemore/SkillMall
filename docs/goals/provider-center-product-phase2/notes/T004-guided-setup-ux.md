# T004 Guided Setup UX

Decision: superseded by required-credential correction.

Changed files:

- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`

What changed:

- Added setup-mode explanation for environment-variable references, gateway virtual-key references, local tool/session setup, and local runtime/no-secret setup under the original contract.
- This is now incomplete because API-backed providers must have first-class/default in-app credential setup with secure storage, redaction, replacement/rotation, delete/revoke-from-SkillMall behavior, and runtime use.
- Added setup requirements for reference names, endpoints, local runtime/tool context, cloud/project context, manual model labels, and source-review rows.
- Added readiness preview with ready, warning, and blocked states.
- Added safe order guidance for save, status test, refresh, endpoint, source-review, and project-context cases.
- Added field hints for reference names, endpoints, model labels, manual labels, and local routing-policy id without adding new provider/auth/router behavior.
- Added tests for setup guidance and source-review blocked save behavior.

Verification:

- `npm test -- components/skill-mall/providers` passed: 1 file, 9 tests.
- Provider UI scan must be rerun after the corrected credential setup implementation. The scan should allow approved API/provider credential fields and reject browser/session blob, cookie, credential-file-content, credential-path, prompt-body, and response-body prompts.

Scope check:

- No provider catalog rows changed.
- No `ProviderID` widening.
- No browser-session scraping, silent credential-file copying, random session blob handling, hosted dashboards, or prompt/response handling may be added.
