# Unit Test Template (AAA Pattern)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { functionUnderTest } from '../path/to/module'

// Mock dependencies — only mock what you own or what is slow/external
vi.mock('../path/to/dependency', () => ({
  dependencyFn: vi.fn(),
}))

describe('functionUnderTest', () => {
  // Reset mocks before each test to prevent state leakage
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Happy path
  it('returns [expected output] when [normal condition]', () => {
    // Arrange
    const input = /* minimal valid input */
    const expectedOutput = /* what we expect */

    // Act
    const result = functionUnderTest(input)

    // Assert
    expect(result).toEqual(expectedOutput)
  })

  // Edge case: empty/null input
  it('throws [error] when input is null', () => {
    // Arrange
    const input = null

    // Act + Assert (for throws, combine is acceptable)
    expect(() => functionUnderTest(input)).toThrow('Expected error message')
  })

  // Edge case: boundary value
  it('returns [result] at the boundary of [condition]', () => {
    // Arrange
    const boundaryInput = /* the exact boundary value */

    // Act
    const result = functionUnderTest(boundaryInput)

    // Assert
    expect(result).toBe(/* boundary result */)
  })

  // Mock verification — only assert on mocks when the side effect matters
  it('calls [dependency] once with [args] when [condition]', () => {
    // Arrange
    const { dependencyFn } = await import('../path/to/dependency')

    // Act
    functionUnderTest(/* input */)

    // Assert
    expect(dependencyFn).toHaveBeenCalledOnce()
    expect(dependencyFn).toHaveBeenCalledWith(/* expected args */)
  })
})
```

## Checklist for each test

- [ ] Test name describes behavior and condition, not method name
- [ ] Arrange / Act / Assert separated by blank lines
- [ ] Only one logical assertion per test (multiple `expect` calls on the same result are OK)
- [ ] Mock setup in Arrange, not scattered through the test
- [ ] No `console.log` left in test
- [ ] Test passes in isolation (not dependent on another test running first)
