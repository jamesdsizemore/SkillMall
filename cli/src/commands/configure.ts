import * as p from "@clack/prompts";
import { pc } from "../utils.js";
import {
  PROVIDER_REGISTRY,
  assertAuthModeAllowedForProvider,
  getProviderRegistryEntry,
  providerRegistryIdForExecutableProvider,
} from "../../../lib/providers/registry";
import { discoverProviderModels } from "../../../lib/providers/model-discovery";
import { writeProviderConfig } from "../../../lib/providers/config-store";
import {
  defaultAuthModeForProvider,
  defaultSecretRefForProvider,
} from "../../../lib/llm/router/config";
import {
  assertRouterAuthMode,
  assertRouterGatewayBackend,
  sanitizeSecretRef,
  validateSecretRefForAuthMode,
} from "../../../lib/llm/router/secret-refs";
import type { LLMAuthMode, SecretRef } from "../../../lib/llm/router/types";
import type {
  ProviderID,
  ProviderRegistryEntry,
  ProviderRegistryID,
} from "../../../lib/providers/types";

interface ConfigureArgs {
  provider?: string;
  providerRegistryId?: string;
  key?: string;
  keyEnv?: string;
  gatewayKeyEnv?: string;
  model?: string;
  manualModels?: string[];
  configMode?: string;
  authMode?: string;
  gatewayBackend?: string;
  baseURL?: string;
  routingPolicyId?: string;
  help?: boolean;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(args: string[]): ConfigureArgs {
  const result: ConfigureArgs = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--provider" && args[i + 1]) result.provider = args[++i];
    else if (args[i] === "--provider-registry-id" && args[i + 1]) result.providerRegistryId = args[++i];
    else if (args[i] === "--key" && args[i + 1]) result.key = args[++i];
    else if (args[i] === "--key-env" && args[i + 1]) result.keyEnv = args[++i];
    else if (args[i] === "--gateway-key-env" && args[i + 1]) result.gatewayKeyEnv = args[++i];
    else if (args[i] === "--model" && args[i + 1]) result.model = args[++i];
    else if (args[i] === "--manual-model" && args[i + 1]) {
      result.manualModels = [...(result.manualModels ?? []), args[++i]];
    } else if (args[i] === "--manual-models" && args[i + 1]) {
      result.manualModels = [...(result.manualModels ?? []), ...parseList(args[++i])];
    } else if (args[i] === "--config-mode" && args[i + 1]) result.configMode = args[++i];
    else if (args[i] === "--auth-mode" && args[i + 1]) result.authMode = args[++i];
    else if (args[i] === "--gateway-backend" && args[i + 1]) result.gatewayBackend = args[++i];
    else if (args[i] === "--base-url" && args[i + 1]) result.baseURL = args[++i];
    else if (args[i] === "--routing-policy" && args[i + 1]) result.routingPolicyId = args[++i];
    else if (args[i] === "--help" || args[i] === "-h") result.help = true;
  }
  return result;
}

function configureHelp(): void {
  console.log(`
${pc.bold("Usage:")}  npx skill-mall configure [options]

${pc.bold("Options:")}
  --provider <id>              Executable provider or Provider Center row id
  --provider-registry-id <id>  Provider Center row id
  --key-env <ENV>              Environment variable reference for API access
  --gateway-key-env <ENV>      Environment variable reference for gateway virtual-key access
  --model <model>              Active model label
  --manual-models <a,b>        Manual labels for custom/provider metadata rows
  --config-mode <mode>         env_key, gateway_virtual_key_ref, local_cli_session, none_local
  --gateway-backend <backend>  direct or bifrost_local
  --base-url <url>             Local, gateway, or OpenAI-compatible endpoint
  --routing-policy <id>        Routing policy identifier

Raw --key values are rejected. Use --key-env or --gateway-key-env.
`);
}

function registryEntryFromFlags(flags: ConfigureArgs): ProviderRegistryEntry | undefined {
  if (flags.providerRegistryId) {
    return getProviderRegistryEntry(flags.providerRegistryId as ProviderRegistryID);
  }

  if (!flags.provider) return undefined;
  return PROVIDER_REGISTRY.find(
    (entry) => entry.id === flags.provider || entry.executableProviderId === flags.provider
  );
}

function registryEntryForExecutableProvider(provider: ProviderID): ProviderRegistryEntry {
  const entry = PROVIDER_REGISTRY.find((candidate) => candidate.executableProviderId === provider);
  if (!entry) throw new Error(`No Provider Center registry row exists for ${provider}`);
  return entry;
}

function registryExecutionProvider(entry: ProviderRegistryEntry): ProviderID | null {
  if (entry.executableProviderId) return entry.executableProviderId;
  if (entry.gatewayProfile?.kind === "openai_compatible") return "openai";
  return null;
}

