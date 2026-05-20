# SkillMall Context

SkillMall is a local-first catalog and generation platform for AI agent skills. This context names the domain concepts used across the web app, CLI, MCP surface, and local repository workflows.

## Language

### Skill Catalog

**Skill**:
A reusable AI agent instruction package stored as a directory containing `SKILL.md` and optional resources.
_Avoid_: Plugin, prompt, package

**Skill Catalog**:
The browsable and machine-readable set of Skills found under `skills/`.
_Avoid_: Marketplace, registry

**Skill Directory**:
The filesystem directory for one Skill, rooted at `skills/<category>/<slug>/`.
_Avoid_: Package folder, project folder

**SKILL.md**:
The canonical instruction file an AgentSkills-compatible agent reads when a Skill is invoked.
_Avoid_: Prompt file, README

**Skill Metadata**:
The frontmatter fields that describe a Skill for catalog display, deploy, ownership, and validation.
_Avoid_: Config, manifest

**Category**:
The first-level catalog grouping for Skills, such as `development`, `business`, or `ai`.
_Avoid_: Namespace, folder type

**Slug**:
The kebab-case stable identifier for a Skill inside a Category.
_Avoid_: Name, title

**Linked Skill**:
A Skill referenced by another Skill as a useful companion.
_Avoid_: Dependency

**Collection**:
A curated deployable bundle of Skills with an intended order.
_Avoid_: Pack, playlist

### Skill Generation

**Research Engine**:
The pipeline stage that turns a topic and optional sources into a Research Result.
_Avoid_: Scraper, crawler

**Research Result**:
The reviewed intermediate artifact containing extracted tools, principles, sources, tags, and suggested category.
_Avoid_: Draft skill, generated data

**Research Tool**:
A structured method extracted from source material that can produce a specific artifact.
_Avoid_: Function, utility

**Skill Builder**:
The pipeline stage that turns a Research Result into `SKILL.md`, `README.md`, templates, samples, and scripts.
_Avoid_: Generator

**Prompt Engine**:
The pipeline stage that creates framework-selected prompt files for a generated Skill.
_Avoid_: Prompt writer

**Prompt File**:
A Markdown file under `resources/prompts/` with frontmatter and a self-contained agent prompt body.
_Avoid_: Template, tool file

**Prompt Regeneration**:
The workflow that rewrites a Prompt File using a different reasoning framework while preserving its original intent and metadata.
_Avoid_: Prompt edit, optimization

**Validation**:
The structural check that a generated Skill satisfies the required SkillMall shape before it is written.
_Avoid_: QA, lint

### Distribution And Runtime Surfaces

**Agent**:
An external AI coding or assistant tool that can consume deployed Skills.
_Avoid_: Client, app

**AgentSkills-compatible Agent**:
An Agent that reads file-based Skills in a compatible directory layout.
_Avoid_: Supported integration

**Deployment**:
The act of copying a Skill Directory into an Agent's skills directory.
_Avoid_: Install, publish

**Deployment Scope**:
Whether Deployment targets a user's home directory or the current project.
_Avoid_: Environment

**MCP Surface**:
The JSON-RPC tool surface that exposes the Skill Catalog to agents.
_Avoid_: MCP API, server API

**CLI Surface**:
The `npx skill-mall` command interface for creating, confirming, deploying, testing, and publishing Skills.
_Avoid_: Console app

**Web Surface**:
The Next.js interface for browsing, creating, reviewing, forking, and improving Skills.
_Avoid_: Frontend

### Community And Persistence

**Local Data Store**:
The SQLite database under `data/` that stores sessions, reviews, events, feedback, purchases, and RAG metadata.
_Avoid_: Backend, cloud database

**Session**:
A GitHub-authenticated local record that identifies the current user.
_Avoid_: Account, user profile

**Author**:
The GitHub login recorded as the owner of a Skill.
_Avoid_: Owner, maintainer

**Review**:
A public rating and comment for a Skill from an authenticated Session.
_Avoid_: Feedback

**Feedback**:
A private improvement signal for a Skill that can generate Improvement Suggestions.
_Avoid_: Review

**Improvement Suggestion**:
An LLM-generated proposed change to a Skill based on Feedback.
_Avoid_: Patch, recommendation

**Install Event**:
A zero-PII analytics record that a Skill was deployed to an Agent type.
_Avoid_: Download, install

**Search Click**:
A zero-PII analytics record that a search result was clicked.
_Avoid_: Install signal

**Fork**:
A local copy of a Skill Directory that preserves source lineage and can be edited independently.
_Avoid_: GitHub fork, clone

## Relationships

- A **Skill Catalog** contains many **Skills**.
- A **Skill** belongs to exactly one **Category** and has one **Slug**.
- A **Skill** is represented on disk by one **Skill Directory**.
- A **Skill Directory** contains exactly one canonical **SKILL.md**.
- **Skill Metadata** lives in **SKILL.md** frontmatter.
- A **Research Engine** produces one **Research Result**.
- A **Research Result** contains one or more **Research Tools**.
- A **Skill Builder** and **Prompt Engine** consume the same **Research Result**.
- A **Prompt Engine** produces zero or more **Prompt Files**.
- **Prompt Regeneration** mutates one **Prompt File**.
- **Validation** runs before a generated **Skill Directory** is written.
- **Deployment** copies one **Skill Directory** to one or more **Agents**.
- A **Collection** contains many ordered **Skills**.
- A **Session** identifies one GitHub login.
- An **Author** may mutate Author-only workflows for their **Skill**.
- A **Review** is visible quality signal; **Feedback** is improvement signal.
- An **Improvement Suggestion** is generated from **Feedback** for one **Skill**.
- **Install Events** and **Search Clicks** are analytics records in the **Local Data Store**.

## Example Dialogue

> **Dev:** "When a user clicks Create in the Web Surface, are we creating a Skill immediately?"
> **Domain expert:** "No. The Research Engine first produces a Research Result. After review, the Skill Builder and Prompt Engine create a Skill Directory, then Validation decides whether it can be written to the Skill Catalog."
>
> **Dev:** "If someone forks a Skill, is that a GitHub fork?"
> **Domain expert:** "No. A Fork is a local Skill Directory copy with lineage metadata. GitHub PRs are a separate contribution workflow."

## Flagged Ambiguities

- "install" is often used casually for **Deployment**. In SkillMall, Deployment means copying a Skill Directory to an Agent; **Install Event** means analytics only.
- "feedback" and "review" are separate signals. A **Review** is public catalog quality data; **Feedback** drives **Improvement Suggestions**.
- "prompt" can mean a **Prompt File** or an arbitrary LLM instruction. Use **Prompt File** for files under `resources/prompts/`.
- "user" can mean a browser visitor, a GitHub-authenticated **Session**, or an **Author**. Use the specific term when permissions matter.
- "MCP server" often refers to either the standalone CLI command or the Next.js route. Use **MCP Surface** when talking about shared catalog behavior across both.
