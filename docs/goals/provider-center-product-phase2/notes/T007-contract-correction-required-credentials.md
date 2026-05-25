# T007 Contract Correction - Required LLM Credentials

Decision: block verification until the Phase 2 implementation is aligned to the corrected product contract.

## User Correction

SkillMall is a skill creator. Provider/auth/router work exists so SkillMall can call LLMs while creating, revising, analyzing, packaging, and validating skills.

Credential configuration is a required product capability, not optional future work and not something to avoid.

## Correct Requirement

- API access is a first-class/default setup path for API-backed providers.
- SkillMall must be able to configure and use provider credentials from the app.
- Credential values may enter through clearly labeled credential setup fields, such as API access.
- Credentials must be stored through encrypted local/app-managed storage or another approved secure storage mechanism.
- Saved credential values must never be returned to the browser, API responses, logs, docs, tests, screenshots, or GoalBuddy receipts.
- The UI/API must support replace/rotate and delete/revoke-from-SkillMall behavior.
- Environment-variable references remain an advanced/developer setup path, not the only supported credential path.

## Forbidden Boundary

- Do not scrape browser sessions.
- Do not silently copy credential files.
- Do not ask users to paste random browser/session blobs, cookies, copied browser tokens, credential-file contents, or credential-file paths.
- Do not store credentials in plaintext config files or prompt/response proof artifacts.

## Immediate Impact

The original T003 setup contract is superseded. T007 verification cannot be completed against the old implementation because the old implementation lacks the required in-app credential setup path.

Next safe action: update implementation to the corrected credential lifecycle contract, then rerun focused tests, broad tests, lint, typecheck, browser proof, secret scan, and semantic review.
