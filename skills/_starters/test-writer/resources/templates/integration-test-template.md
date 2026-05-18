# Integration Test Template

Integration tests verify that components work together. Unlike unit tests, they use real dependencies (DB, filesystem, external service) or in-process substitutes.

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, seedTestData } from '../test-helpers/db'

// Integration tests are slower — group them and use a shared DB setup
describe('FeatureName integration', () => {
  let db: Database

  // One-time setup: spin up DB, run migrations
  beforeAll(async () => {
    db = await setupTestDatabase()
  })

  // One-time teardown: drop DB
  afterAll(async () => {
    await teardownTestDatabase(db)
  })

  // Per-test setup: seed clean data
  beforeEach(async () => {
    await db.run('DELETE FROM table_name')
    await seedTestData(db, { /* test fixtures */ })
  })

  // Test a complete user-facing scenario
  it('[scenario]: given [state], when [action], then [outcome]', async () => {
    // Arrange — set up system state
    const fixture = await db.get('SELECT * FROM table_name WHERE id = ?', [1])

    // Act — call the real code path
    const result = await featureFunction(fixture)

    // Assert — verify persisted state, not just return value
    const persisted = await db.get('SELECT * FROM table_name WHERE id = ?', [fixture.id])
    expect(persisted.status).toBe('completed')
    expect(result.id).toBe(fixture.id)
  })

  // Error case — ensure DB is not corrupted on failure
  it('rolls back transaction when [error condition]', async () => {
    // Arrange
    const countBefore = await db.get('SELECT COUNT(*) as n FROM table_name')

    // Act — trigger the error path
    await expect(featureFunction(/* invalid input */)).rejects.toThrow()

    // Assert — DB state is unchanged
    const countAfter = await db.get('SELECT COUNT(*) as n FROM table_name')
    expect(countAfter.n).toBe(countBefore.n)
  })
})
```

## Integration test guidelines

- Use a separate test database (never the dev or production database)
- Run migrations before tests, not in each test file
- Seed only the data each test needs (minimal fixtures)
- Assert on persisted state, not just return values
- Keep integration tests in a separate directory from unit tests
- Do not mock the database in integration tests — that defeats the purpose
