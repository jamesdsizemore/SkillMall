# Configuring LLM Providers

SkillMall uses your own provider access. Phase 1 stores secret references, not raw secrets: API providers use an environment variable name, Claude Code uses its local CLI session, and Ollama uses no credential.

## Supported Providers

| Provider | Auth mode | Recommended model |
|---|---|---|
| OpenAI API | `env_key` via `OPENAI_API_KEY` | gpt-4o |
| Claude API | `env_key` via `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| Claude Code CLI | `local_cli_session` | claude-sonnet-4-6 |
| Google Gemini | `env_key` via `GEMINI_API_KEY` | gemini-2.0-flash-exp |
| Groq | `env_key` via `GROQ_API_KEY` | llama-3.3-70b-versatile |
| Ollama | `none_local` | llama3.1 |

API access is separate from subscription or tool-session auth. ChatGPT/Codex subscription auth is not OpenAI API access, and Claude account/Max auth is not Anthropic API access. Claude Code CLI auth is local tool-session auth and SkillMall does not copy credential files.

## API Providers

Set the provider-specific API key in your shell or hosting environment, then configure SkillMall to reference that variable:

```bash
export OPENAI_API_KEY="your-openai-api-key"
npx skill-mall configure --provider openai --key-env OPENAI_API_KEY --model gpt-4o
```

```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key"
npx skill-mall configure --provider anthropic --key-env ANTHROPIC_API_KEY --model claude-sonnet-4-20250514
```

```bash
export GEMINI_API_KEY="your-gemini-api-key"
npx skill-mall configure --provider gemini --key-env GEMINI_API_KEY --model gemini-2.0-flash-exp
```

```bash
export GROQ_API_KEY="your-groq-api-key"
npx skill-mall configure --provider groq --key-env GROQ_API_KEY --model llama-3.3-70b-versatile
```

## Claude Code CLI

Claude Code uses your locally authenticated `claude` CLI. SkillMall does not read or store Claude Code credential files.

```bash
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6
```

## Ollama

Ollama runs locally and does not require a credential.

```bash
ollama pull llama3.1
ollama serve
npx skill-mall configure --provider ollama --model llama3.1
```

## Config File

`npx skill-mall configure` writes non-secret configuration to `~/.skill-mall/config.json`.

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "providers": {
    "openai": {
      "model": "gpt-4o",
      "authMode": "env_key",
      "secretRef": { "type": "env", "name": "OPENAI_API_KEY" },
      "gatewayBackend": "direct"
    }
  }
}
```

Legacy `apiKey` fields are ignored by the Phase 1 router config resolver. Use `--key-env` for API access.

## Switching Providers

```bash
npx skill-mall configure --provider groq --key-env GROQ_API_KEY --model llama-3.3-70b-versatile
```

The next pipeline run uses the configured provider. Skills already created are static files and are unaffected.

## Troubleshooting

**No LLM provider configured**: Run `npx skill-mall configure`.

**Missing API environment variable**: Set the provider-specific environment variable named in `secretRef.name`, then restart the process.

**Claude Code CLI times out**: Ensure the `claude` binary is in your PATH and authenticated.

**Ollama not responding**: Ensure `ollama serve` is running. Check with `curl http://localhost:11434/api/version`.