function authModeFromFlags(
  flags: ConfigureArgs,
  entry: ProviderRegistryEntry,
  provider: ProviderID | null
): LLMAuthMode | undefined {
  if (flags.configMode === "gateway_virtual_key_ref") return "gateway_virtual_key";
  if (
    flags.configMode === "env_key" ||
    flags.configMode === "local_cli_session" ||
    flags.configMode === "none_local"
  ) {
    return flags.configMode;
  }
  if (flags.authMode) return assertRouterAuthMode(flags.authMode);
  if (flags.gatewayBackend === "bifrost_local" || flags.gatewayKeyEnv) return "gateway_virtual_key";
  if (flags.keyEnv) return "env_key";
  if (provider) return undefined;
  if (entry.accessModes.includes("local_tool_session")) return "local_cli_session";
  if (entry.accessModes.includes("local_runtime")) return "none_local";
  return undefined;
}

function secretRefFromFlags(authMode: LLMAuthMode | undefined, flags: ConfigureArgs): SecretRef | undefined {
  if (!authMode) return undefined;
  if (authMode === "env_key") {
    return flags.keyEnv ? sanitizeSecretRef({ type: "env", name: flags.keyEnv }) : undefined;
  }
  if (authMode === "gateway_virtual_key") {
    const name = flags.gatewayKeyEnv ?? flags.keyEnv;
    return name ? sanitizeSecretRef({ type: "gateway_virtual_key_ref", name }) : undefined;
  }
  return sanitizeSecretRef({ type: "none" });
}

function secretStatus(secretRef: SecretRef | undefined | null) {
  if (!secretRef) return null;
  if (secretRef.type === "none") {
    return { type: "none", valuePresent: true, source: "no_secret_required" };
  }
  return {
    type: secretRef.type,
    name: secretRef.name,
    valuePresent: Boolean(process.env[secretRef.name]),
    source: "reference_only",
  };
}

function firstFallbackModel(entry: ProviderRegistryEntry): string {
  return entry.fallbackModels[0] ?? "";
}

async function configureNonInteractive(flags: ConfigureArgs): Promise<void> {
  if (flags.key) {
    console.error(pc.red("  Refusing to write raw provider secrets. Use --key-env ENV_VAR_NAME instead."));
    process.exitCode = 1;
    return;
  }

  const entry = registryEntryFromFlags(flags);
  if (!entry) {
    console.error(pc.red("  Unknown provider. Run: npx skill-mall providers list"));
    process.exitCode = 1;
    return;
  }

  const provider = entry.executableProviderId ?? null;
  const authMode = authModeFromFlags(flags, entry, provider);
  const gatewayBackend = assertRouterGatewayBackend(flags.gatewayBackend);
  const secretRef = secretRefFromFlags(authMode, flags);
  const resolvedAuthMode = authMode ?? (provider ? defaultAuthModeForProvider(provider) : undefined);
  if (resolvedAuthMode) assertAuthModeAllowedForProvider(entry, resolvedAuthMode);
  if (authMode) validateSecretRefForAuthMode(authMode, secretRef);

  const openAICompatibleExecutionProvider = registryExecutionProvider(entry);
  const directProviderMatch = Boolean(provider && entry.executableProviderId === provider);
  const canPersistRegistryTarget = Boolean(
    !directProviderMatch &&
      openAICompatibleExecutionProvider &&
      entry.gatewayProfile?.kind === "openai_compatible" &&
      (authMode ?? "env_key") === "env_key"
  );
  const resolvedBaseURL =
    flags.baseURL ?? (entry.gatewayProfile?.requiresUserEndpoint ? undefined : entry.gatewayProfile?.defaultBaseUrl);

  if (canPersistRegistryTarget && !resolvedBaseURL) {
    console.error(pc.red("  OpenAI-compatible registry execution requires --base-url for this provider row."));
    process.exitCode = 1;
    return;
  }

  if (canPersistRegistryTarget && !secretRef) {
    console.error(pc.red("  OpenAI-compatible registry execution requires --key-env ENV_VAR_NAME."));
    process.exitCode = 1;
    return;
  }

  if (canPersistRegistryTarget && openAICompatibleExecutionProvider) {
    const saved = await writeProviderConfig({
      provider: openAICompatibleExecutionProvider,
      providerRegistryId: entry.id,
      executionKind:
        entry.id === providerRegistryIdForExecutableProvider(openAICompatibleExecutionProvider)
          ? "direct"
          : "openai_compatible",
      model: flags.model,
      authMode: "env_key",
      secretRef,
      gatewayBackend,
      baseURL: resolvedBaseURL,
      routingPolicyId: flags.routingPolicyId,
    });

    console.log(pc.green("  Provider configured: ") + `${entry.name} (${saved.providerRegistryId}) / ${saved.model}`);
    console.log(`  Execution: ${saved.executionKind} via ${saved.provider}`);
    console.log(`  Config written to: ${saved.path}`);
    console.log(`  Access: ${entry.accessLabel}`);
    if (saved.secretRef) {
      const status = secretStatus(saved.secretRef);
      console.log(
        `  Secret: ${saved.secretRef.type}` +
          ("name" in saved.secretRef ? ` ${saved.secretRef.name}` : "") +
          (status ? ` (${status.valuePresent ? "present" : "missing"})` : "")
      );
    }
    return;
  }

  if (provider) {
    const saved = await writeProviderConfig({
      provider,
      model: flags.model,
      authMode,
      secretRef,
      gatewayBackend,
      baseURL: flags.baseURL,
      routingPolicyId: flags.routingPolicyId,
    });

    console.log(pc.green("  Provider configured: ") + `${entry.name} (${saved.provider}) / ${saved.model}`);
    console.log(`  Config written to: ${saved.path}`);
    console.log(`  Access: ${entry.accessLabel}`);
    if (saved.secretRef) {
      const status = secretStatus(saved.secretRef);
      console.log(
        `  Secret: ${saved.secretRef.type}` +
          ("name" in saved.secretRef ? ` ${saved.secretRef.name}` : "") +
          (status ? ` (${status.valuePresent ? "present" : "missing"})` : "")
      );
    }
    return;
  }

  if (flags.provider && !getProviderRegistryEntry(flags.provider as ProviderRegistryID)) {
    console.error(pc.red("  Provider Center registry rows do not widen executable ProviderID support."));
    process.exitCode = 1;
    return;
  }

  const discovery = await discoverProviderModels(entry, {
    baseUrl: flags.baseURL,
    manualModels: flags.manualModels ?? (flags.model ? [flags.model] : undefined),
  });

  console.log(pc.yellow("  Provider metadata accepted; no executable config was written."));
  console.log(`  Provider: ${entry.name} (${entry.id})`);
  console.log(`  Status: ${entry.status}`);
  console.log(`  Access: ${entry.accessLabel}`);
  console.log(`  Auth: ${entry.authLabel}`);
  console.log(`  Discovery: ${discovery.status} (${discovery.strategy})`);
  if (discovery.message) console.log(`  Note: ${discovery.message}`);
}

