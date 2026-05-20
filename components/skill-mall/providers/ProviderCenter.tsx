"use client";

import { useEffect, useMemo, useState } from "react";
import { ProviderCatalogList } from "./ProviderCatalogList";
import { ProviderConfigPanel } from "./ProviderConfigPanel";
import { ModelRefreshPanel } from "./ModelRefreshPanel";
import { UsageCostPanel } from "./UsageCostPanel";

export type ProviderAccessMode =
  | "api_access"
  | "local_tool_session"
  | "local_runtime"
  | "gateway_virtual_key"
  | "cloud_project"
  | "custom_openai_compatible";

export type ProviderSecretStatus = {
  type: "env" | "gateway_virtual_key_ref" | "none";
  name?: string;
  valuePresent: boolean;
  source: string;
} | null;

export type ProviderRow = {
  id: string;
  name: string;
  accessModes: ProviderAccessMode[];
  accessLabel: string;
  setupUrl: string;
  officialSourceUrl: string;
  discoveryStrategy: string;
  status: string;
  classification: string;
  liveCallable: boolean;
  executableProviderId: string | null;
  gatewayProfile: {
    kind: string;
    defaultBaseUrl: string | null;
    requiresUserEndpoint: boolean;
    note: string;
  } | null;
  registryInclusionNote: string;
  evidenceNote: string;
  configStatus: {
    configured: boolean;
    authMode: string | null;
    gatewayBackend: string | null;
    accessLabel: string | null;
    secretRef: { type: string; name?: string } | null;
    secretStatus: ProviderSecretStatus;
    baseURL: string | null;
    routingPolicyId: string | null;
    activeModel: string | null;
  };
  modelStatus: {
    strategy: string;
    source: string;
    authoritative: boolean;
    stale: boolean;
    models: string[];
    refresh: {
      strategy: string;
      canRefreshNow: boolean;
      liveCallable: boolean;
      requiresEndpoint: boolean;
      requiresProviderAdapter: boolean;
      requiresAccountContext: boolean;
      requiresProjectContext: boolean;
      requiresLocalRuntime: boolean;
      requiresManualModels: boolean;
      message: string;
    };
  };
  costStatus: {
    actual_cost_usd: number | null;
    estimated_cost_usd: number | null;
    note: string;
  };
};

export type ProvidersResponse = {
  configured: boolean;
  activeProvider: string | null;
  activeProviderRegistryId: string | null;
  activeModel: string | null;
  authMode: string | null;
  gatewayBackend: string | null;
  accessLabel: string | null;
  secretRef: { type: string; name?: string } | null;
  secretStatus: ProviderSecretStatus;
  baseURL: string | null;
  routingPolicyId: string | null;
  warnings: string[];
  providers: ProviderRow[];
};

export type UsageResponse = {
  available: boolean;
  summary: UsageSummary;
  byProvider: Array<UsageSummary & { provider_id: string }>;
  costLabels: {
    actual_cost_usd: string;
    estimated_cost_usd: string;
  };
  message?: string;
};

export type UsageSummary = {
  request_count: number;
  succeeded_count: number;
  failed_count: number;
  input_tokens: number;
  output_tokens: number;
  actual_cost_usd: number;
  estimated_cost_usd: number;
};

export type ProviderDraft = {
  configMode: "env_key" | "gateway_virtual_key_ref" | "local_cli_session" | "none_local";
  envVarName: string;
  gatewayRefName: string;
  baseURL: string;
  model: string;
  manualModels: string;
  routingPolicyId: string;
};

export type ProviderActionState = {
  status: "idle" | "running" | "success" | "error";
  message: string | null;
};

const emptyUsage: UsageResponse = {
  available: false,
  summary: {
    request_count: 0,
    succeeded_count: 0,
    failed_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    actual_cost_usd: 0,
    estimated_cost_usd: 0,
  },
  byProvider: [],
  costLabels: {
    actual_cost_usd: "provider_or_gateway_reported_actual_cost",
    estimated_cost_usd: "locally_estimated_cost",
  },
};

