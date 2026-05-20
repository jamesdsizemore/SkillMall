import fs from "fs";
import path from "path";
import { pc } from "../utils.js";
import { resolveRouterProviderConfig } from "../../../lib/llm/router/config";
import { resolveEnvSecret, sanitizeSecretRef } from "../../../lib/llm/router/secret-refs";
import { discoverProviderModels, modelDiscoveryPlanForEntry } from "../../../lib/providers/model-discovery";
import {
  PROVIDER_REGISTRY,
  getProviderRegistryEntry,
  providerRegistryIdForExecutableProvider,
} from "../../../lib/providers/registry";
import { getDb } from "../../../lib/db/client";
import { refreshPricingSnapshots } from "../../../lib/llm/router/pricing-refresh";
import {
  normalizeLiteLLMPricing,
  normalizePortkeyPricing,
  portkeyPricingUrl,
  type PricingSource,
} from "../../../lib/providers/pricing-sources";
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
  source?: PricingSource;
  modelIds?: string[];
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
  executionKind: string | null;
  routingPolicyId: string | null;
  warnings: string[];
}

interface CachedModelStatus {
  source: string;
  modelCount: number;
  lastCheckedAt: string | null;
  stale: boolean;
  capabilityStatus: {
    capableModelCount: number;
    sources: string[];
    confidences: string[];
    blockers: string[];
  };
}

function localDbPath(): string {
  return process.env.SKILL_MALL_DB_PATH ?? path.join(process.cwd(), "data", "skillmall.db");
}

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
    else if (args[i] === "--source" && args[i + 1]) flags.source = args[++i] as PricingSource;
    else if ((args[i] === "--model-id" || args[i] === "--model") && args[i + 1]) {
      flags.modelIds = [...(flags.modelIds ?? []), args[++i]];
    } else if (args[i] === "--model-ids" && args[i + 1]) {
      flags.modelIds = [...(flags.modelIds ?? []), ...parseList(args[++i])];
    }
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
  refresh-pricing      Refresh source-backed pricing snapshots
  test                 Run a safe local provider readiness test

${pc.bold("Options:")}
  --provider <id>              Executable provider or Provider Center row id
  --provider-registry-id <id>  Provider Center row id
  --key-env <ENV>              Environment variable reference for refresh auth
  --base-url <url>             Local, gateway, or OpenAI-compatible endpoint
  --source <name>              Pricing source: portkey_models or litellm_model_prices
  --model-ids <a,b>            Limit pricing refresh to selected model ids
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

function isPricingSource(value: string | undefined): value is PricingSource {
  return value === "portkey_models" || value === "litellm_model_prices";
}

function isStale(lastCheckedAt: string | null): boolean {
  if (!lastCheckedAt) return true;
  const checked = Date.parse(lastCheckedAt);
  if (!Number.isFinite(checked)) return true;
  return Date.now() - checked > 24 * 60 * 60 * 1000;
}

const blockingCapabilityStatusCodes = new Set([
  "account_scoped_source",
  "fallback_only",
  "manual_only",
  "missing_metadata",
  "provider_specific_source_required",
  "reference_only",
  "stale_metadata",
  "unknown_source",
]);

function hasEligibleCapabilityMetadata(parsed: {
  capabilities?: Record<string, unknown>;
  blockers?: string[];
}): boolean {
  if (!parsed.capabilities || Object.keys(parsed.capabilities).length === 0) return false;
  const blockers = Array.isArray(parsed.blockers) ? parsed.blockers : [];
  return !blockers.some((blocker) => blockingCapabilityStatusCodes.has(blocker));
}

