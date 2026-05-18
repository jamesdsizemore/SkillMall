# PR Description Template

## What changed

<!-- 1-3 sentences summarizing what this PR does. Link the issue: Fixes #123 -->

## Why

<!-- Why is this change necessary? What problem does it solve? What would happen without it? -->

## How to test

<!-- Step-by-step verification. Be specific. -->

1. Checkout this branch: `git checkout <branch-name>`
2.
3.
4. Expected result:

For backend changes, include a curl example:
```bash
curl -X POST http://localhost:3000/api/... \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

## Screenshots / recordings

<!-- For UI changes: before and after. For CLI changes: terminal output. Delete if not applicable. -->

| Before | After |
|--------|-------|
|        |       |

## Checklist

- [ ] Tests added or updated
- [ ] Documentation updated
- [ ] No secrets or credentials in the diff
- [ ] DB migration included (if schema changed)
- [ ] Reviewed my own diff before opening
