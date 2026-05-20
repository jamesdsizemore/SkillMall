import { pc } from "../utils.js";
import { resolveRouterProviderConfig } from "../../../lib/llm/router/config";
import { resolveEnvSecret, sanitizeSecretRef } from "../../../lib/llm/router/secret-refs";
import { discoverProviderModels, modelDiscoveryPlanForEntry } from "../../../lib/providers/model-discovery";
import { PROVIDER_REGISTRY, getProviderRegistryEntry } from "../../../lib/providers/registry";
import type { SecretRef } from "../../../lib/llm/router/types";
import type {
  ProviderID,
  ProviderRegistryEntry,
  ProviderRegistryID,
} from "../../../lib/providers/types";

interface ProviderFlags {
  provider?: string;
  providerRegistryId?: string;
  key?: string;
  keyEnv?: string;
  baseURL?: string;
  manualModels?: string[];
  json?: boolean;
  help?: boolean;
}

interface ActiveStatus {
  configured: boolean;
  activeProvider: ProviderID | null;
  activeProviderRegistryId: ProviderRegistryID | null;
  activeModel: string | null;
  authMode: string | null;
  gatewayBackend: string | null;
  accessLabel: string | null;
  secretRef: SecretRef | null;
  secretStatus: ReturnType<typeof secretStatus>;
  baseURL: string | null;
  routingPolicyId: string | null;
  warnings: string[];
}

const registryIdByExecutableProvider = PROVIDER_REGISTRY.reduce(
  (acc, entry) => {
    if (entry.executableProviderId) acc[entry.executableProviderId] = entry.id;
    return acc;
  },
  {} as Partial<Record<ProviderID, ProviderRegistryID>>
);

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFlags(args: string[]): ProviderFlags {
  const flags: ProviderFlags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--provider" && args[i + 1]) flags.provider = args[++i];
    else if (args[i] === "--provider-registry-id" && args[i + 1]) flags.providerRegistryId = args[++i];
    else if (args[i] === "--key" && args[i + 1]) flags.key = args[++i];
    else if (args[i] === "--key-env" && args[i + 1]) flags.keyEnv = args[++i];
    else if (args[i] === "--base-url" && args[i + 1]) flags.baseURL = args[++i];
    else if (args[i] === "--manual-model" && args[i + 1]) {
      flags.manualModels = [...(flags.manualModels ?? []), args[++i]];
    } else if (args[i] === "--manual-models" && args[i + 1]) {
      flags.manualModels = [...(flags.manualModels ?? []), ...parseList(args[++i])];
    } else if (args[i] === "--json") flags.json = true;
    else if (args[i] === "--help" || args[i] === "-h") flags.help = true;
  }
  return flags;
}

function help(): void {
  console.log(`
${pc.bold("Usage:")}  npx skill-mall providers <command> [options]

${pc.bold("Commands:")}
  list                 List Provider Center rows
  status               Show active provider or selected row status
  refresh-models       Refresh or report model discovery status
  test                 Run a safe local provider readiness test

${pc.bold("Options:")}
  --provider <id>              Executable provider or Provider Center row id
  --provider-registry-id <id>  Provider Center row id
  --key-env <ENV>              Environment variable reference for refresh auth
  --base-url <url>             Local, gateway, or OpenAI-compatible endpoint
  --manual-models <a,b>        Manual labels for custom OpenAI-compatible rows
  --json                       Print JSON

Raw --key values are rejected. Use secret references such as --key-env.
`);
}

function registryEntryFromFlags(flags: ProviderFlags): ProviderRegistryEntry | undefined {
  if (flags.providerRegistryId) {
    return getProviderRegistryEntry(flags.providerRegistryId as ProviderRegistryID);
  }

  if (!flags.provider) return undefined;
  return PROVIDER_REGISTRY.find(
    (entry) => entry.id === flags.provider || entry.executableProviderId === flags.provider
  );
}

function secretStatus(secretRef: SecretRef | undefined | null) {
  if (!secretRef) return null;
  if (secretRef.type === "none") {
    return {
      type: "none",
      valuePresent: true,
      source: "no_secret_required",
    };
  }

  return {
    type: secretRef.type,
    name: secretRef.name,
    valuePresent: Boolean(process.env[secretRef.name]),
    source: "reference_only",
  };
}

function accessLabel(authMode: string | null, gatewayBackend: string | null): string | null {
  if (gatewayBackend && gatewayBackend !== "direct") return "gateway_access";
  if (authMode === "env_key") return "api_access";
  if (authMode === "local_cli_session") return "local_tool_session";
  if (authMode === "none_local") return "local_runtime";
  if (authMode === "gateway_virtual_key") return "gateway_access";
  return null;
}