function fallbackEnvName(provider: ProviderRow | null): string {
  if (!provider) return "PROVIDER_ENV_VAR";
  return `${provider.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_REF`;
}

function draftForProvider(provider: ProviderRow | null): ProviderDraft {
  if (!provider) {
    return {
      configMode: "env_key",
      envVarName: "PROVIDER_ENV_VAR",
      gatewayRefName: "BIFROST_VIRTUAL_KEY",
      baseURL: "",
      model: "",
      manualModels: "",
      routingPolicyId: "",
    };
  }

  const configuredSecret = provider.configStatus.secretRef;
  const model = provider.configStatus.configured
    ? provider.configStatus.activeModel ?? provider.modelStatus.models[0] ?? ""
    : provider.modelStatus.models[0] ?? "";
  const defaultMode = provider.accessModes.includes("local_tool_session")
    ? "local_cli_session"
    : provider.accessModes.includes("local_runtime")
      ? "none_local"
      : provider.accessModes.includes("gateway_virtual_key")
        ? "gateway_virtual_key_ref"
        : "env_key";

  return {
    configMode:
      configuredSecret?.type === "gateway_virtual_key_ref"
        ? "gateway_virtual_key_ref"
        : configuredSecret?.type === "none"
          ? provider.accessModes.includes("local_tool_session")
            ? "local_cli_session"
            : "none_local"
          : defaultMode,
    envVarName: configuredSecret?.type === "env" && configuredSecret.name ? configuredSecret.name : fallbackEnvName(provider),
    gatewayRefName:
      configuredSecret?.type === "gateway_virtual_key_ref" && configuredSecret.name
        ? configuredSecret.name
        : "BIFROST_VIRTUAL_KEY",
    baseURL: provider.configStatus.baseURL ?? (provider.configStatus.configured ? provider.gatewayProfile?.defaultBaseUrl ?? "" : ""),
    model,
    manualModels: provider.modelStatus.models.join(", "),
    routingPolicyId: provider.configStatus.routingPolicyId ?? "",
  };
}

function splitManualModels(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function actionMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string") {
    return payload.message;
  }
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

function canRefreshProviderWithDraft(provider: ProviderRow | null, draft: ProviderDraft): boolean {
  if (!provider || provider.status === "planned_source_review") return false;
  const requiresEndpoint = provider.modelStatus.refresh.requiresEndpoint;
  const hasConfiguredEndpoint = provider.configStatus.configured;
  const hasDraftEndpoint = draft.baseURL.trim().length > 0;
  return !requiresEndpoint || hasConfiguredEndpoint || hasDraftEndpoint;
}

