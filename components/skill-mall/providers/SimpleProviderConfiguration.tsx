"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProviderAuthSession, ProviderRow, ProvidersResponse } from "./ProviderCenter";

type ActionState = {
  status: "idle" | "running" | "success" | "error";
  message: string | null;
};

type ProviderFilter = "all" | "direct" | "auth" | "gateway" | "local" | "cloud" | "needs_work";
type ProviderCapability = Exclude<ProviderFilter, "all">;

const emptyActionState: ActionState = { status: "idle", message: null };

const filters: Array<{ id: ProviderFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "direct", label: "Direct" },
  { id: "auth", label: "Auth" },
  { id: "gateway", label: "Gateway" },
  { id: "local", label: "Local" },
  { id: "cloud", label: "Cloud" },
  { id: "needs_work", label: "Needs work" },
];

const directApiProviderIds = new Set(["openai", "anthropic", "gemini", "groq"]);
const authProviderIds = new Set(["openai_codex", "claude_code"]);

function actionClass(state: ActionState): string {
  if (state.status === "error") return "text-sm-accent";
  if (state.status === "success") return "text-sm-blue";
  return "text-sm-secondary";
}

function uniqueModels(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function modelsFor(provider: ProviderRow): string[] {
  return uniqueModels([provider.configStatus.activeModel, ...provider.modelStatus.models]).slice(0, 12);
}

function capabilityFor(provider: ProviderRow): ProviderCapability {
  if (authProviderIds.has(provider.id)) return "auth";
  if (directApiProviderIds.has(provider.id)) return "direct";
  if (provider.accessModes.includes("local_runtime") || provider.id === "ollama" || provider.id === "nvidia_nim") return "local";
  if (provider.accessModes.includes("cloud_project")) return "cloud";
  if (provider.gatewayProfile?.kind === "openai_compatible" || provider.accessModes.includes("gateway_virtual_key")) return "gateway";
  return "needs_work";
}

function capabilityLabel(capability: ProviderCapability): string {
  switch (capability) {
    case "direct":
      return "Direct API";
    case "auth":
      return "Auth token";
    case "gateway":
      return "Gateway";
    case "local":
      return "Local runtime";
    case "cloud":
      return "Cloud project";
    case "needs_work":
      return "Needs work";
  }
}

function rowStatus(provider: ProviderRow): string {
  const capability = capabilityFor(provider);
  if (provider.configStatus.configured) return "Configured";
  if (capability === "cloud") return "Needs project config";
  if (capability === "local") return provider.liveCallable ? "Local config" : "Status only";
  if (capability === "needs_work") return "Registry only";
  if (needsBaseURL(provider)) return "Needs base URL";
  return "Configurable";
}

function canUseApiKey(provider: ProviderRow): boolean {
  const capability = capabilityFor(provider);
  return capability === "direct" || capability === "gateway";
}

function canUseAuthToken(provider: ProviderRow): boolean {
  return authProviderIds.has(provider.id);
}

function canUseLocalRuntime(provider: ProviderRow): boolean {
  return provider.id === "ollama";
}

function needsBaseURL(provider: ProviderRow): boolean {
  return Boolean(provider.gatewayProfile?.requiresUserEndpoint || provider.id === "custom_openai_compatible");
}

function defaultBaseURL(provider: ProviderRow): string {
  return provider.gatewayProfile?.defaultBaseUrl ?? "";
}

function visibleHelp(provider: ProviderRow): string {
  const capability = capabilityFor(provider);
  if (capability === "direct") return "Store an app-managed API key and choose the model SkillMall should use.";
  if (capability === "auth") return "Use provider account or local-session authorization without storing an API key.";
  if (capability === "gateway") return "Store an API key and route through an OpenAI-compatible endpoint.";
  if (capability === "local") return "Use a local runtime already available on this machine.";
  if (capability === "cloud") return "Visible in the registry, but this needs project, region, and cloud credential fields before it can be configured here.";
  return "Visible in the registry, but no executable adapter or complete configuration form is available yet.";
}

function assertNoApiKeyUrl(session: ProviderAuthSession): void {
  const values = [session.authUrl, session.verificationUrl].filter(Boolean);
  if (values.some((value) => value?.toLowerCase().includes("platform.openai.com/api-key"))) {
    throw new Error("Auth token flow returned the OpenAI API-key page instead of an authorization page.");
  }
}

export function SimpleProviderConfiguration() {
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [loadState, setLoadState] = useState<ActionState>({ status: "running", message: "Loading provider configuration" });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProviderFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [baseURLs, setBaseURLs] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  const [refreshActions, setRefreshActions] = useState<Record<string, ActionState>>({});
  const [authSessions, setAuthSessions] = useState<Record<string, ProviderAuthSession>>({});

  const providers = useMemo(() => data?.providers ?? [], [data]);

  const filteredProviders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return providers.filter((provider) => {
      const capability = capabilityFor(provider);
      const matchesFilter = filter === "all" || capability === filter;
      const matchesQuery =
        !normalizedQuery ||
        provider.name.toLowerCase().includes(normalizedQuery) ||
        provider.id.toLowerCase().includes(normalizedQuery) ||
        provider.accessModes.some((mode) => mode.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [filter, providers, query]);

  const loadProviders = async () => {
    const response = await fetch("/api/providers");
    const payload = (await response.json()) as ProvidersResponse;
    if (!response.ok) throw new Error("Provider configuration failed to load");
    setData(payload);
    setExpandedId((current) => current ?? payload.activeProviderRegistryId ?? payload.providers[0]?.id ?? null);
    return payload;
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const payload = await loadProviders();
        if (!cancelled) {
          setLoadState({ status: "success", message: `${payload.providers.length} providers loaded` });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: error instanceof Error ? error.message : "Provider configuration failed to load",
          });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const setAction = (id: string, state: ActionState) => {
    setActions((current) => ({ ...current, [id]: state }));
  };

  const setRefreshAction = (id: string, state: ActionState) => {
    setRefreshActions((current) => ({ ...current, [id]: state }));
  };

  const selectedModelFor = (provider: ProviderRow) => selectedModels[provider.id] ?? modelsFor(provider)[0] ?? provider.configStatus.activeModel ?? "";

  const saveApiKey = async (provider: ProviderRow) => {
    const apiKey = apiKeys[provider.id]?.trim() ?? "";
    const model = selectedModelFor(provider);
    const baseURL = (baseURLs[provider.id] ?? defaultBaseURL(provider)).trim();
    setAction(provider.id, { status: "running", message: "Saving API key" });

    try {
      const response = await fetch("/api/providers/credentials/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerRegistryId: provider.id,
          apiKey,
          model,
          ...(baseURL ? { baseURL } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "API key save failed");
      setApiKeys((current) => ({ ...current, [provider.id]: "" }));
      setAction(provider.id, { status: "success", message: `Saved ${provider.name}` });
      await loadProviders();
    } catch (error) {
      setAction(provider.id, { status: "error", message: error instanceof Error ? error.message : "API key save failed" });
    }
  };

  const refreshModels = async (provider: ProviderRow) => {
    setRefreshAction(provider.id, { status: "running", message: "Pulling latest models" });

    try {
      const response = await fetch("/api/providers/models/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerRegistryId: provider.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Model refresh failed");
      const models = Array.isArray(result.discovery?.models) ? (result.discovery.models as string[]) : [];
      if (models[0]) {
        setSelectedModels((current) => ({ ...current, [provider.id]: models[0] }));
      }
      setRefreshAction(provider.id, { status: "success", message: `${models.length} models pulled` });
      await loadProviders();
    } catch (error) {
      setRefreshAction(provider.id, { status: "error", message: error instanceof Error ? error.message : "Model refresh failed" });
    }
  };

  const saveAuthModel = async (provider: ProviderRow) => {
    const model = selectedModelFor(provider);
    const isCodex = provider.id === "openai_codex";
    setAction(provider.id, { status: "running", message: "Saving auth-token model" });

    try {
      const response = await fetch("/api/providers/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerRegistryId: provider.id,
          provider: isCodex ? "codex" : "claude-code",
          configMode: isCodex ? "codex_app_server" : "local_cli_session",
          secretRef: { type: "none" },
          gatewayBackend: "direct",
          model,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Auth-token model save failed");
      setAction(provider.id, { status: "success", message: `Saved ${result.model ?? model}` });
      await loadProviders();
    } catch (error) {
      setAction(provider.id, { status: "error", message: error instanceof Error ? error.message : "Auth-token model save failed" });
    }
  };

  const enableAuthToken = async (provider: ProviderRow) => {
    if (provider.id === "claude_code") {
      await saveAuthModel(provider);
      return;
    }

    setAction(provider.id, { status: "running", message: "Starting authorization" });

    try {
      const response = await fetch("/api/providers/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerRegistryId: "openai_codex", method: "chatgpt_device_code" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Auth token flow failed");
      const session = result.session as ProviderAuthSession;
      assertNoApiKeyUrl(session);
      setAuthSessions((current) => ({ ...current, [provider.id]: session }));
      setAction(provider.id, { status: "success", message: "Authorization ready" });
    } catch (error) {
      setAction(provider.id, { status: "error", message: error instanceof Error ? error.message : "Auth token flow failed" });
    }
  };

  const saveLocalRuntime = async (provider: ProviderRow) => {
    const model = selectedModelFor(provider);
    setAction(provider.id, { status: "running", message: "Saving local runtime" });

    try {
      const response = await fetch("/api/providers/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerRegistryId: provider.id,
          provider: "ollama",
          configMode: "none_local",
          secretRef: { type: "none" },
          gatewayBackend: "direct",
          model,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Local runtime save failed");
      setAction(provider.id, { status: "success", message: `Saved ${result.model ?? model}` });
      await loadProviders();
    } catch (error) {
      setAction(provider.id, { status: "error", message: error instanceof Error ? error.message : "Local runtime save failed" });
    }
  };

  return (
    <section className="min-w-0 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-sm-display">Provider Configuration</h2>
        <p className="max-w-3xl text-sm leading-6 text-sm-secondary">
          Find a provider, expand it, then configure only the credential method that applies. Registry-only providers stay visible without pretending they are ready.
        </p>
        {loadState.message && <p className={`text-sm ${actionClass(loadState)}`}>{loadState.message}</p>}
      </div>

      <div className="space-y-3 border border-sm-border bg-sm-surface p-4">
        <label className="block">
          <span className="mb-2 block text-[9px] tracking-widest text-sm-disabled font-label">[ SEARCH PROVIDERS ]</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by provider, capability, or registry id"
            className="h-11 w-full border-b border-sm-border bg-transparent text-sm text-sm-primary outline-none transition-colors placeholder:text-sm-disabled focus:border-sm-display"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`border px-3 py-2 text-[10px] tracking-widest transition-colors font-label ${
                filter === item.id
                  ? "border-sm-display bg-sm-display text-sm-bg"
                  : "border-sm-border text-sm-secondary hover:border-sm-display hover:text-sm-display"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredProviders.map((provider) => (
          <ProviderDirectoryRow
            key={provider.id}
            provider={provider}
            expanded={expandedId === provider.id}
            selectedModel={selectedModelFor(provider)}
            apiKey={apiKeys[provider.id] ?? ""}
            baseURL={baseURLs[provider.id] ?? defaultBaseURL(provider)}
            action={actions[provider.id] ?? emptyActionState}
            refreshAction={refreshActions[provider.id] ?? emptyActionState}
            authSession={authSessions[provider.id] ?? null}
            onToggle={() => setExpandedId((current) => (current === provider.id ? null : provider.id))}
            onApiKeyChange={(value) => setApiKeys((current) => ({ ...current, [provider.id]: value }))}
            onBaseURLChange={(value) => setBaseURLs((current) => ({ ...current, [provider.id]: value }))}
            onModelChange={(model) => setSelectedModels((current) => ({ ...current, [provider.id]: model }))}
            onSaveApiKey={() => saveApiKey(provider)}
            onRefreshModels={() => refreshModels(provider)}
            onEnableAuth={() => enableAuthToken(provider)}
            onSaveAuthModel={() => saveAuthModel(provider)}
            onSaveLocalRuntime={() => saveLocalRuntime(provider)}
          />
        ))}
      </div>
    </section>
  );
}

function ProviderDirectoryRow({
  provider,
  expanded,
  selectedModel,
  apiKey,
  baseURL,
  action,
  refreshAction,
  authSession,
  onToggle,
  onApiKeyChange,
  onBaseURLChange,
  onModelChange,
  onSaveApiKey,
  onRefreshModels,
  onEnableAuth,
  onSaveAuthModel,
  onSaveLocalRuntime,
}: {
  provider: ProviderRow;
  expanded: boolean;
  selectedModel: string;
  apiKey: string;
  baseURL: string;
  action: ActionState;
  refreshAction: ActionState;
  authSession: ProviderAuthSession | null;
  onToggle: () => void;
  onApiKeyChange: (value: string) => void;
  onBaseURLChange: (value: string) => void;
  onModelChange: (model: string) => void;
  onSaveApiKey: () => void;
  onRefreshModels: () => void;
  onEnableAuth: () => void;
  onSaveAuthModel: () => void;
  onSaveLocalRuntime: () => void;
}) {
  const capability = capabilityFor(provider);
  const models = modelsFor(provider);

  return (
    <section className="border border-sm-border bg-sm-surface transition-colors hover:border-sm-display">
      <button type="button" onClick={onToggle} className="block w-full p-4 text-left">
        <span className="flex flex-wrap items-start justify-between gap-3">
          <span>
            <span className="block text-base font-semibold text-sm-display">{provider.name}</span>
            <span className="mt-1 block text-xs text-sm-disabled">{provider.id}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="border border-sm-border px-2 py-1 text-[9px] tracking-widest text-sm-secondary font-label">
              {capabilityLabel(capability)}
            </span>
            <span className="border border-sm-border-subtle px-2 py-1 text-[9px] tracking-widest text-sm-disabled font-label">
              {rowStatus(provider)}
            </span>
            <span className="text-sm text-sm-secondary">{expanded ? "Collapse" : "Configure"}</span>
          </span>
        </span>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-sm-border-subtle p-4">
          <p className="max-w-3xl text-sm leading-6 text-sm-secondary">{visibleHelp(provider)}</p>

          {canUseApiKey(provider) && (
            <ApiKeyConfig
              provider={provider}
              apiKey={apiKey}
              baseURL={baseURL}
              selectedModel={selectedModel}
              models={models}
              action={action}
              refreshAction={refreshAction}
              onApiKeyChange={onApiKeyChange}
              onBaseURLChange={onBaseURLChange}
              onModelChange={onModelChange}
              onSaveApiKey={onSaveApiKey}
              onRefreshModels={onRefreshModels}
            />
          )}

          {canUseAuthToken(provider) && (
            <AuthConfig
              provider={provider}
              selectedModel={selectedModel}
              models={models}
              action={action}
              authSession={authSession}
              onModelChange={onModelChange}
              onEnableAuth={onEnableAuth}
              onSaveAuthModel={onSaveAuthModel}
            />
          )}

          {canUseLocalRuntime(provider) && (
            <LocalRuntimeConfig
              provider={provider}
              selectedModel={selectedModel}
              models={models}
              action={action}
              onModelChange={onModelChange}
              onSaveLocalRuntime={onSaveLocalRuntime}
            />
          )}

          {!canUseApiKey(provider) && !canUseAuthToken(provider) && !canUseLocalRuntime(provider) && (
            <p className="border border-sm-border-subtle bg-sm-bg p-4 text-sm leading-6 text-sm-secondary">
              This provider is in the registry, but the current app does not have the complete configuration form needed to activate it here.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ModelRows({
  models,
  selectedModel,
  onModelChange,
}: {
  models: string[];
  selectedModel: string;
  onModelChange: (model: string) => void;
}) {
  if (models.length === 0) {
    return <p className="text-sm text-sm-disabled">No cached models are available yet.</p>;
  }

  return (
    <div className="max-w-3xl space-y-2">
      {models.map((model) => (
        <button
          key={model}
          type="button"
          onClick={() => onModelChange(model)}
          className={`block w-full border px-4 py-3 text-left text-sm transition-colors ${
            selectedModel === model
              ? "border-sm-display bg-sm-display text-sm-bg"
              : "border-sm-border bg-sm-surface text-sm-primary hover:border-sm-display"
          }`}
        >
          <span className="font-medium">{model}</span>
          {selectedModel === model && <span className="ml-3 text-xs text-sm-bg">Selected</span>}
        </button>
      ))}
    </div>
  );
}

function ApiKeyConfig({
  provider,
  apiKey,
  baseURL,
  selectedModel,
  models,
  action,
  refreshAction,
  onApiKeyChange,
  onBaseURLChange,
  onModelChange,
  onSaveApiKey,
  onRefreshModels,
}: {
  provider: ProviderRow;
  apiKey: string;
  baseURL: string;
  selectedModel: string;
  models: string[];
  action: ActionState;
  refreshAction: ActionState;
  onApiKeyChange: (value: string) => void;
  onBaseURLChange: (value: string) => void;
  onModelChange: (model: string) => void;
  onSaveApiKey: () => void;
  onRefreshModels: () => void;
}) {
  return (
    <div className="space-y-5">
      <label className="block max-w-2xl">
        <span className="mb-2 block text-sm font-semibold text-sm-primary">API key</span>
        <input
          type="password"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder={`${provider.name} API key`}
          className="h-12 w-full border border-sm-border bg-sm-surface px-4 text-sm text-sm-primary outline-none transition-colors placeholder:text-sm-disabled focus:border-sm-display"
        />
      </label>

      {(provider.gatewayProfile?.kind === "openai_compatible" && !directApiProviderIds.has(provider.id)) && (
        <label className="block max-w-2xl">
          <span className="mb-2 block text-sm font-semibold text-sm-primary">Base URL</span>
          <input
            value={baseURL}
            onChange={(event) => onBaseURLChange(event.target.value)}
            placeholder="https://provider.example.com/v1"
            className="h-12 w-full border border-sm-border bg-sm-surface px-4 text-sm text-sm-primary outline-none transition-colors placeholder:text-sm-disabled focus:border-sm-display"
          />
          {needsBaseURL(provider) && <span className="mt-2 block text-xs text-sm-disabled">Required for this provider.</span>}
        </label>
      )}

      <div className="space-y-3 border-t border-sm-border-subtle pt-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-sm-primary">Model</p>
          <p className="text-sm leading-6 text-sm-secondary">Choose the model this provider should use.</p>
        </div>
        <ModelRows models={models} selectedModel={selectedModel} onModelChange={onModelChange} />
        <button
          type="button"
          onClick={onRefreshModels}
          disabled={refreshAction.status === "running"}
          className="border border-sm-border px-4 py-2 text-[10px] tracking-widest text-sm-secondary hover:border-sm-display hover:text-sm-display disabled:opacity-40 font-label"
        >
          Refresh models
        </button>
        {refreshAction.message && <p className={`text-sm ${actionClass(refreshAction)}`}>{refreshAction.message}</p>}
      </div>

      <button
        type="button"
        onClick={onSaveApiKey}
        disabled={!apiKey.trim() || action.status === "running" || (needsBaseURL(provider) && !baseURL.trim())}
        className="bg-sm-display px-5 py-3 text-[10px] tracking-widest text-sm-bg transition-opacity hover:opacity-80 disabled:opacity-30 font-label"
      >
        Save API key
      </button>
      {action.message && <p className={`text-sm ${actionClass(action)}`}>{action.message}</p>}
    </div>
  );
}

function AuthConfig({
  provider,
  selectedModel,
  models,
  action,
  authSession,
  onModelChange,
  onEnableAuth,
  onSaveAuthModel,
}: {
  provider: ProviderRow;
  selectedModel: string;
  models: string[];
  action: ActionState;
  authSession: ProviderAuthSession | null;
  onModelChange: (model: string) => void;
  onEnableAuth: () => void;
  onSaveAuthModel: () => void;
}) {
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onEnableAuth}
        disabled={action.status === "running"}
        className="bg-sm-display px-5 py-3 text-[10px] tracking-widest text-sm-bg transition-opacity hover:opacity-80 disabled:opacity-30 font-label"
      >
        Enable auth token
      </button>
      {action.message && <p className={`text-sm ${actionClass(action)}`}>{action.message}</p>}
      {provider.id === "claude_code" && (
        <p className="max-w-2xl text-sm leading-6 text-sm-secondary">
          Claude Code uses the local CLI session on this machine. Enable saves this provider with the selected model.
        </p>
      )}
      {authSession && (
        <div className="max-w-3xl border border-sm-border-subtle bg-sm-bg p-4 text-sm text-sm-secondary">
          {authSession.authUrl && (
            <a className="font-medium text-sm-blue hover:underline" href={authSession.authUrl} target="_blank" rel="noopener noreferrer">
              Open authorization page
            </a>
          )}
          {authSession.verificationUrl && (
            <a className="block font-medium text-sm-blue hover:underline" href={authSession.verificationUrl} target="_blank" rel="noopener noreferrer">
              Open authorization page
            </a>
          )}
          {authSession.userCode && (
            <p className="mt-2">
              User code: <span className="font-semibold text-sm-primary">{authSession.userCode}</span>
            </p>
          )}
          <p className="mt-2">{authSession.message}</p>
        </div>
      )}

      <div className="space-y-3 border-t border-sm-border-subtle pt-5">
        <p className="text-sm font-semibold text-sm-primary">Model</p>
        <ModelRows models={models} selectedModel={selectedModel} onModelChange={onModelChange} />
        <button
          type="button"
          onClick={onSaveAuthModel}
          disabled={action.status === "running"}
          className="border border-sm-border px-5 py-3 text-[10px] tracking-widest text-sm-secondary hover:border-sm-display hover:text-sm-display disabled:opacity-40 font-label"
        >
          Save model
        </button>
      </div>
    </div>
  );
}

function LocalRuntimeConfig({
  provider,
  selectedModel,
  models,
  action,
  onModelChange,
  onSaveLocalRuntime,
}: {
  provider: ProviderRow;
  selectedModel: string;
  models: string[];
  action: ActionState;
  onModelChange: (model: string) => void;
  onSaveLocalRuntime: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm leading-6 text-sm-secondary">
        {provider.name} is configured through the local runtime on this machine.
      </p>
      <ModelRows models={models} selectedModel={selectedModel} onModelChange={onModelChange} />
      <button
        type="button"
        onClick={onSaveLocalRuntime}
        disabled={action.status === "running"}
        className="bg-sm-display px-5 py-3 text-[10px] tracking-widest text-sm-bg transition-opacity hover:opacity-80 disabled:opacity-30 font-label"
      >
        Save local runtime
      </button>
      {action.message && <p className={`text-sm ${actionClass(action)}`}>{action.message}</p>}
    </div>
  );
}
