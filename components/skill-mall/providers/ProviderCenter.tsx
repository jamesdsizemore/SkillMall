"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProviderConfigPanel } from "./ProviderConfigPanel";

export type ProviderAccessMode =
  | "api_access"
  | "local_tool_session"
  | "local_runtime"
  | "gateway_virtual_key"
  | "cloud_project"
  | "custom_openai_compatible";

export type ProviderSecretStatus = {
  type: "env" | "gateway_virtual_key_ref" | "stored_api_key" | "none";
  name?: string;
  id?: string;
  valuePresent: boolean;
  source: string;
} | null;

export type ProviderRow = {
  id: string;
  name: string;
  accessModes: ProviderAccessMode[];
  accessLabel: string;
  authLabel: string;
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
    secretRef: { type: string; name?: string; id?: string } | null;
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
    modelCount?: number;
    lastCheckedAt?: string | null;
    blocker?: string | null;
    models: string[];
    capabilityStatus: {
      capableModelCount: number;
      sources: string[];
      confidences: string[];
      blockers: string[];
    };
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
  executionKind?: string | null;
  activeModel: string | null;
  authMode: string | null;
  gatewayBackend: string | null;
  accessLabel: string | null;
  secretRef: { type: string; name?: string; id?: string } | null;
  secretStatus: ProviderSecretStatus;
  baseURL: string | null;
  routingPolicyId: string | null;
  warnings: string[];
  providers: ProviderRow[];
};

