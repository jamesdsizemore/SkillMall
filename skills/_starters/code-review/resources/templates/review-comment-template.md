# Review Comment Template

Use this structure for writing review comments that are clear, actionable, and non-defensive.

---

## Comment format

**Severity:** `nit` / `blocker` / `suggestion` / `question`

**Location:** `path/to/file.ts:42` or `function getUserData()`

**Issue:**
<!-- What is wrong or unclear? Be specific about the line or block. -->

**Why it matters:**
<!-- Why does this matter? What goes wrong if left as-is? -->

**Suggested fix:**
<!-- Concrete suggestion. Code snippet if helpful. -->

---

## Examples

### Blocker comment

**Severity:** blocker
**Location:** `lib/auth.ts:87`
**Issue:** `bcrypt.compare()` is called without awaiting the result. The comparison always returns a Promise (truthy), so authentication always succeeds regardless of password.
**Why it matters:** Critical security bug — any password will be accepted.
**Suggested fix:**
```typescript
const match = await bcrypt.compare(password, hash)
if (!match) return res.status(401).json({ error: 'Invalid credentials' })
```

### Nit comment

**Severity:** nit
**Location:** `components/UserCard.tsx:23`
**Issue:** `data` is too generic for a variable that holds a user profile.
**Why it matters:** Readability — unclear what `data` refers to when scanning the file.
**Suggested fix:** Rename to `userProfile` or `profile`.

### Question (not blocking)

**Severity:** question
**Location:** `lib/cache.ts:61`
**Issue:** Cache TTL is hardcoded to 300 seconds. Is this intentional?
**Why it matters:** Might want this configurable per-environment.
**Suggested fix:** Consider `process.env.CACHE_TTL_SECONDS ?? 300`.
