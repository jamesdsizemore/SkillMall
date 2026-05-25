import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProviderCenter,
  buildPolicySimulationBody,
  type ProviderDraft,
  type ProviderRow,
  type ProvidersResponse,
  type UsageResponse,
} from "../ProviderCenter";
import { ProviderConfigPanel } from "../ProviderConfigPanel";
import { PolicyControlPanel } from "../PolicyControlPanel";
import { UsageCostPanel } from "../UsageCostPanel";

function provider(overrides: Partial<ProviderRow>): ProviderRow {
  return {
    id: "openai",
    name: "OpenAI API",
    accessModes: ["api_access", "gateway_virtual_key"],
    accessLabel: "API access or gateway access",
    authLabel: "Environment variable API key reference",
    setupUrl: "https://example.com/setup",
    officialSourceUrl: "https://example.com/source",
    discoveryStrategy: "openai_compatible_models",
    status: "active_configurable",
    classification: "gateway_configurable_openai_compatible",
    liveCallable: true,
    executableProviderId: "openai",
    gatewayProfile: {
      kind: "openai_compatible",
      defaultBaseUrl: "https://api.example.com/v1",
      requiresUserEndpoint: false,
      note: "Gateway backend can route through an OpenAI-compatible endpoint.",
    },
    registryInclusionNote: "Executable provider plus registry row.",
    evidenceNote: "Official source supports model discovery.",
    configStatus: {
      configured: false,
      authMode: null,
      gatewayBackend: null,
      accessLabel: null,
      secretRef: null,
      secretStatus: null,
      baseURL: null,
      routingPolicyId: null,
      activeModel: null,
    },
    modelStatus: {
      strategy: "openai_compatible_models",
      source: "fallback",
      authoritative: false,
      stale: true,
      modelCount: 1,
      lastCheckedAt: null,
      blocker: "Refresh by probing the configured models endpoint.",
      models: ["model-a"],
      capabilityStatus: {
        capableModelCount: 0,
        sources: ["fallback"],
        confidences: ["fallback"],
        blockers: ["fallback_only", "missing_metadata"],
      },
      refresh: {
        strategy: "openai_compatible_models",
        canRefreshNow: true,
        liveCallable: true,
        requiresEndpoint: true,
        requiresProviderAdapter: false,
        requiresAccountContext: false,
        requiresProjectContext: false,
        requiresLocalRuntime: false,
        requiresManualModels: false,
        message: "Refresh by probing the configured models endpoint.",
      },
    },
    costStatus: {
      actual_cost_usd: null,
      estimated_cost_usd: null,
      note: "Use usage summary.",
    },
    ...overrides,
  };
}