function loadCachedModelStatuses(): Map<ProviderRegistryID, CachedModelStatus> {
  if (!fs.existsSync(localDbPath())) return new Map();
  try {
    const rows = getDb().prepare(`
      SELECT provider_registry_id, model_id, source, last_checked_at
        , capabilities_json
      FROM llm_models
      WHERE provider_registry_id IS NOT NULL
      ORDER BY provider_registry_id, model_id
    `).all() as Array<{
      provider_registry_id: ProviderRegistryID;
      model_id: string;
      source: string;
      last_checked_at: string | null;
      capabilities_json: string;
    }>;

    const statuses = new Map<ProviderRegistryID, CachedModelStatus>();
    for (const row of rows) {
      const current = statuses.get(row.provider_registry_id) ?? {
        source: row.source,
        modelCount: 0,
        lastCheckedAt: row.last_checked_at,
        stale: isStale(row.last_checked_at),
        capabilityStatus: {
          capableModelCount: 0,
          sources: [],
          confidences: [],
          blockers: [],
        },
      };
      current.modelCount += 1;
      try {
        const parsed = JSON.parse(row.capabilities_json) as {
          source?: string;
          confidence?: string;
          capabilities?: Record<string, unknown>;
          blockers?: string[];
        };
        if (hasEligibleCapabilityMetadata(parsed)) {
          current.capabilityStatus.capableModelCount += 1;
        }
        if (parsed.source) current.capabilityStatus.sources.push(parsed.source);
        if (parsed.confidence) current.capabilityStatus.confidences.push(parsed.confidence);
        if (Array.isArray(parsed.blockers)) current.capabilityStatus.blockers.push(...parsed.blockers);
      } catch {}
      if (
        row.last_checked_at &&
        (!current.lastCheckedAt || Date.parse(row.last_checked_at) > Date.parse(current.lastCheckedAt))
      ) {
        current.lastCheckedAt = row.last_checked_at;
        current.source = row.source;
        current.stale = isStale(row.last_checked_at);
      }
      current.capabilityStatus.sources = [...new Set(current.capabilityStatus.sources)];
      current.capabilityStatus.confidences = [...new Set(current.capabilityStatus.confidences)];
      current.capabilityStatus.blockers = [...new Set(current.capabilityStatus.blockers)];
      statuses.set(row.provider_registry_id, current);
    }
    return statuses;
  } catch {
    return new Map();
  }
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
      activeProviderRegistryId: config.providerRegistryId ?? providerRegistryIdForExecutableProvider(config.provider),
      activeModel: config.model,
      authMode: config.authMode,
      gatewayBackend: config.gatewayBackend,
      accessLabel: accessLabel(config.authMode, config.gatewayBackend),
      secretRef: config.secretRef ?? null,
      secretStatus: secretStatus(config.secretRef),
      baseURL: config.baseURL ?? null,
      executionKind: config.executionKind ?? null,
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
      executionKind: null,
      routingPolicyId: null,
      warnings: [error instanceof Error ? error.message : "No provider configured"],
    };
  }
}

