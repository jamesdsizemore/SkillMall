# Breaking Change PR Template

> Use this template when the PR removes, renames, or incompatibly changes a public interface.

## BREAKING CHANGE

**What is breaking:**
<!-- One sentence: "Removes the `--legacy` flag from the CLI" or "Renames the `user_id` column to `account_id`" -->

**Who is affected:**
<!-- Which consumers need to update? Teams, services, external users? -->

**Migration path:**
<!-- Step-by-step: what they need to change and how. Include code examples. -->

Before:
```
<!-- old usage -->
```

After:
```
<!-- new usage -->
```

## Why this breaking change is necessary

<!-- Explain the tradeoff. Why is the cost of breaking worth the benefit? -->

## Deprecation notice

<!-- Was this change preceded by a deprecation warning? If yes, link to it. If no, explain why not. -->

## Rollback plan

<!-- If this needs to be reverted, what are the steps? Are there data migration concerns? -->

---

## Standard PR fields

### What changed

### Why

### How to test

### Checklist

- [ ] Breaking change documented in CHANGELOG.md
- [ ] Deprecation notice added in previous release (or documented above)
- [ ] Downstream consumers notified
- [ ] Migration guide written above
- [ ] Rollback plan documented