export type RoutingPolicyRow = {
  id: string;
  name: string;
  mode: string;
  rules: {
    candidates?: Array<{
      id: string;
      config: {
        provider: string;
        providerRegistryId?: string;
        executionKind?: string;
        model: string;
        authMode?: string;
        secretRef?: { type: string; name?: string; id?: string };
        gatewayBackend?: string;
        baseURL?: string;
      };
      enabled?: boolean;
      estimatedCostUsd?: number;
    }>;
  };
  budget: {
    remainingUsd?: number;
    limitUsd?: number;
  };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoutingPoliciesResponse = {
  policies: RoutingPolicyRow[];
  supportedModes: string[];
  unsupportedModes: string[];
};

export type RoutingSimulationResult = {
  blocked: boolean;
  selected: { candidateId: string; providerId: string; modelId: string; routeBackend: string } | null;
  eligibility: Array<{
    candidateId: string;
    capabilityStatus: string;
    pricingStatus: string;
    blockerCodes: string[];
    explanation: string;
  }>;
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
  configMode: "api_key" | "env_key" | "gateway_virtual_key_ref" | "local_cli_session" | "none_local";
  apiKey: string;
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

export type ProviderAuthSession = {
  providerRegistryId: "openai_codex";
  method: "chatgpt" | "chatgpt_device_code";
  status: "authorization_required" | "pending" | "ready" | "cancelled" | "failed";
  flowId: string;
  loginId: string;
  authUrl?: string;
  verificationUrl?: string;
  userCode?: string;
  startedAt: string;
  expiresAt: string;
  message: string;
};

function fallbackEnvName(provider: ProviderRow | null): string {
  if (!provider) return "PROVIDER_ENV_VAR";
  return `${provider.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_REF`;
}

function draftForProvider(provider: ProviderRow | null): ProviderDraft {
  if (!provider) {
    return {
      configMode: "env_key",
      apiKey: "",
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
      : provider.accessModes.includes("api_access") || provider.accessModes.includes("custom_openai_compatible")
        ? "api_key"
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
          : configuredSecret?.type === "env"
            ? provider.accessModes.includes("api_access") || provider.accessModes.includes("custom_openai_compatible")
              ? "api_key"
              : "env_key"
            : configuredSecret?.type === "stored_api_key"
              ? "api_key"
          : defaultMode,
    apiKey: "",
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ProviderStatusResult = {
  status?: string;
  message?: string;
};

export function buildPolicySimulationBody(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;
  const { estimatedCostUsd, operation, requirePricing, ...policy } = payload as {
    estimatedCostUsd?: number;
    operation?: string;
    requirePricing?: boolean;
    [key: string]: unknown;
  };
  return { policy, estimatedCostUsd, operation, requirePricing };
}

function canRefreshProviderWithDraft(provider: ProviderRow | null, draft: ProviderDraft): boolean {
  if (!provider || provider.status === "planned_source_review") return false;
  const requiresEndpoint = provider.modelStatus.refresh.requiresEndpoint;
  const hasConfiguredEndpoint = provider.configStatus.configured;
  const hasDraftEndpoint = draft.baseURL.trim().length > 0;
  const hasDefaultEndpoint = Boolean(provider.gatewayProfile?.defaultBaseUrl);
  return !requiresEndpoint || hasConfiguredEndpoint || hasDraftEndpoint || hasDefaultEndpoint;
}

export function ProviderCenter({
  initialData = null,
}: {
  initialData?: ProvidersResponse | null;
}) {
  const [data, setData] = useState<ProvidersResponse | null>(initialData);
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
  const [authSession, setAuthSession] = useState<ProviderAuthSession | null>(null);
  const [configuredAuthFlowId, setConfiguredAuthFlowId] = useState<string | null>(null);
  const configureProviderRef = useRef<() => Promise<boolean>>(async () => false);

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

  const handleSelectProvider = (provider: ProviderRow) => {
    setSelectedProviderId(provider.id);
    setDraft(draftForProvider(provider));
    setConfigureState({ status: "idle", message: null });
    setRefreshState({ status: "idle", message: null });
    setTestState({ status: "idle", message: null });
    setAuthSession(null);
    setConfiguredAuthFlowId(null);
  };

  const configureProvider = async (): Promise<boolean> => {
    if (!selectedProvider) return false;
    setConfigureState({ status: "running", message: "Saving provider credential configuration" });

    const secretRef =
      draft.configMode === "gateway_virtual_key_ref"
        ? { type: "gateway_virtual_key_ref", name: draft.gatewayRefName }
        : draft.configMode === "env_key"
          ? { type: "env", name: draft.envVarName }
          : draft.configMode === "api_key"
            ? undefined
            : { type: "none" };

    const payload = {
      providerRegistryId: selectedProvider.id,
      ...(selectedProvider.executableProviderId ? { provider: selectedProvider.executableProviderId } : {}),
      configMode: draft.configMode,
      ...(secretRef ? { secretRef } : {}),
      ...(draft.configMode === "api_key" && draft.apiKey ? { apiKey: draft.apiKey } : {}),
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
      return true;
    } catch (error) {
      setConfigureState({
        status: "error",
        message: error instanceof Error ? error.message : "Provider configuration failed",
      });
      return false;
    }
  };

  useEffect(() => {
    configureProviderRef.current = configureProvider;
  });

  const fetchProviderStatus = async (providerRegistryId: string): Promise<ProviderStatusResult> => {
    const response = await fetch("/api/providers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerRegistryId }),
    });
    const result = (await response.json()) as ProviderStatusResult;
    if (!response.ok) throw new Error(actionMessage(result, "Provider status test failed"));
    return result;
  };

  useEffect(() => {
    if (!authSession) return;
    if (authSession.providerRegistryId !== "openai_codex") return;
    if (!["authorization_required", "pending"].includes(authSession.status)) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/providers/auth/${authSession.flowId}/status`);
        const result = (await response.json()) as { session?: ProviderAuthSession; message?: string; error?: string };
        if (cancelled) return;
        if (!response.ok || !result.session) {
          throw new Error(actionMessage(result, "Codex authorization status failed"));
        }
        setAuthSession(result.session);
        if (result.session.status === "ready" && configuredAuthFlowId !== result.session.flowId) {
          setConfiguredAuthFlowId(result.session.flowId);
          setTestState({ status: "success", message: "OpenAI Codex auth ready" });
          void configureProviderRef.current();
        }
        if (result.session.status === "failed" || result.session.status === "cancelled") {
          setConfigureState({ status: "error", message: result.session.message });
        }
      } catch (error) {
        if (cancelled) return;
        setConfigureState({
          status: "error",
          message: error instanceof Error ? error.message : "Codex authorization status failed",
        });
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, 2_000);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [authSession, configuredAuthFlowId]);

  const startCodexAuth = async (): Promise<boolean> => {
    setConfigureState({ status: "running", message: "Starting OpenAI Codex authorization" });
    setTestState({ status: "idle", message: null });
    setAuthSession(null);
    setConfiguredAuthFlowId(null);

    try {
      const response = await fetch("/api/providers/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerRegistryId: "openai_codex",
          method: "chatgpt_device_code",
        }),
      });
      const result = (await response.json()) as { session?: ProviderAuthSession; message?: string; error?: string };
      if (!response.ok || !result.session) throw new Error(actionMessage(result, "OpenAI Codex authorization failed"));
      setAuthSession(result.session);
      setConfigureState({
        status: "running",
        message: "Open the authorization page and enter the displayed code.",
      });
      return true;
    } catch (error) {
      setConfigureState({
        status: "error",
        message: error instanceof Error ? error.message : "OpenAI Codex authorization failed",
      });
      return false;
    }
  };

  const cancelCodexAuth = async () => {
    if (!authSession) return;
    try {
      const response = await fetch(`/api/providers/auth/${authSession.flowId}/cancel`, {
        method: "POST",
      });
      const result = (await response.json()) as { session?: ProviderAuthSession };
      if (response.ok && result.session) setAuthSession(result.session);
    } finally {
      setConfigureState({ status: "idle", message: null });
    }
  };

  const connectLocalAuth = async (): Promise<boolean> => {
    if (!selectedProvider) return false;
    if (selectedProvider.id === "openai_codex") {
      return startCodexAuth();
    }

    setConfigureState({ status: "running", message: "Opening local auth flow" });
    setTestState({ status: "idle", message: null });

    try {
      const response = await fetch("/api/providers/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerRegistryId: selectedProvider.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(actionMessage(result, "Local auth connection failed"));

      if (result.status === "ready") {
        setTestState({ status: "success", message: "Local auth ready" });
        return await configureProvider();
      }

      setConfigureState({
        status: "running",
        message: actionMessage(result, "Complete the local CLI auth flow"),
      });

      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        await sleep(2_000);
        const status = await fetchProviderStatus(selectedProvider.id);
        if (status.status === "ready") {
          setTestState({ status: "success", message: "Local auth ready" });
          return await configureProvider();
        }
        if (status.status === "missing_local_cli") {
          throw new Error(actionMessage(status, "Local CLI is not installed or unavailable"));
        }
      }

      setConfigureState({
        status: "error",
        message: "Local auth flow opened. Finish sign-in, then click Connect again.",
      });
      return false;
    } catch (error) {
      setConfigureState({
        status: "error",
        message: error instanceof Error ? error.message : "Local auth connection failed",
      });
      return false;
    }
  };

  const deleteCredential = async () => {
    if (!selectedProvider) return;
    setConfigureState({ status: "running", message: "Deleting stored credential" });
    try {
      const response = await fetch("/api/providers/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerRegistryId: selectedProvider.id,
          action: "delete_credential",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(actionMessage(result, "Credential delete failed"));
      setConfigureState({ status: "success", message: "Stored credential deleted" });
      await loadProviders();
    } catch (error) {
      setConfigureState({
        status: "error",
        message: error instanceof Error ? error.message : "Credential delete failed",
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
      await loadProviders();
    } catch (error) {
      setRefreshState({
        status: "error",
        message: error instanceof Error ? error.message : "Model refresh failed",
      });
    }
  };

  return (
    <section className="min-w-0 space-y-5">
      <div>
        <p className="mb-2 text-[9px] tracking-widest text-sm-secondary font-label">[ LLM SETUP ]</p>
        <h2 className="mb-2 text-2xl font-bold text-sm-display">Provider Center</h2>
        <p className="max-w-4xl text-sm leading-relaxed text-sm-secondary">
          Pick an LLM provider. Enter an API key or connect supported auth. Retrieve current models, choose one, then create a skill.
        </p>
      </div>

      <label className="block border border-sm-border bg-sm-surface p-4">
        <span className="mb-1 block text-[9px] tracking-widest text-sm-secondary font-label">[ LLM PROVIDER ]</span>
        <span className="block border-b border-sm-border focus-within:border-sm-display">
          <select
            value={selectedProviderId}
            onChange={(event) => {
              const next = data?.providers.find((provider) => provider.id === event.target.value);
              if (next) handleSelectProvider(next);
            }}
            className="w-full bg-transparent py-2 text-base font-semibold text-sm-display outline-none"
          >
            {(data?.providers ?? []).map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </span>
      </label>

      <ProviderConfigPanel
        provider={selectedProvider}
        draft={draft}
        actionState={configureState}
        refreshState={refreshState}
        testState={testState}
        onDraftChange={setDraft}
        onSave={configureProvider}
        onConnectLocalAuth={connectLocalAuth}
        authSession={selectedProvider?.id === "openai_codex" ? authSession : null}
        onCancelAuth={cancelCodexAuth}
        onDeleteCredential={deleteCredential}
        onRefresh={refreshModels}
      />
      <div hidden>{loadState.message}</div>
    </section>
  );
}
