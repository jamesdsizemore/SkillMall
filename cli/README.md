# skill-mall CLI

The SkillMall CLI lets you browse, deploy, and create Claude Code skills from the terminal.

## Quick start

```
npx skill-mall
```

## Commands

### list

List all skills in the catalog, optionally filtered by category.

```
npx skill-mall list
npx skill-mall list --cat development
```

### find

Search skills.sh for related skills.

```
npx skill-mall find "commit messages"
npx skill-mall find "code review"
```

### deploy

Copy a skill from the catalog to `~/.claude/skills/`.

```
npx skill-mall deploy ai/skill-creator
npx skill-mall deploy development/my-skill
```

### new

Scaffold a new skill from the template.

```
npx skill-mall new development my-new-skill
npx skill-mall new writing essay-outliner
```

### validate

Check SKILL.md files for frontmatter character limit compliance.

```
npx skill-mall validate
npx skill-mall validate skills/ai/skill-creator/SKILL.md
```

Exits with code 1 if any errors are found.

### create

The flagship command. Searches skills.sh for related skills, then interactively scaffolds a new skill.

```
npx skill-mall create "write conventional commit messages"
npx skill-mall create "analyze code complexity"
```

## Character limits

| Field | Limit | Notes |
|---|---|---|
| `name` | 64 chars | Lowercase letters, numbers, hyphens only |
| `description` | 150 chars | Front-load the trigger phrase |
| `when_to_use` | 150 chars | Combined with description in Claude Code listing |

## Development

```
cd cli
npm install
npm run dev -- list
npm run build
```
