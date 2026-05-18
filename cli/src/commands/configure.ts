import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as p from "@clack/prompts";
import { pc } from "../utils.js";

interface ConfigureArgs {
  provider?: string;
  key?: string;
  model?: string;
}

function parseArgs(args: string[]): ConfigureArgs {
  const result: ConfigureArgs = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--provider" && args[i + 1]) result.provider = args[++i];
    else if (args[i] === "--key" && args[i + 1]) result.key = args[++i];
    else if (args[i] === "--model" && args[i + 1]) result.model = args[++i];
  }
  return result;
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  "claude-code": "claude-sonnet-4-6",
  gemini: "gemini-2.0-flash-exp",
  groq: "llama-3.3-70b-versatile",
  ollama: "llama3.1",
};

const REQUIRES_KEY = new Set(["openai", "gemini", "groq"]);

export async function configureCommand(args: string[]): Promise<void> {
  const flags = parseArgs(args);

  // Non-interactive mode
  if (flags.provider) {
    const configDir = path.join(os.homedir(), ".skill-mall");
    fs.mkdirSync(configDir, { recursive: true });

    const configPath = path.join(configDir, "config.json");
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      // No existing config
    }

    const config = {
      ...existing,
      provider: flags.provider,
      ...(flags.key ? { apiKey: flags.key } : {}),
      model: flags.model ?? DEFAULT_MODELS[flags.provider] ?? "default",
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

    console.log(
      pc.green("  Configured: ") +
        `${flags.provider} / ${config.model}` +
        (config.apiKey ? " (API key set)" : "")
    );
    return;
  }

  // Interactive mode
  console.log();
  p.intro(pc.bold("  skill-mall configure"));

  const provider = await p.select({
    message: "Select LLM provider:",
    options: [
      { value: "openai", label: "OpenAI (gpt-4o)", hint: "API key required" },
      { value: "claude-code", label: "Claude Code CLI", hint: "No API key — uses existing auth" },
      { value: "gemini", label: "Google Gemini", hint: "API key required" },
      { value: "groq", label: "Groq", hint: "API key required — fast and cheap" },
      { value: "ollama", label: "Ollama (local)", hint: "No API key — requires ollama running" },
    ],
  });

  if (p.isCancel(provider)) { p.cancel("Cancelled."); process.exit(0); }

  let apiKey: string | undefined;
  if (REQUIRES_KEY.has(String(provider))) {
    const keyInput = await p.password({
      message: "API key:",
      validate: (v) => (!v ? "API key is required for this provider" : undefined),
    });
    if (p.isCancel(keyInput)) { p.cancel("Cancelled."); process.exit(0); }
    apiKey = String(keyInput);
  }

  const defaultModel = DEFAULT_MODELS[String(provider)] ?? "";
  const modelInput = await p.text({
    message: "Model:",
    initialValue: defaultModel,
    placeholder: defaultModel,
  });
  if (p.isCancel(modelInput)) { p.cancel("Cancelled."); process.exit(0); }

  const configDir = path.join(os.homedir(), ".skill-mall");
  fs.mkdirSync(configDir, { recursive: true });
  const configPath = path.join(configDir, "config.json");

  const config: Record<string, unknown> = {
    provider: String(provider),
    model: String(modelInput) || defaultModel,
  };
  if (apiKey) config.apiKey = apiKey;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

  p.outro(pc.bold(pc.green("  Provider configured.")));
  console.log(`  Config saved to: ${configPath}`);
  console.log();
}
