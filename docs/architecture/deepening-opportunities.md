# Deepening Opportunities

This note preserves the architecture review candidates from the first `improve-codebase-architecture` pass. These are not accepted implementation plans yet; they are candidates to explore through a design conversation.

## 1. Skill Catalog Module

**Files:** `lib/skills.ts`, `cli/src/utils.ts`, `cli/src/commands/mcp-server.ts`, `app/api/mcp/route.ts`

**Problem:** Skill parsing, category walking, slug resolution, tag parsing, and prompt discovery are repeated across web, CLI, and MCP modules. The deletion test says `lib/skills.ts` is only partly earning its keep: deleting it would not force all callers through one place because several callers already reimplement the same behavior.

**Solution:** Deepen the Skill Catalog module into the single pure Node implementation for reading, resolving, searching, and describing SkillMall skills. Keep Next and CLI as adapters.

**Benefits:** Better locality for AgentSkills frontmatter rules, slug rules, and malformed-skill behavior. Tests can exercise the catalog interface once instead of testing route and CLI copies separately.

## 2. Prompt Regeneration Module

**Files:** `app/api/regen-prompt/route.ts`, `cli/src/commands/regen-prompt.ts`, `lib/prompt-engine.ts`

**Problem:** The route and CLI each know how to parse prompt files, extract tool context, build the regeneration prompt, preserve `original_framework`, and write frontmatter. They also use different frontmatter implementations.

**Solution:** Move prompt loading, tool-context extraction, regeneration prompt construction, frontmatter preservation, and write-back into one Prompt Regeneration module. Auth and CLI printing stay outside as adapters.

**Benefits:** More leverage from one test surface: JSON-body prompt files, prose prompt files, malformed frontmatter, path checks, and `original_framework` preservation can all be verified once.

## 3. Skill Creation Pipeline Module

**Files:** `lib/pipeline.ts`, `app/api/confirm-research/route.ts`, `app/api/create-skill/route.ts`, `cli/src/commands/confirm-research.ts`

**Problem:** `runPipeline()` exists, but the real create/confirm flows mostly bypass it and repeat filtering, build, prompt generation, validation, and writing. The module name suggests depth, but callers still carry the ordering rules.

**Solution:** Deepen the pipeline around the actual SkillMall lifecycle: research result in, selected tools/meta prompts in, skill directory preview/write result out. Route and CLI modules should mainly translate input/output.

**Benefits:** Stronger locality for the phase-critical prompt-to-skill behavior. Tests can cover the creation lifecycle through the same interface the UI and CLI use, instead of separately asserting duplicated glue.

## 4. Local Data Store Module

**Files:** `lib/db/client.ts`, `scripts/migrate.js`, `lib/analytics.ts`, `lib/reviews.ts`

**Problem:** Data modules assume schema readiness, while `getDb()` only opens the file and sets PRAGMAs. The migration runner is a separate script. That leaves schema correctness as an ordering fact every caller/environment must remember.

**Solution:** Deepen the Local Data Store module so opening the store also owns schema readiness and migration bookkeeping. Keep the script as an adapter over the same implementation.

**Benefits:** Much better locality for SQLite lifecycle behavior. New tables like `search_clicks` stop depending on manual setup, and tests can verify fresh-store behavior through one interface.

## 5. Skill Deployment Module

**Files:** `lib/agents/detector.ts`, `cli/src/commands/deploy.ts`, `cli/src/commands/deploy-pack.ts`, `app/api/mcp/route.ts`, `components/skill-mall/deploy-button.tsx`

**Problem:** Agent target discovery, project/user scope behavior, skill resolution, collection deployment, copy rules, and command generation are spread across modules. The registry exists, but not all deployment behavior sits behind it.

**Solution:** Deepen deployment into a module that can produce and execute a deployment plan for one Skill or a Collection. CLI, MCP, and UI command-copy flows become adapters over that plan.

**Benefits:** More leverage for adding Agents or changing Deployment Scope semantics. Locality improves because copy behavior, target labels, and unsupported-target errors live in one place.

## 6. Session And Author Policy Module

**Files:** `lib/auth/middleware.ts`, `app/api/reviews/route.ts`, `app/api/feedback/route.ts`, `app/api/improvements/[skillSlug]/route.ts`, `app/api/improvements/[id]/approve/route.ts`

**Problem:** Session lookup and author checks are repeated with different error shapes and slightly different assumptions. This recently mattered around Fork authorship versus Author-only mutation rights.

**Solution:** Deepen auth into a Session and Author Policy module: routes ask for "current session" or "author may mutate this Skill," without re-learning cookie names, response semantics, and author comparison.

**Benefits:** Better locality for mutation permissions. Tests can target policy behavior directly, including Forked Skills, missing Authors, and expired Sessions.