const providersResponse: ProvidersResponse = {
  configured: true,
  activeProvider: "openai",
  activeProviderRegistryId: "openai",
  executionKind: "direct",
  activeModel: "model-a",
  authMode: "env_key",
  gatewayBackend: "direct",
  accessLabel: "api_access",
  secretRef: { type: "env", name: "OPENAI_API_REF" },
  secretStatus: { type: "env", name: "OPENAI_API_REF", valuePresent: true, source: "reference_only" },
  baseURL: null,
  routingPolicyId: null,
  warnings: [],
  providers: [
    provider({ id: "openai", name: "OpenAI API" }),
    provider({
      id: "openai_codex",
      name: "OpenAI Codex Auth Token",
      accessModes: ["local_tool_session"],
      accessLabel: "OpenAI Codex local auth token/session",
      authLabel: "Existing OpenAI Codex authentication",
      classification: "local_tool_session",
      discoveryStrategy: "static_fallback_only",
      executableProviderId: "codex",
      gatewayProfile: null,
    }),
    provider({
      id: "anthropic",
      name: "Anthropic Claude API",
      accessModes: ["api_access"],
      accessLabel: "API access",
      classification: "active_configurable",
      discoveryStrategy: "official_provider_models",
      executableProviderId: "anthropic",
      gatewayProfile: null,
    }),
    provider({
      id: "claude_code",
      name: "Claude Code CLI Auth Token",
      accessModes: ["local_tool_session"],
      accessLabel: "Local CLI/session access",
      classification: "local_tool_session",
      discoveryStrategy: "static_fallback_only",
      executableProviderId: "claude-code",
      gatewayProfile: null,
    }),
    provider({
      id: "ollama",
      name: "Ollama",
      accessModes: ["local_runtime"],
      accessLabel: "Local runtime",
      classification: "local_runtime",
      discoveryStrategy: "local_runtime_models",
      executableProviderId: "ollama",
    }),
    provider({
      id: "openrouter",
      name: "OpenRouter",
      executableProviderId: null,
    }),
    provider({
      id: "azure_openai",
      name: "Azure OpenAI",
      accessModes: ["cloud_project"],
      accessLabel: "Cloud project",
      classification: "cloud_project_required",
      discoveryStrategy: "cloud_project_scoped_models",
      executableProviderId: null,
      gatewayProfile: null,
    }),
    provider({
      id: "alibaba_dashscope_qwen",
      name: "Alibaba Cloud Model Studio / DashScope / Qwen",
      accessModes: ["api_access"],
      accessLabel: "API access",
      status: "planned_source_review",
      classification: "planned_provider_source_review",
      discoveryStrategy: "planned_provider_source_review",
      liveCallable: false,
      executableProviderId: null,
      gatewayProfile: null,
    }),
    provider({
      id: "custom_openai_compatible",
      name: "Custom OpenAI-Compatible Endpoint",
      accessModes: ["custom_openai_compatible", "gateway_virtual_key"],
      accessLabel: "Custom OpenAI-compatible",
      classification: "custom_openai_compatible",
      discoveryStrategy: "manual_custom_models",
      executableProviderId: null,
      gatewayProfile: {
        kind: "openai_compatible",
        defaultBaseUrl: null,
        requiresUserEndpoint: true,
        note: "User supplied compatible endpoint.",
      },
    }),
  ],
};

const usageResponse: UsageResponse = {
  available: true,
  summary: {
    request_count: 3,
    succeeded_count: 2,
    failed_count: 1,
    input_tokens: 100,
    output_tokens: 50,
    actual_cost_usd: 0.5,
    estimated_cost_usd: 0.25,
  },
  byProvider: [
    {
      provider_id: "openai",
      request_count: 3,
      succeeded_count: 2,
      failed_count: 1,
      input_tokens: 100,
      output_tokens: 50,
      actual_cost_usd: 0.5,
      estimated_cost_usd: 0.25,
    },
  ],
  costLabels: {
    actual_cost_usd: "provider_or_gateway_reported_actual_cost",
    estimated_cost_usd: "locally_estimated_cost",
  },
};

