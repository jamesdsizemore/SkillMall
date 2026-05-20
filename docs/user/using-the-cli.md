# Using the CLI

The SkillMall CLI provides the same research pipeline as the browser wizard, plus catalog management and deployment commands.

```bash
npx skill-mall <command> [options]
```

## configure

Set up the provider reference used by LLM-backed commands.

```bash
# Interactive
npx skill-mall configure

# Local Claude Code session, no API key
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6

# API access through environment variable references
npx skill-mall configure --provider openai --key-env OPENAI_API_KEY --model gpt-4o
npx skill-mall configure --provider groq --key-env GROQ_API_KEY --model llama-3.3-70b-versatile
```

`configure` writes to `~/.skill-mall/config.json`. It stores the provider, model, auth mode, gateway backend, and secret reference name. It does not store raw API keys.

## create

Research a topic and write the extracted tools to `research-result.json` for review.

```bash
npx skill-mall create "blue ocean strategy" \
  --urls https://blueoceanstrategy.com/tools/ \
  --category business

npx skill-mall create "okr framework" --category productivity
```

## confirm-research

Read `research-result.json`, run the full pipeline, and write the skill to `skills/`.

```bash
npx skill-mall confirm-research blue-ocean-strategy
```

## validate

```bash
npx skill-mall validate
npx skill-mall validate skills/business/my-skill
npx skill-mall validate --strict
```

## list

```bash
npx skill-mall list
npx skill-mall list --cat business
```

## deploy

```bash
npx skill-mall deploy business/blue-ocean-strategy
npx skill-mall deploy business/blue-ocean-strategy cursor
```

## new

```bash
npx skill-mall new development my-skill-name
```