function rowStatus(
  entry: ProviderRegistryEntry,
  active: ActiveStatus,
  cachedModels: Map<ProviderRegistryID, CachedModelStatus> = new Map()
) {
  const isConfigured = active.activeProviderRegistryId === entry.id;
  const refresh = modelDiscoveryPlanForEntry(entry);
  const cachedModelStatus = cachedModels.get(entry.id);
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
    executionKind: isConfigured ? active.executionKind : null,
    secretStatus: isConfigured ? active.secretStatus : null,
    baseURL: isConfigured ? active.baseURL : null,
    routingPolicyId: isConfigured ? active.routingPolicyId : null,
    modelStatus: {
      source: cachedModelStatus?.source ?? (entry.fallbackModels.length > 0 ? "fallback" : "none"),
      modelCount: cachedModelStatus?.modelCount ?? entry.fallbackModels.length,
      lastCheckedAt: cachedModelStatus?.lastCheckedAt ?? null,
      stale: cachedModelStatus?.stale ?? true,
      blocker: cachedModelStatus ? null : refresh.message,
      capabilityStatus: cachedModelStatus?.capabilityStatus ?? {
        capableModelCount: 0,
        sources: entry.fallbackModels.length > 0 ? ["fallback"] : [],
        confidences: entry.fallbackModels.length > 0 ? ["fallback"] : [],
        blockers: entry.fallbackModels.length > 0 ? ["fallback_only", "missing_metadata"] : ["missing_metadata"],
      },
    },
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

function filterModelIds<T extends { modelId: string }>(records: T[], modelIds: string[] | undefined): T[] {
  if (!modelIds?.length) return records;
  const allowed = new Set(modelIds);
  return records.filter((record) => allowed.has(record.modelId));
}

async function listCommand(flags: ProviderFlags): Promise<void> {
  const active = activeStatus();
  const cachedModels = loadCachedModelStatuses();
  const rows = PROVIDER_REGISTRY.map((entry) => rowStatus(entry, active, cachedModels));
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
  const cachedModels = loadCachedModelStatuses();
  const entry = selectedEntry(flags, active);
  if (!entry) {
    if (flags.json) console.log(JSON.stringify(active, null, 2));
    else {
      console.log(pc.yellow("  No provider configured."));
      for (const warning of active.warnings) console.log(`  ${warning}`);
    }
    return;
  }

  const status = rowStatus(entry, active, cachedModels);
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
  console.log(`  Model source: ${status.modelStatus.source}`);
  console.log(`  Model count: ${status.modelStatus.modelCount}`);
  console.log(`  Last checked: ${status.modelStatus.lastCheckedAt ?? "never"}`);
  console.log(`  Stale: ${status.modelStatus.stale ? "yes" : "no"}`);
  console.log(`  Blocker: ${status.modelStatus.blocker ?? "none"}`);
  console.log(`  Capable models: ${status.modelStatus.capabilityStatus.capableModelCount} / ${status.modelStatus.modelCount}`);
  console.log(`  Capability confidence: ${status.modelStatus.capabilityStatus.confidences.join(", ") || "unknown"}`);
  console.log(`  Capability blockers: ${status.modelStatus.capabilityStatus.blockers.join(", ") || "none"}`);
  console.log(`  Configured: ${status.configured ? "yes" : "no"}`);
  if (status.configured) {
    console.log(`  Active model: ${status.activeModel}`);
    console.log(`  Execution kind: ${status.executionKind}`);
    console.log(`  Auth mode: ${status.authMode}`);
    console.log(`  Gateway backend: ${status.gatewayBackend}`);
    if (status.secretStatus) {
      console.log(`  Secret status: ${status.secretStatus.valuePresent ? "present" : "missing"}`);
    }
  }
  console.log(`  Refresh: ${status.modelRefresh.message}`);
}

async function refreshPricingCommand(flags: ProviderFlags): Promise<void> {
  const source = flags.source ?? "portkey_models";
  if (!isPricingSource(source)) {
    console.error(pc.red("  Unknown pricing source. Use portkey_models or litellm_model_prices."));
    process.exitCode = 1;
    return;
  }

  const active = activeStatus();
  const entry = selectedEntry(flags, active);
  const sourceUrl =
    (source === "portkey_models" && entry ? portkeyPricingUrl(entry.id) : undefined) ??
    (source === "litellm_model_prices"
      ? "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"
      : undefined);

  if (!sourceUrl) {
    console.error(pc.red("  No source-backed pricing file is configured for this provider/source pair."));
    process.exitCode = 1;
    return;
  }

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      const payload = {
        refreshed: false,
        source,
        sourceUrl,
        providerRegistryId: entry?.id ?? null,
        status: response.status,
        snapshotCount: 0,
      };
      if (flags.json) console.log(JSON.stringify(payload, null, 2));
      else console.log(pc.yellow(`  Pricing source failed with HTTP ${response.status}; no snapshots written.`));
      return;
    }

    const payload = await response.json();
    const normalized =
      source === "portkey_models"
        ? normalizePortkeyPricing(entry?.id ?? "unknown", payload, sourceUrl)
        : normalizeLiteLLMPricing(payload, sourceUrl);
    const records = filterModelIds(normalized, flags.modelIds);
    const snapshots = refreshPricingSnapshots(
      records.map((record) => ({
        providerId: record.providerRegistryId,
        providerRegistryId: record.providerRegistryId,
        executionKind: record.executionKind,
        modelId: record.modelId,
        pricing: record.pricing,
        source: record.source,
        sourceUrl: record.sourceUrl,
        sourceLicense: record.sourceLicense,
        currency: record.currency,
      }))
    );
    const result = {
      refreshed: true,
      source,
      sourceUrl,
      sourceLicense: records[0]?.sourceLicense ?? null,
      providerRegistryId: entry?.id ?? null,
      snapshotCount: snapshots.length,
    };
    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`${pc.bold(entry?.name ?? "All providers")} (${entry?.id ?? "source-wide"})`);
    console.log(`  Pricing source: ${source}`);
    console.log(`  Source URL: ${sourceUrl}`);
    console.log(`  Source license: ${result.sourceLicense ?? "not recorded"}`);
    console.log(`  Snapshots written: ${snapshots.length}`);
  } catch (error) {
    console.error(pc.red(`  Pricing refresh failed: ${error instanceof Error ? error.message : "unknown error"}`));
    process.exitCode = 1;
  }
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
    case "refresh-pricing":
      await refreshPricingCommand(flags);
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
