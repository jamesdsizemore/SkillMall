# Collection Format

Skill collections are curated bundles of related skills with a recommended deployment sequence. They are stored as `collection.json` files in the `collections/` directory and deployable with a single CLI command.

## File Location

```
collections/
  <collection-slug>/
    collection.json
```

The slug must be kebab-case and unique across all collections.

## collection.json Schema

```typescript
interface Collection {
  name: string           // Human-readable collection name
  slug: string           // Kebab-case unique identifier
  description: string    // One-sentence description
  author: string         // GitHub username of collection maintainer
  skills: CollectionSkill[]
}

interface CollectionSkill {
  slug: string           // 'category/skill-name' format
  order: number          // Deployment order (ascending)
  note: string | null    // Installation note shown during deploy (null if none)
}
```

## Example

```json
{
  "name": "Full-Stack Developer Kit",
  "slug": "full-stack-developer-kit",
  "description": "Essential skills for full-stack development workflows. Install in listed order.",
  "author": "skill-mall-core",
  "skills": [
    {
      "slug": "ai/skill-creator",
      "order": 1,
      "note": "Install first — creates new skills for the other tools you use"
    },
    {
      "slug": "productivity/development-workflow",
      "order": 2,
      "note": "Enforces 16-step quality loop on every implementation task"
    },
    {
      "slug": "productivity/phased-implementation-plan",
      "order": 3,
      "note": null
    }
  ]
}
```

## Validation Rules

Run `npx skill-mall validate` to check all collections:

- `name` is required (non-empty string)
- `slug` must be kebab-case (`/^[a-z0-9-]+$/`)
- `skills` must contain at least 1 item
- Every `skill.slug` must reference a skill that exists in the `skills/` directory
  - Slug can be `category/skill-name` (preferred) or just `skill-name` (searched across all categories)

**A broken skill slug in a collection blocks deployment of the entire pack.** The deploy command reports which slugs are missing before starting.

## Deploying a Collection

```bash
# Deploy to Claude Code (default)
npx skill-mall deploy-pack full-stack-developer-kit

# Deploy to a specific agent
npx skill-mall deploy-pack full-stack-developer-kit --agent cursor

# Available agents: claude-code, cursor, codex, gemini-cli, agents
```

Skills are deployed in ascending `order` sequence. Each skill's `note` is printed during deployment.

**Output:**
```
┌    skill-mall deploy-pack: Full-Stack Developer Kit
  Target: claude-code → /Users/you/.claude/skills

  ✓ skill-creator → deployed (Install first — creates new skills for the other tools you use)
  ✓ development-workflow → deployed (Enforces 16-step quality loop on every implementation task)
  ✓ phased-implementation-plan → deployed

└    3 skill(s) deployed to claude-code.
```

If a skill is not found in the catalog, it is marked as failed but the deploy continues for the remaining skills.

## Included Starter Collections

| Collection | Slug | Skills |
|---|---|---|
| Full-Stack Developer Kit | `full-stack-developer-kit` | skill-creator, development-workflow, phased-implementation-plan |
| Strategic Business Pack | `strategic-business-pack` | skill-creator, phased-implementation-plan |
| Documentation Suite | `documentation-suite` | skill-creator, development-workflow |

## Contributing a Collection

Open a PR adding a new `collections/<slug>/collection.json`. The CI validation action checks that all referenced skill slugs exist in the catalog. A PR with a missing slug is blocked from merging.

Community collections can reference any skill in the catalog, including skills not part of the core team.

## Implementation

Collections are loaded at runtime by `lib/collections.ts`. They are not baked into the build — adding or editing a `collection.json` file takes effect immediately without rebuilding.

```typescript
import { getAllCollections, getCollection, validateCollection } from '@/lib/collections'

// Get all collections
const all = getAllCollections()

// Get a specific collection
const kit = getCollection('full-stack-developer-kit')

// Validate a collection against the catalog
const errors = validateCollection(kit, new Set(allSkillSlugs))
```