function activeStatus(): ActiveStatus {
  try {
    const config = resolveRouterProviderConfig();
    return {
      configured: true,
      activeProvider: config.provider,
      activeProviderRegistryId: registryIdByExecutableProvider[config.provider] ?? null,
      activeModel: config.model,
      authMode: config.authMode,
      gatewayBackend: config.gatewayBackend,
      accessLabel: accessLabel(config.authMode, config.gatewayBackend),
      secretRef: config.secretRef ?? null,
      secretStatus: secretStatus(config.secretRef),
      baseURL: config.baseURL ?? null,
      routingPolicyId: config.routingPolicyId ?? null,
      warnings: config.warnings,
    };
  } catch (error) {
    return {
      configured: false,
      activeProvider: null,
      activeProviderRegistryId: null,
      activeModel: null,
      authMode: null,
      gatewayBackend: "direct",
      accessLabel: null,
      secretRef: null,
      secretStatus: null,
      baseURL: null,
      routingPolicyId: null,
      warnings: [error instanceof Error ? error.message : "No provider configured"],
    };
  }
}

function rowStatus(entry: ProviderRegistryEntry, active: ActiveStatus) {
  const isConfigured = active.activeProviderRegistryId === entry.id;
  const refresh = modelDiscoveryPlanForEntry(entry);
  return {
    id: entry.id,
    name: entry.name,
    status: entry.status,
    classification: entry.classification,
    accessLabel: entry.accessLabel,
    authLabel: entry.authLabel,
    discoveryStrategy: entry.discoveryStrategy,
    executableProviderId: entry.executableProviderId ?? null,
    configured: isConfigured,
    authMode: isConfigured ? active.authMode : null,
    gatewayBackend: isConfigured ? active.gatewayBackend : null,
    activeModel: isConfigured ? active.activeModel : null,
    secretStatus: isConfigured ? active.secretStatus : null,
    baseURL: isConfigured ? active.baseURL : null,
    routingPolicyId: isConfigured ? active.routingPolicyId : null,
    modelRefresh: refresh,
    setupUrl: entry.setupUrl,
  };
}

function printRows(rows: ReturnType<typeof rowStatus>[]): void {
  const width = Math.max(...rows.map((row) => row.id.length), "provider".length);
  console.log(`${"provider".padEnd(width)}  status                 access`);
  console.log(`${"-".repeat(width)}  ${"-".repeat(21)}  ${"-".repeat(36)}`);
  for (const row of rows) {
    const marker = row.configured ? pc.green("*") : " ";
    console.log(
      `${marker}${row.id.padEnd(width - 1)}  ${row.status.padEnd(21)}  ${row.accessLabel}`
    );
  }
}

function selectedEntry(flags: ProviderFlags, active: ActiveStatus): ProviderRegistryEntry | undefined {
  const explicit = registryEntryFromFlags(flags);
  if (explicit) return explicit;
  return active.activeProviderRegistryId ? getProviderRegistryEntry(active.activeProviderRegistryId) : undefined;
}

function rejectRawKey(flags: ProviderFlags): boolean {
  if (!flags.key) return false;
  console.error(pc.red("  Refusing raw provider secrets. Use --key-env ENV_VAR_NAME instead."));
  process.exitCode = 1;
  return true;
}

async function listCommand(flags: ProviderFlags): Promise<void> {
  const active = activeStatus();
  const rows = PROVIDER_REGISTRY.map((entry) => rowStatus(entry, active));
  if (flags.json) {
    console.log(JSON.stringify({ ...active, providers: rows }, null, 2));
    return;
  }
  printRows(rows);
  if (active.configured) {
    console.log();
    console.log(`  Active: ${active.activeProvider} / ${active.activeModel}`);
  }
}

