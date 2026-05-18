# Self-Improvement Loop

The **self-improvement loop** is a three-stage process that collects user feedback on a skill, generates LLM-powered improvement suggestions based on that feedback, and lets the skill author review and approve changes before anything is written to disk.

No automatic changes ever happen. The author's approval is required at every stage.

## Stage 1: Feedback collection

Authenticated users can leave feedback on any skill via the feedback form on the skill detail page. The form appears only when you are signed in and only when you scroll to it — it is never shown automatically.

**Feedback has two fields:**

- **Satisfaction (1-5):** A numeric rating from 1 (not useful) to 5 (excellent)
- **Notes (optional, max 200 chars):** Qualitative feedback about what worked or what could improve

Submit feedback via the skill detail page or the API:

```
POST /api/feedback
{
  "skillSlug": "skill-creator",
  "satisfaction": 4,
  "body": "Great skill, but the trigger phrase is too generic for my use case."
}
```

Requirements:
- Must be authenticated (401 if not)
- `satisfaction` must be 1-5 (400 if out of range)
- `body` must be ≤ 200 characters (400 if longer)

The response includes `analysisTriggered: true` when the submission count reaches 10 or more — this signals that the skill author can now request an improvement suggestion.

## Stage 2: Suggestion generation

Once a skill has 10 or more feedback submissions, the skill author can request an LLM-generated improvement suggestion:

```
POST /api/improvements/<skillSlug>
{
  "category": "ai"
}
```

This endpoint:
1. Reads the 10 most recent feedback submissions with written notes
2. Computes the average satisfaction score
3. Calls the configured LLM provider with a structured analysis prompt
4. Returns a specific, actionable suggestion — not a generic "improve the description" advice

The suggestion is stored in the `improvement_suggestions` table with status `pending`.

Only the skill author can trigger analysis (403 if not the author).

## Stage 3: Review and approval

Navigate to `/skills/<category>/<slug>/improvements` to see all suggestions for your skill. Pending suggestions have **Apply** and **Reject** buttons — visible only to the skill author.

**Rejecting a suggestion:** Marks it as `rejected`. No changes to the skill.

**Applying a suggestion:**
1. Verifies that `session.github_login === skill.author` (403 if not — this check runs before any LLM call)
2. Reads the current SKILL.md
3. Calls the LLM to generate an edited version applying the suggestion
4. Bumps the version in the frontmatter (`patch` bump by default: `1.2.3` → `1.2.4`)
5. Writes the updated SKILL.md to disk
6. Marks the suggestion as `approved` in the database

No file is ever modified without the author explicitly clicking Apply. The system cannot approve its own suggestions.

## Viewing suggestions via API

```
GET /api/improvements/<skillSlug>
```

Returns all suggestions for a skill in descending order. Each suggestion includes its status (`pending`, `approved`, `rejected`), the suggestion text, the feedback count at the time of generation, and timestamps.

## Security invariants

These invariants are enforced in code and cannot be bypassed:

1. **Feedback requires authentication.** POST /api/feedback always returns 401 without a valid session cookie.
2. **Analysis requires authorship.** Only the skill author can request a suggestion.
3. **Application requires authorship.** The apply endpoint checks `session.github_login === skill.author` before any LLM call. A mismatch returns 403 immediately — no LLM call, no disk write.
4. **No automatic writes.** There is no scheduled task or background job that applies suggestions. Every write requires an explicit author action.

## Version bumping

`bumpVersion(version, bump)` produces:

| Input | Bump | Output |
|-------|------|--------|
| `1.2.3` | `patch` | `1.2.4` |
| `1.2.3` | `minor` | `1.3.0` |
| `1.2.3` | `major` | `2.0.0` |

Patch bump is the default for self-improvement changes. The author can change this behavior by editing the SKILL.md directly after applying a suggestion.