describe("Provider Center UI", () => {
  it("renders the simple primary LLM setup flow without provider-center plumbing", () => {
    const html = renderToStaticMarkup(<ProviderCenter initialData={providersResponse} />);

    expect(html).toContain("Provider Center");
    expect(html).toContain("LLM PROVIDER");
    expect(html).toContain("OpenAI Codex Auth Token");
    expect(html).toContain("Claude Code CLI Auth Token");
    expect(html).toContain("API KEY");
    expect(html).toContain("MODELS");
    expect(html).toContain("RETRIEVE CURRENT MODELS");
    expect(html).toContain("SELECT MODEL");
    expect(html).not.toContain("SELECTED PROVIDER");
    expect(html).not.toContain("NEXT SAFE ACTION");
    expect(html).not.toContain("STAGE 3 / LOCAL ROUTING POLICY");
    expect(html).not.toContain("STAGE 4 / USAGE + COST");
    expect(html).not.toContain("CREDENTIAL TYPE");
    expect(html).not.toContain("USE FOR SKILL CREATION");
    expect(html).not.toContain("API providers");
    expect(html).not.toContain("MODEL COUNT");
  });

  it("renders approved credential entry without unsafe credential prompts", () => {
    const html = renderToStaticMarkup(<ProviderCenter initialData={providersResponse} />);

    expect(html).not.toMatch(/apiKey/i);
    expect(html).not.toMatch(/sk-\.\.\.|sk-[A-Za-z0-9_-]+/);
    expect(html).toMatch(/type="password"/);
    expect(html).toContain("API KEY");
    expect(html).not.toMatch(/browser token/i);
    expect(html).not.toMatch(/session token/i);
    expect(html).not.toMatch(/credential path/i);
  });

  it("renders Codex and Claude Code as direct local auth-token connection paths", () => {
    const codex = providersResponse.providers.find((row) => row.id === "openai_codex");
    const claude = providersResponse.providers.find((row) => row.id === "claude_code");
    const localDraft: ProviderDraft = {
      configMode: "local_cli_session",
      apiKey: "",
      envVarName: "LOCAL_SESSION_REF",
      gatewayRefName: "BIFROST_VIRTUAL_KEY",
      baseURL: "",
      model: "gpt-5.1",
      manualModels: "gpt-5.1",
      routingPolicyId: "",
    };

    const codexHtml = renderToStaticMarkup(
      <ProviderConfigPanel
        provider={codex ?? null}
        draft={localDraft}
        actionState={{ status: "idle", message: null }}
        onDraftChange={() => undefined}
        onSave={async () => true}
      />
    );
    const claudeHtml = renderToStaticMarkup(
      <ProviderConfigPanel
        provider={claude ?? null}
        draft={{ ...localDraft, model: "claude-sonnet-4-6", manualModels: "claude-sonnet-4-6" }}
        actionState={{ status: "idle", message: null }}
        onDraftChange={() => undefined}
        onSave={async () => true}
      />
    );

    expect(codexHtml).toContain("CONNECT OPENAI CODEX");
    expect(claudeHtml).toContain("CONNECT CLAUDE CODE");
    expect(codexHtml).not.toContain("CREDENTIAL TYPE");
    expect(claudeHtml).not.toContain("CREDENTIAL TYPE");
    expect(codexHtml).not.toMatch(/type="password"/);
    expect(claudeHtml).not.toMatch(/type="password"/);
  });

  it("renders actual and estimated usage cost labels distinctly", () => {
    const html = renderToStaticMarkup(<UsageCostPanel usage={usageResponse} activeProviderId="openai" />);

    expect(html).toContain("ACTUAL COST USD");
    expect(html).toContain("ESTIMATED COST USD");
    expect(html).toContain("REFRESH PRICING");
    expect(html).toContain("PRICING SOURCE");
    expect(html).toContain("provider_or_gateway_reported_actual_cost");
    expect(html).toContain("locally_estimated_cost");
  });

  it("renders routing policy and budget controls without unsupported modes", () => {
    const html = renderToStaticMarkup(
      <PolicyControlPanel
        provider={providersResponse.providers[0]}
        providerDraft={{
          configMode: "api_key",
          apiKey: "",
          envVarName: "OPENAI_API_REF",
          gatewayRefName: "BIFROST_VIRTUAL_KEY",
          baseURL: "",
          model: "model-a",
          manualModels: "model-a",
          routingPolicyId: "budget-openai",
        }}
        policies={[
          {
            id: "budget-openai",
            name: "Budget OpenAI",
            mode: "budget_guarded_manual",
            rules: {
              candidates: [
                {
                  id: "api",
                  config: {
                    provider: "openai",
                    providerRegistryId: "openai",
                    model: "model-a",
                    authMode: "env_key",
                    secretRef: { type: "env", name: "OPENAI_API_REF" },
                    gatewayBackend: "direct",
                  },
                  estimatedCostUsd: 0.02,
                },
              ],
            },
            budget: { remainingUsd: 0.01, limitUsd: 20 },
            enabled: true,
            createdAt: "2026-05-20T10:00:00.000Z",
            updatedAt: "2026-05-20T10:00:00.000Z",
          },
        ]}
        supportedModes={["manual", "fallback_chain", "local_first", "budget_guarded_manual"]}
        activeRoutingPolicyId="budget-openai"
        actionState={{ status: "idle", message: null }}
        onSavePolicy={() => undefined}
        onActivatePolicy={() => undefined}
        onTogglePolicy={() => undefined}
        onSimulatePolicy={() => undefined}
        simulationResult={null}
      />
    );

    expect(html).toContain("STAGE 3 / LOCAL ROUTING POLICY");
    expect(html).toContain("Budget OpenAI");
    expect(html).toContain("budget_guarded_manual");
    expect(html).toContain("SAVE POLICY");
    expect(html).toContain("SIMULATE");
    expect(html).toContain("OPERATION");
    expect(html).toContain("REQUIRE PRICING");
    expect(html).not.toContain("quality_first");
    expect(html).not.toContain("semantic_router");
  });

  it("keeps operation and requirePricing as top-level simulation fields", () => {
    const body = buildPolicySimulationBody({
      id: "budget-openai",
      name: "Budget OpenAI",
      mode: "budget_guarded_manual",
      rules: { candidates: [] },
      budget: { remainingUsd: 1 },
      estimatedCostUsd: 0.02,
      operation: "chat.text",
      requirePricing: true,
    });

    expect(body).toEqual({
      policy: {
        id: "budget-openai",
        name: "Budget OpenAI",
        mode: "budget_guarded_manual",
        rules: { candidates: [] },
        budget: { remainingUsd: 1 },
      },
      estimatedCostUsd: 0.02,
      operation: "chat.text",
      requirePricing: true,
    });
  });

  it("uses the configured active model instead of the routing policy or fallback model", () => {
    const configuredOpenAI = provider({
      id: "openai",
      name: "OpenAI API",
      configStatus: {
        configured: true,
        authMode: "env_key",
        gatewayBackend: "direct",
        accessLabel: "api_access",
        secretRef: { type: "env", name: "OPENAI_API_REF" },
        secretStatus: { type: "env", name: "OPENAI_API_REF", valuePresent: true, source: "reference_only" },
        baseURL: null,
        routingPolicyId: "policy-not-a-model",
        activeModel: "configured-live-model",
      },
      modelStatus: {
        ...provider({}).modelStatus,
        models: ["fallback-not-active"],
      },
    });
    const html = renderToStaticMarkup(
      <ProviderCenter
        initialData={{
          ...providersResponse,
          activeModel: "configured-live-model",
          providers: [configuredOpenAI],
        }}
      />
    );

    const modelField = html.match(/\[ SELECT MODEL \][\s\S]*?<\/label>/)?.[0] ?? "";
    expect(html).toContain("configured-live-model");
    expect(modelField).toContain('value="configured-live-model"');
    expect(modelField).not.toContain('value="policy-not-a-model"');
  });

  it("disables model refresh for unconfigured endpoint-required rows", () => {
    const html = renderToStaticMarkup(
      <ProviderCenter
        initialData={{
          ...providersResponse,
          configured: false,
          activeProvider: null,
          activeProviderRegistryId: null,
          activeModel: null,
          providers: [
            provider({
              id: "openrouter",
              name: "OpenRouter",
              executableProviderId: null,
              configStatus: {
                configured: false,
                authMode: null,
                gatewayBackend: null,
                accessLabel: null,
                secretRef: null,
                secretStatus: null,
                baseURL: null,
                routingPolicyId: null,
                activeModel: null,
              },
            }),
          ],
        }}
      />
    );

    const refreshButton = html.match(/<button[^>]*>\[ RETRIEVE CURRENT MODELS \]<\/button>/)?.[0] ?? "";
    expect(refreshButton).toContain("disabled");
  });

  it("renders reference, gateway, manual model, and endpoint fields without raw secret inputs", () => {
    const custom = providersResponse.providers.find((row) => row.id === "custom_openai_compatible");
    const draft: ProviderDraft = {
      configMode: "gateway_virtual_key_ref",
      apiKey: "",
      envVarName: "CUSTOM_LLM_REF",
      gatewayRefName: "BIFROST_VIRTUAL_KEY",
      baseURL: "http://localhost:4000/v1",
      model: "custom-chat",
      manualModels: "custom-chat, custom-fast",
      routingPolicyId: "manual",
    };

    const html = renderToStaticMarkup(
      <ProviderConfigPanel
        provider={custom ?? null}
        draft={draft}
        actionState={{ status: "idle", message: null }}
        onDraftChange={() => undefined}
        onSave={async () => true}
      />
    );

    expect(html).toContain("GATEWAY REF NAME");
    expect(html).toContain("OPENAI-COMPATIBLE BASE URL");
    expect(html).toContain("SELECT MODEL");
    expect(html).toContain("MANUAL MODEL LABELS");
    expect(html).toContain("ADVANCED");
    expect(html).not.toMatch(/apiKey/i);
    expect(html).not.toMatch(/credential path/i);
  });

  it("defaults API-backed providers to app-managed API credential setup", () => {
    const html = renderToStaticMarkup(
      <ProviderCenter
        initialData={{
          ...providersResponse,
          configured: false,
          activeProvider: null,
          activeProviderRegistryId: null,
          activeModel: null,
          providers: [provider({ id: "openai", name: "OpenAI API" })],
        }}
      />
    );

    expect(html).toContain("API KEY");
    expect(html).toContain("type=\"password\"");
    expect(html).toContain("Encrypted local storage");
    expect(html).toContain("SAVE API KEY ONLY");
    expect(html).not.toMatch(/browser session/i);
    expect(html).not.toMatch(/credential file path/i);
  });

  it("shows redacted stored credential status and delete control for configured API credentials", () => {
    const configured = provider({
      id: "openai",
      name: "OpenAI API",
      configStatus: {
        configured: true,
        authMode: "env_key",
        gatewayBackend: "direct",
        accessLabel: "api_access",
        secretRef: { type: "stored_api_key", id: "provider:openai:api_key" },
        secretStatus: {
          type: "stored_api_key",
          id: "provider:openai:api_key",
          valuePresent: true,
          source: "encrypted_local_store",
        },
        baseURL: null,
        routingPolicyId: null,
        activeModel: "model-a",
      },
    });
    const draft = {
      configMode: "api_key",
      apiKey: "",
      envVarName: "OPENAI_API_KEY",
      gatewayRefName: "BIFROST_VIRTUAL_KEY",
      baseURL: "",
      model: "model-a",
      manualModels: "model-a",
      routingPolicyId: "",
    } as ProviderDraft;

    const html = renderToStaticMarkup(
      <ProviderConfigPanel
        provider={configured}
        draft={draft}
        actionState={{ status: "idle", message: null }}
        onDraftChange={() => undefined}
        onSave={async () => true}
        onDeleteCredential={() => undefined}
      />
    );

    expect(html).toContain("Stored credential present");
    expect(html).toContain("DELETE STORED CREDENTIAL");
    expect(html).not.toContain("sk-");
    expect(html).not.toMatch(/credential file/i);
  });

  it("explains blocked source-review setup without enabling save", () => {
    const sourceReview = providersResponse.providers.find((row) => row.id === "alibaba_dashscope_qwen");
    const draft: ProviderDraft = {
      configMode: "env_key",
      apiKey: "",
      envVarName: "ALIBABA_DASHSCOPE_API_KEY",
      gatewayRefName: "BIFROST_VIRTUAL_KEY",
      baseURL: "",
      model: "qwen-model",
      manualModels: "",
      routingPolicyId: "",
    };

    const html = renderToStaticMarkup(
      <ProviderConfigPanel
        provider={sourceReview ?? null}
        draft={draft}
        actionState={{ status: "idle", message: null }}
        onDraftChange={() => undefined}
        onSave={async () => true}
      />
    );

    const saveButton = html.match(/<button[^>]*>\[ SAVE CONFIG \]<\/button>/)?.[0] ?? "";
    expect(html).toContain("SOURCE REVIEW REQUIRED");
    expect(saveButton).toContain("disabled");
  });
});
