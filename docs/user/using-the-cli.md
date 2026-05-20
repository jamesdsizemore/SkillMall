# Using the CLI

The SkillMall CLI provides the same research pipeline as the browser wizard, plus catalog management and deployment commands.

```bash
npx skill-mall <command> [options]
```

## configure

Set up the provider reference used by LLM-backed commands. `configure` uses the same provider registry, config store, and secret-reference contract as the Provider Center app settings page.

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

The executable direct/router providers are `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, and `ollama`. Broader Provider Center rows such as `openrouter`, cloud providers, planned-source-review rows, and `custom_openai_compatible` can return metadata/status without widening executable `ProviderID` support.

## providers

Inspect and operate the Provider Center catalog from the CLI.

```bash
npx skill-mall providers list
npx skill-mall providers status
npx skill-mall providers status --provider openrouter
npx skill-mall providers refresh-models --provider openai --key-env OPENAI_API_KEY
npx skill-mall providers refresh-models \
  --provider-registry-id custom_openai_compatible \
  --base-url http://localhost:1234/v1 \
  --manual-models local-a,local-b
npx skill-mall providers test --provider claude-code
```

`providers refresh-models` follows the row's declared discovery strategy and does not assume universal `/v1/models` support. `providers test` performs safe readiness checks without echoing raw secrets, browser tokens, session tokens, credential-file contents, prompts, or responses.

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