async function configureInteractive(): Promise<void> {
  console.log();
  p.intro(pc.bold("  skill-mall configure"));

  const executableEntries = PROVIDER_REGISTRY.filter((entry) => entry.executableProviderId);
  const provider = await p.select({
    message: "Select LLM provider:",
    options: executableEntries.map((entry) => ({
      value: entry.executableProviderId,
      label: `${entry.name}${firstFallbackModel(entry) ? ` (${firstFallbackModel(entry)})` : ""}`,
      hint: entry.accessLabel,
    })),
  });

  if (p.isCancel(provider)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const providerId = provider as ProviderID;
  const entry = registryEntryForExecutableProvider(providerId);
  const defaultAuthMode = defaultAuthModeForProvider(providerId);
  const defaultSecretRef = defaultSecretRefForProvider(providerId);

  let keyEnv: string | undefined;
  if (defaultAuthMode === "env_key") {
    const keyInput = await p.text({
      message: "API key environment variable:",
      initialValue: defaultSecretRef?.type === "env" ? defaultSecretRef.name : "",
      validate: (value) => (!value ? "An environment variable name is required for API access" : undefined),
    });
    if (p.isCancel(keyInput)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    keyEnv = String(keyInput);
  }

  const defaultModel = firstFallbackModel(entry);
  const modelInput = await p.text({
    message: "Model:",
    initialValue: defaultModel,
    placeholder: defaultModel,
  });
  if (p.isCancel(modelInput)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const saved = await writeProviderConfig({
    provider: providerId,
    model: String(modelInput) || undefined,
    keyEnv,
  });

  p.outro(pc.bold(pc.green("  Provider configured.")));
  console.log(`  Provider: ${entry.name} (${saved.provider}) / ${saved.model}`);
  console.log(`  Config saved to: ${saved.path}`);
  console.log();
}

export async function configureCommand(args: string[]): Promise<void> {
  const flags = parseArgs(args);
  if (flags.help) {
    configureHelp();
    return;
  }

  if (flags.provider || flags.providerRegistryId) {
    try {
      await configureNonInteractive(flags);
    } catch (error) {
      console.error(pc.red(`  ${error instanceof Error ? error.message : "Provider configuration failed"}`));
      process.exitCode = 1;
    }
    return;
  }

  await configureInteractive();
}
