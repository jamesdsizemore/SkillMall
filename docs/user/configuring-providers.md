# Configuring LLM Providers

SkillMall uses your own LLM provider to run the research pipeline. You supply your own API key. SkillMall never stores keys on its servers.

## Supported Providers

| Provider | API Key Required | Recommended Model |
|---|---|---|
| OpenAI | Yes | gpt-4o |
| Claude Code CLI | No | claude-sonnet-4-6 |
| Google Gemini | Yes | gemini-2.0-flash-exp |
| Groq | Yes | llama-3.3-70b-versatile |
| Ollama (local) | No | llama3.1 |

---

## OpenAI

1. Get an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Add to `.env.local` in your SkillMall directory:

```
SKILL_MALL_PROVIDER=openai
SKILL_MALL_API_KEY=sk-...
SKILL_MALL_MODEL=gpt-4o
```

**CLI:**

```bash
npx skill-mall configure --provider openai --key sk-... --model gpt-4o
```

---

## Claude Code CLI

This option uses your existing Claude Code authentication — no API key required. The `claude` CLI binary is invoked as a subprocess. No calls to api.anthropic.com.

**Prerequisites:** Claude Code CLI must be installed and authenticated.

```bash
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6
```

**Web UI:** set in `.env.local`:

```
SKILL_MALL_PROVIDER=claude-code
SKILL_MALL_MODEL=claude-sonnet-4-6
```

Available models: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`

---

## Google Gemini

1. Get an API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Configure:

```
SKILL_MALL_PROVIDER=gemini
SKILL_MALL_API_KEY=AIza...
SKILL_MALL_MODEL=gemini-2.0-flash-exp
```

```bash
npx skill-mall configure --provider gemini --key AIza... --model gemini-2.0-flash-exp
```

---

## Groq

Groq offers fast inference with compatible models.

1. Get an API key at [console.groq.com/keys](https://console.groq.com/keys)
2. Configure:

```
SKILL_MALL_PROVIDER=groq
SKILL_MALL_API_KEY=gsk_...
SKILL_MALL_MODEL=llama-3.3-70b-versatile
```

```bash
npx skill-mall configure --provider groq --key gsk_... --model llama-3.3-70b-versatile
```

---

## Ollama (Local)

Run models locally with no API key and no data leaving your machine.

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3.1`
3. Start the server: `ollama serve`
4. Configure:

```
SKILL_MALL_PROVIDER=ollama
SKILL_MALL_MODEL=llama3.1
```

```bash
npx skill-mall configure --provider ollama --model llama3.1
```

---

## Configuration Resolution Order

The active provider is resolved in this order (first match wins):

1. Environment variables: `SKILL_MALL_PROVIDER`, `SKILL_MALL_API_KEY`, `SKILL_MALL_MODEL`
2. Project `.env.local` (web UI only)
3. Config file: `~/.skill-mall/config.json` (CLI)

**Web UI:** settings at `/settings/providers` write to `.env.local` in development. In production, set environment variables in your hosting dashboard.

**CLI:** `npx skill-mall configure` writes to `~/.skill-mall/config.json`.

---

## Provider Comparison

| Provider | Cost | Speed | Quality | Best for |
|---|---|---|---|---|
| OpenAI gpt-4o | Medium | Fast | Excellent | Production use |
| Claude Code CLI | Free (uses existing subscription) | Medium | Excellent | If you already use Claude |
| Gemini 2.0 Flash | Low | Fast | Good | High-volume generation |
| Groq | Very low | Very fast | Good | Rapid iteration and testing |
| Ollama | Free (local compute) | Variable | Good | Privacy, no cloud dependency |

## Switching Providers

You can switch providers at any time. The next pipeline run uses the currently configured provider. Skills already created are unaffected — they are static files and do not require the same provider that created them.

**Switching via web UI:** `/settings/providers` → select new provider → save.

**Switching via CLI:**

```bash
npx skill-mall configure --provider groq --key gsk_... --model llama-3.3-70b-versatile
```

## Multiple Provider Configs (CLI)

The config file supports multiple provider sections:

```json
{
  "provider": "claude-code",
  "model": "claude-sonnet-4-6",
  "providers": {
    "openai": { "apiKey": "sk-...", "model": "gpt-4o" },
    "claude-code": { "model": "claude-sonnet-4-6" },
    "groq": { "apiKey": "gsk_...", "model": "llama-3.3-70b-versatile" }
  }
}
```

The top-level `provider` field determines which provider is active. The `providers` sections store credentials for quick switching.

## Troubleshooting

**"No LLM provider configured"** — Run `npx skill-mall configure` or add `SKILL_MALL_PROVIDER` to `.env.local`.

**"Missing credentials"** — Your API key is missing or incorrect. Re-run `configure` with the correct `--key` value.

**Claude Code CLI times out** — Ensure the `claude` binary is in your PATH and you are authenticated (`claude auth login`).

**Ollama not responding** — Ensure `ollama serve` is running in a separate terminal. Check with `curl http://localhost:11434/api/version`.

**Gemini returns 403** — Your API key may not have the Gemini API enabled. Check the AI Studio dashboard at the URL listed in `setupInstructions`.

**Research is slow** — The Research Engine makes multiple LLM calls per skill (one research extraction + one sample per tool + one framework selection + one prompt body per tool). A 20-tool domain makes ~60 LLM calls. Groq and Ollama offer faster inference for iteration.
