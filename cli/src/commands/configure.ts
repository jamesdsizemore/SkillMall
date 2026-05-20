import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as p from "@clack/prompts";
import { pc } from "../utils.js";

interface ConfigureArgs {
  provider?: string;
  key?: string;
  keyEnv?: string;
  model?: string;
  gatewayBackend?: string;
  baseURL?: string;
  routingPolicyId?: string;
}

function parseArgs(args: string[]): ConfigureArgs {
  const result: ConfigureArgs = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--provider" && args[i + 1]) result.provider = args[++i];
    else if (args[i] === "--key" && args[i + 1]) result.key = args[++i];
    else if (args[i] === "--key-env" && args[i + 1]) result.keyEnv = args[++i];
    else if (args[i] === "--model" && args[i + 1]) result.model = args[++i];
    else if (args[i] === "--gateway-backend" && args[i + 1]) result.gatewayBackend = args[++i];
    else if (args[i] === "--base-url" && args[i + 1]) result.baseURL = args[++i];
    else if (args[i] === "--routing-policy" && args[i + 1]) result.routingPolicyId = args[++i];
  }
  return result;
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-5.1",
  anthropic: "claude-sonnet-4-20250514",
  "claude-code": "claude-sonnet-4-6",
  gemini: "gemini-2.0-flash-exp",
  groq: "llama-3.3-70b-versatile",
  ollama: "llama3.1",
};

const REQUIRES_KEY = new Set(["openai", "anthropic", "gemini", "groq"]);
const ENV_BY_PROVIDER: Record<string, string | undefined> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

function authConfigForProvider(
  provider: string,
  keyEnv?: string,
  gatewayBackend?: string
): Record<string, unknown> {
  if (gatewayBackend === "bifrost_local") {
    return {
      authMode: "gateway_virtual_key",
      secretRef: { type: "gateway_virtual_key_ref", name: keyEnv || "BIFROST_VIRTUAL_KEY" },
    };
  }
  if (provider === "claude-code") return { authMode: "local_cli_session", secretRef: { type: "none" } };
  if (provider === "ollama") return { authMode: "none_local", secretRef: { type: "none" } };
  return {
    authMode: "env_key",
    secretRef: { type: "env", name: keyEnv || ENV_BY_PROVIDER[provider] || "PROVIDER_API_KEY" },
  };
}

function assertLocalBifrostBaseURL(value: string | undefined): void {
  if (!value) return;
  const parsed = new URL(value);
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
    throw new Error("bifrost_local baseURL must point to localhost, 127.0.0.1, or ::1");
  }
}

export async function configureCommand(args: string[]): Promise<void> {
  const flags = parseArgs(args);

  // Non-interactive mode
  if (flags.provider) {
    if (flags.key) {
      console.error(pc.red("  Refusing to write raw API keys. Use --key-env ENV_VAR_NAME instead."));
      process.exitCode = 1;
      return;
    }

    const configDir = path.join(os.homedir(), ".skill-mall");
    fs.mkdirSync(configDir, { recursive: true });

    const configPath = path.join(configDir, "config.json");
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      // No existing config
    }

    const providerConfig: Record<string, unknown> = {
      ...((existing.providers as Record<string, Record<string, unknown>> | undefined)?.[flags.provider] ?? {}),
      model: flags.model ?? DEFAULT_MODELS[flags.provider] ?? "default",
      gatewayBackend: flags.gatewayBackend ?? "direct",
      ...authConfigForProvider(flags.provider, flags.keyEnv, flags.gatewayBackend),
    };
    try {
      if (providerConfig.gatewayBackend === "bifrost_local") assertLocalBifrostBaseURL(flags.baseURL);
    } catch (error) {
      console.error(pc.red(`  ${error instanceof Error ? error.message : "Invalid gateway base URL"}`));
      process.exitCode = 1;
      return;
    }
    if (flags.baseURL) providerConfig.baseURL = flags.baseURL;
    if (flags.routingPolicyId) providerConfig.routingPolicyId = flags.routingPolicyId;
    delete providerConfig["apiKey"];

    const providers = {
      ...((existing.providers as Record<string, unknown> | undefined) ?? {}),
      [flags.provider]: providerConfig,
    };

    const config = {
      ...existing,
      provider: flags.provider,
      providers,
      model: flags.model ?? DEFAULT_MODELS[flags.provider] ?? "default",
    };
    delete (config as Record<string, unknown>)["apiKey"];

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

    console.log(
      pc.green("  Configured: ") +
        `${flags.provider} / ${config.model}` +
        (providerConfig["secretRef"] && providerConfig["authMode"] === "env_key" ? " (API env ref set)" : "")
    );
    return;
  }

  // Interactive mode
  console.log();
  p.intro(pc.bold("  skill-mall configure"));

  const provider = await p.select({
    message: "Select LLM provider:",
    options: [
      { value: "openai", label: "OpenAI (gpt-5.1)", hint: "API key required" },
      { value: "anthropic", label: "Claude API", hint: "API key required" },
      { value: "claude-code", label: "Claude Code CLI", hint: "No API key — uses existing auth" },
      { value: "gemini", label: "Google Gemini", hint: "API key required" },
      { value: "groq", label: "Groq", hint: "API key required — fast and cheap" },
      { value: "ollama", label: "Ollama (local)", hint: "No API key — requires ollama running" },
    ],
  });

  if (p.isCancel(provider)) { p.cancel("Cancelled."); process.exit(0); }

  let keyEnv: string | undefined;
  if (REQUIRES_KEY.has(String(provider))) {
    const keyInput = await p.text({
      message: "API key environment variable:",
      initialValue: ENV_BY_PROVIDER[String(provider)] ?? "",
      validate: (v) => (!v ? "An environment variable name is required for API access" : undefined),
    });
    if (p.isCancel(keyInput)) { p.cancel("Cancelled."); process.exit(0); }
    keyEnv = String(keyInput);
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

  const providerId = String(provider);
  const model = String(modelInput) || defaultModel;
  const providerConfig = {
    model,
    gatewayBackend: "direct",
    ...authConfigForProvider(providerId, keyEnv),
  };
  const config: Record<string, unknown> = {
    providers: {
      [providerId]: providerConfig,
    },
    provider: String(provider),
    model,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

  p.outro(pc.bold(pc.green("  Provider configured.")));
  console.log(`  Config saved to: ${configPath}`);
  console.log();
}
