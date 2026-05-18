---
name: test-writer
description: "Write unit and integration tests using AAA pattern: Arrange, Act, Assert. Based on Martin Fowler's testing pyramid."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: development
  tags: "testing, unit-tests, tdd, vitest, jest, quality"
---

# Test Writer

Write tests that document behavior, catch regressions, and run fast. Based on Martin Fowler's testing principles: test behavior not implementation, use the testing pyramid, keep tests independent.

## When to use

- Writing tests for a new feature before or alongside implementation (TDD)
- Adding tests to existing untested code
- Reviewing a PR that is missing test coverage
- Writing a test to reproduce a bug before fixing it

## Test framework

Your team's test framework: [FILL-IN: test-framework]

## The testing pyramid

- **Unit tests** (many, fast): test a single function or class in isolation. Mock dependencies. Run in milliseconds.
- **Integration tests** (some): test how components work together. May use a real DB or external service. Run in seconds.
- **E2E tests** (few, slow): test the full user flow from UI to database. Run in minutes. Only for critical paths.

## AAA pattern

Every test has three sections separated by blank lines:

```
// Arrange — set up the system under test
// Act — call the function or trigger the behavior
// Assert — verify the expected outcome
```

Never combine Arrange and Act in the same line. Never assert on things you did not act on.

## Test naming

Use behavior-oriented names: `it("returns 404 when skill slug is not found")` not `it("tests getSkill")`.

Complete the sentence: "It should [behavior] when [condition]."

## Coverage threshold

Your team's minimum coverage: [FILL-IN: coverage-threshold]

Coverage is a floor, not a goal. 100% coverage with weak assertions is worthless. 80% coverage with strong assertions catches real bugs.

## What to test

Test public behavior: the observable output or side effect of calling a function. Do not test private implementation details — those tests break when you refactor.

Test edge cases: empty inputs, null, zero, very large inputs, concurrent access. The happy path is the least likely to have bugs.

## Test isolation

Each test must be independent. No shared mutable state between tests. Clean up DB rows, mocks, and file system changes in afterEach. A test that fails when run alone but passes in a suite is a hidden dependency.