export function ProviderCenter({
  initialData = null,
  initialUsage = null,
}: {
  initialData?: ProvidersResponse | null;
  initialUsage?: UsageResponse | null;
}) {
  const [data, setData] = useState<ProvidersResponse | null>(initialData);
  const [usage, setUsage] = useState<UsageResponse | null>(initialUsage);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    initialData?.activeProviderRegistryId ?? initialData?.providers[0]?.id ?? ""
  );
  const [draft, setDraft] = useState<ProviderDraft>(() =>
    draftForProvider(initialData?.providers.find((provider) => provider.id === selectedProviderId) ?? null)
  );
  const [loadState, setLoadState] = useState<ProviderActionState>({ status: "idle", message: null });
  const [configureState, setConfigureState] = useState<ProviderActionState>({ status: "idle", message: null });
  const [refreshState, setRefreshState] = useState<ProviderActionState>({ status: "idle", message: null });
  const [testState, setTestState] = useState<ProviderActionState>({ status: "idle", message: null });

  const selectedProvider = useMemo(
    () => data?.providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [data, selectedProviderId]
  );
  const canRefreshSelectedProvider = useMemo(
    () => canRefreshProviderWithDraft(selectedProvider, draft),
    [selectedProvider, draft]
  );

  const loadProviders = async () => {
    setLoadState({ status: "running", message: "Loading Provider Center status" });
    try {
      const response = await fetch("/api/providers");
      const payload = (await response.json()) as ProvidersResponse;
      if (!response.ok) throw new Error(actionMessage(payload, "Provider status failed"));
      const nextSelectedId = selectedProviderId || payload.activeProviderRegistryId || payload.providers[0]?.id || "";
      setData(payload);
      setSelectedProviderId(nextSelectedId);
      setDraft(draftForProvider(payload.providers.find((provider) => provider.id === nextSelectedId) ?? null));
      setLoadState({ status: "success", message: "Provider Center status loaded" });
    } catch (error) {
      setLoadState({
        status: "error",
        message: error instanceof Error ? error.message : "Provider status failed",
      });
    }
  };

  const loadUsage = async () => {
    try {
      const response = await fetch("/api/providers/usage");
      const payload = (await response.json()) as UsageResponse;
      setUsage(response.ok ? payload : emptyUsage);
    } catch {
      setUsage(emptyUsage);
    }
  };

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    async function loadInitialProviders() {
      try {
        const response = await fetch("/api/providers");
        const payload = (await response.json()) as ProvidersResponse;
        if (!response.ok) throw new Error(actionMessage(payload, "Provider status failed"));
        if (cancelled) return;
        const nextSelectedId = payload.activeProviderRegistryId || payload.providers[0]?.id || "";
        setData(payload);
        setSelectedProviderId(nextSelectedId);
        setDraft(draftForProvider(payload.providers.find((provider) => provider.id === nextSelectedId) ?? null));
        setLoadState({ status: "success", message: "Provider Center status loaded" });
      } catch (error) {
        if (cancelled) return;
        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "Provider status failed",
        });
      }
    }
    void loadInitialProviders();
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  useEffect(() => {
    if (initialUsage) return;
    let cancelled = false;
    async function loadInitialUsage() {
      try {
        const response = await fetch("/api/providers/usage");
        const payload = (await response.json()) as UsageResponse;
        if (!cancelled) setUsage(response.ok ? payload : emptyUsage);
      } catch {
        if (!cancelled) setUsage(emptyUsage);
      }
    }
    void loadInitialUsage();
    return () => {
      cancelled = true;
    };
  }, [initialUsage]);

  const handleSelectProvider = (provider: ProviderRow) => {
    setSelectedProviderId(provider.id);
    setDraft(draftForProvider(provider));
    setConfigureState({ status: "idle", message: null });
    setRefreshState({ status: "idle", message: null });
    setTestState({ status: "idle", message: null });
  };

  const configureProvider = async () => {
    if (!selectedProvider) return;
    setConfigureState({ status: "running", message: "Saving secret-reference configuration" });

    const secretRef =
      draft.configMode === "gateway_virtual_key_ref"
        ? { type: "gateway_virtual_key_ref", name: draft.gatewayRefName }
        : draft.configMode === "env_key"
          ? { type: "env", name: draft.envVarName }
          : { type: "none" };

    const payload = {
      providerRegistryId: selectedProvider.id,
      ...(selectedProvider.executableProviderId ? { provider: selectedProvider.executableProviderId } : {}),
      configMode: draft.configMode,
      secretRef,
      gatewayBackend: draft.configMode === "gateway_virtual_key_ref" ? "bifrost_local" : "direct",
      ...(draft.baseURL ? { baseURL: draft.baseURL } : {}),
      ...(draft.model ? { model: draft.model } : {}),
      ...(draft.manualModels ? { manualModels: splitManualModels(draft.manualModels) } : {}),
      ...(draft.routingPolicyId ? { routingPolicyId: draft.routingPolicyId } : {}),
    };

    try {
      const response = await fetch("/api/providers/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(actionMessage(result, "Provider configuration failed"));
      setConfigureState({
        status: "success",
        message: result.persisted ? "Executable provider config saved" : "Registry metadata accepted",
      });
      await loadProviders();
      await loadUsage();
    } catch (error) {
      setConfigureState({
        status: "error",
        message: error instanceof Error ? error.message : "Provider configuration failed",
      });
    }
  };

  const refreshModels = async () => {
    if (!selectedProvider) return;
    if (!canRefreshSelectedProvider) {
      setRefreshState({ status: "error", message: "Configured endpoint or manual models required" });
      return;
    }
    setRefreshState({ status: "running", message: "Refreshing model status" });
    try {
      const response = await fetch("/api/providers/models/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerRegistryId: selectedProvider.id,
          ...(draft.baseURL ? { baseURL: draft.baseURL } : {}),
          ...(draft.manualModels ? { manualModels: splitManualModels(draft.manualModels) } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(actionMessage(result, "Model refresh failed"));
      const discovery = result.discovery as { status?: string; models?: string[]; message?: string };
      setRefreshState({
        status: "success",
        message: `${discovery.status ?? "status"} / ${(discovery.models ?? []).length} models`,
      });
    } catch (error) {
      setRefreshState({
        status: "error",
        message: error instanceof Error ? error.message : "Model refresh failed",
      });
    }
  };

  const testProvider = async () => {
    if (!selectedProvider) return;
    setTestState({ status: "running", message: "Testing provider status" });
    try {
      const response = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerRegistryId: selectedProvider.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(actionMessage(result, "Provider status test failed"));
      setTestState({ status: "success", message: `Status: ${result.status}` });
    } catch (error) {
      setTestState({
        status: "error",
        message: error instanceof Error ? error.message : "Provider status test failed",
      });
    }
  };

  const statusLine = data?.configured
    ? `Configured: ${data.activeProviderRegistryId ?? data.activeProvider} / ${data.activeModel ?? "model pending"}`
    : "No active provider configuration";

  return (
    <section className="space-y-5">
      <div>
        <p className="mb-2 text-[9px] tracking-widest text-sm-secondary font-label">[ PROVIDER CENTER ]</p>
        <h2 className="mb-2 text-xl font-bold text-sm-display">Provider Center</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-sm-secondary">
          Configure provider access with references, inspect local and gateway status, refresh model labels, and track
          usage costs without storing raw provider secrets in the browser.
        </p>
      </div>

      <div className="border border-sm-border bg-sm-surface px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] tracking-widest text-sm-display font-label">[ {statusLine.toUpperCase()} ]</p>
          <p className="text-[9px] tracking-widest text-sm-secondary font-label">
            [ ACTIVE MODEL: {(data?.activeModel ?? "NONE").toUpperCase()} ]
          </p>
        </div>
        {loadState.message && (
          <p className={`mt-2 text-[9px] tracking-widest font-label ${loadState.status === "error" ? "text-sm-accent" : "text-sm-secondary"}`}>
            [ {loadState.message.toUpperCase()} ]
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <ProviderCatalogList
          providers={data?.providers ?? []}
          selectedProviderId={selectedProviderId}
          onSelectProvider={handleSelectProvider}
        />

        <div className="space-y-5">
          <ProviderConfigPanel
            provider={selectedProvider}
            draft={draft}
            actionState={configureState}
            onDraftChange={setDraft}
            onSave={configureProvider}
          />
          <ModelRefreshPanel
            provider={selectedProvider}
            refreshState={refreshState}
            testState={testState}
            refreshReady={canRefreshSelectedProvider}
            onRefresh={refreshModels}
            onTest={testProvider}
          />
          <UsageCostPanel usage={usage ?? emptyUsage} activeProviderId={selectedProvider?.id ?? null} />
        </div>
      </div>
    </section>
  );
}
