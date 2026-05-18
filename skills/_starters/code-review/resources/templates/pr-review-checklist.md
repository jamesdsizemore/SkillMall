# PR Review Checklist

**PR:** <!-- link -->
**Author:**
**Reviewer:**
**Date:**

---

## Correctness

- [ ] Code does what the PR description says
- [ ] Edge cases handled: empty inputs, null/undefined, concurrent access
- [ ] Error paths return meaningful errors (not just swallowed exceptions)
- [ ] No off-by-one errors in loops or pagination
- [ ] API contracts are not broken (backward compatibility preserved)

## Tests

- [ ] New behavior has tests
- [ ] Tests exercise behavior, not implementation details
- [ ] Tests would catch a regression if the fix were reverted
- [ ] Test names describe the scenario, not the method being called
- [ ] No test-only code in production paths

## Design

- [ ] Change belongs in this layer/component
- [ ] No premature abstraction introduced
- [ ] New dependencies justified and minimal
- [ ] No dead code added
- [ ] Complexity is proportional to the problem

## Readability

- [ ] Function and variable names are honest (no surprises)
- [ ] Comments explain WHY, not WHAT
- [ ] No commented-out code committed
- [ ] Long functions could be broken down (> 30 lines is a signal)
- [ ] Magic numbers extracted to named constants

## Security

- [ ] User input is validated before use
- [ ] No secrets or credentials in code or logs
- [ ] SQL queries use parameterized statements
- [ ] File paths are validated against traversal
- [ ] Authentication/authorization checked on new endpoints

---

**Overall decision:** Approve / Request changes / Comment
**Notes:**