async function statusCommand(flags: ProviderFlags): Promise<void> {
  const active = activeStatus();
  const entry = selectedEntry(flags, active);
  if (!entry) {
    if (flags.json) console.log(JSON.stringify(active, null, 2));
    else {
      console.log(pc.yellow("  No provider configured."));
      for (const warning of active.warnings) console.log(`  ${warning}`);
    }
    return;
  }

  const status = rowStatus(entry, active);
  if (flags.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log(`${pc.bold(status.name)} (${status.id})`);
  console.log(`  Provider status: ${status.status}`);
  console.log(`  Classification: ${status.classification}`);
  console.log(`  Access: ${status.accessLabel}`);
  console.log(`  Auth: ${status.authLabel}`);
  console.log(`  Discovery: ${status.discoveryStrategy}`);
  console.log(`  Configured: ${status.configured ? "yes" : "no"}`);
  if (status.configured) {
    console.log(`  Active model: ${status.activeModel}`);
    console.log(`  Auth mode: ${status.authMode}`);
    console.log(`  Gateway backend: ${status.gatewayBackend}`);
    if (status.secretStatus) {
      console.log(`  Secret status: ${status.secretStatus.valuePresent ? "present" : "missing"}`);
    }
  }
  console.log(`  Refresh: ${status.modelRefresh.message}`);
}

async function refreshModelsCommand(flags: ProviderFlags): Promise<void> {
  if (rejectRawKey(flags)) return;

  const active = activeStatus();
  const entry = selectedEntry(flags, active);
  if (!entry) {
    console.error(pc.red("  Select a provider or configure one first."));
    process.exitCode = 1;
    return;
  }

  try {
    const activeMatches = active.activeProviderRegistryId === entry.id;
    let keyEnv: string | undefined;
    if (flags.keyEnv) {
      const ref = sanitizeSecretRef({ type: "env", name: flags.keyEnv });
      keyEnv = ref.type === "env" ? ref.name : undefined;
    } else if (activeMatches && active.secretRef?.type !== "none") {
      keyEnv = active.secretRef?.name;
    }
    const apiKey = keyEnv ? resolveEnvSecret(keyEnv) : undefined;
    const baseUrl =
      flags.baseURL ??
      (activeMatches ? active.baseURL ?? undefined : undefined) ??
      (activeMatches ? entry.gatewayProfile?.defaultBaseUrl : undefined);
    const discovery = await discoverProviderModels(entry, {
      baseUrl,
      apiKey,
      manualModels: flags.manualModels,
    });
    const payload = {
      providerRegistryId: entry.id,
      executableProviderId: entry.executableProviderId ?? null,
      configured: activeMatches,
      discovery,
      secretStatus: keyEnv
        ? {
            type: active.secretRef?.type ?? "env",
            name: keyEnv,
            valuePresent: Boolean(apiKey),
            source: "reference_only",
          }
        : null,
    };

    if (flags.json) {
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    console.log(`${pc.bold(entry.name)} (${entry.id})`);
    console.log(`  Discovery status: ${discovery.status}`);
    console.log(`  Source: ${discovery.source}`);
    console.log(`  Authoritative: ${discovery.authoritative ? "yes" : "no"}`);
    console.log(`  Network called: ${discovery.networkCalled ? "yes" : "no"}`);
    if (discovery.models.length > 0) {
      console.log("  Models:");
      for (const model of discovery.models) console.log(`    - ${model}`);
    }
    if (discovery.message) console.log(`  Note: ${discovery.message}`);
  } catch (error) {
    console.error(pc.red(`  Model refresh failed: ${error instanceof Error ? error.message : "unknown error"}`));
    process.exitCode = 1;
  }
}

function readinessStatus(entry: ProviderRegistryEntry, active: ActiveStatus) {
  const activeMatches = active.activeProviderRegistryId === entry.id;
  const missingSecret = activeMatches && active.secretStatus && !active.secretStatus.valuePresent;
  const discoveryPlan = modelDiscoveryPlanForEntry(entry);
  const status =
    entry.status === "planned_source_review"
      ? "planned_source_review"
      : activeMatches
        ? missingSecret
          ? "missing_secret"
          : "ready"
        : entry.executableProviderId
          ? "not_configured"
          : "metadata_only";

  return {
    providerRegistryId: entry.id,
    executableProviderId: entry.executableProviderId ?? null,
    configured: activeMatches,
    status,
    checks: [
      { name: "registry_row", status: entry.status },
      {
        name: "secret_reference",
        status: activeMatches && active.secretStatus ? status : "not_applicable",
      },
      {
        name: "model_discovery",
        status: discoveryPlan.canRefreshNow ? "supported_when_configured" : discoveryPlan.strategy,
      },
    ],
    authMode: activeMatches ? active.authMode : null,
    gatewayBackend: activeMatches ? active.gatewayBackend : null,
    secretStatus: activeMatches ? active.secretStatus : null,
    message: "Safe configuration/status test only; prompt and response bodies are not stored or echoed.",
  };
}

async function testCommand(flags: ProviderFlags): Promise<void> {
  if (rejectRawKey(flags)) return;

  const active = activeStatus();
  const entry = selectedEntry(flags, active);
  if (!entry) {
    console.error(pc.red("  Select a provider or configure one first."));
    process.exitCode = 1;
    return;
  }

  const status = readinessStatus(entry, active);
  if (flags.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log(`${pc.bold(entry.name)} (${entry.id})`);
  console.log(`  Status: ${status.status}`);
  for (const check of status.checks) {
    console.log(`  ${check.name}: ${check.status}`);
  }
  console.log(`  ${status.message}`);
}

export async function providersCommand(args: string[]): Promise<void> {
  const command = args[0] ?? "help";
  const flags = parseFlags(args.slice(1));

  if (flags.help || command === "help" || command === "--help" || command === "-h") {
    help();
    return;
  }

  switch (command) {
    case "list":
      await listCommand(flags);
      break;
    case "status":
      await statusCommand(flags);
      break;
    case "refresh-models":
      await refreshModelsCommand(flags);
      break;
    case "test":
      await testCommand(flags);
      break;
    default:
      console.error(pc.red(`Unknown providers command: ${command}`));
      help();
      process.exitCode = 1;
  }
}
