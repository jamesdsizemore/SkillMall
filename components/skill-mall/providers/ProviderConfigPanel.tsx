import type { ProviderActionState, ProviderDraft, ProviderRow } from "./ProviderCenter";

function accessModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    api_access: "API access",
    local_tool_session: "Local CLI/session access",
    local_runtime: "Local runtime",
    gateway_virtual_key: "Gateway access",
    cloud_project: "Cloud project",
    custom_openai_compatible: "Custom OpenAI-compatible",
  };
  return labels[mode] ?? mode;
}

function discoveryLabel(strategy: string): string {
  return strategy.replace(/_/g, " ");
}

function canUseBaseUrl(provider: ProviderRow): boolean {
  return Boolean(
    provider.gatewayProfile ||
      provider.accessModes.includes("local_runtime") ||
      provider.accessModes.includes("custom_openai_compatible")
  );
}

function endpointLabel(provider: ProviderRow): string {
  if (provider.gatewayProfile?.kind === "openai_compatible") return "OPENAI-COMPATIBLE BASE URL";
  if (provider.gatewayProfile?.kind === "bifrost_local") return "LOCAL GATEWAY BASE URL";
  if (provider.accessModes.includes("local_runtime")) return "LOCAL RUNTIME BASE URL";
  return "ENDPOINT / BASE URL";
}

function canUseEnvRef(provider: ProviderRow): boolean {
  return provider.accessModes.includes("api_access") || provider.accessModes.includes("custom_openai_compatible");
}

function canUseGatewayRef(provider: ProviderRow): boolean {
  return provider.accessModes.includes("gateway_virtual_key") || provider.accessModes.includes("custom_openai_compatible");
}

function canUseNoSecret(provider: ProviderRow): boolean {
  return provider.accessModes.includes("local_tool_session") || provider.accessModes.includes("local_runtime");
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] tracking-widest text-sm-secondary font-label">[ {label} ]</span>
      <span className="block border-b border-sm-border focus-within:border-sm-display">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent py-2 text-sm text-sm-primary outline-none placeholder:text-sm-disabled"
        />
      </span>
    </label>
  );
}

function ActionStatus({ state }: { state: ProviderActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={`text-[9px] tracking-widest font-label ${
        state.status === "error" ? "text-sm-accent" : state.status === "success" ? "text-sm-blue" : "text-sm-secondary"
      }`}
    >
      [ {state.message.toUpperCase()} ]
    </p>
  );
}

export function ProviderConfigPanel({
  provider,
  draft,
  actionState,
  onDraftChange,
  onSave,
}: {
  provider: ProviderRow | null;
  draft: ProviderDraft;
  actionState: ProviderActionState;
  onDraftChange: (draft: ProviderDraft) => void;
  onSave: () => void;
}) {
  if (!provider) {
    return (
      <section className="border border-sm-border bg-sm-surface p-4">
        <p className="text-[9px] tracking-widest text-sm-secondary font-label">[ CONFIGURATION ]</p>
        <p className="mt-2 text-sm text-sm-disabled">Provider catalog status is loading.</p>
      </section>
    );
  }

  const disabled = provider.status === "planned_source_review" || actionState.status === "running";
  const showManualModels = provider.discoveryStrategy === "manual_custom_models" || provider.modelStatus.models.length > 0;

  return (
    <section className="border border-sm-border bg-sm-surface p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] tracking-widest text-sm-secondary font-label">[ CONFIGURATION ]</p>
          <h3 className="text-lg font-bold text-sm-display">{provider.name}</h3>
        </div>
        <a
          href={provider.setupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-sm-border px-2 py-1 text-[9px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display font-label"
        >
          [ SETUP SOURCE ]
        </a>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ ACCESS LABELS ]</p>
          <p className="text-sm text-sm-primary">{provider.accessModes.map(accessModeLabel).join(" / ")}</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ AUTH CONTRACT ]</p>
          <p className="truncate text-sm text-sm-primary">{provider.authLabel}</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ ACTIVE MODEL ]</p>
          <p className="truncate text-sm text-sm-primary">{provider.configStatus.configured ? draft.model || "model pending" : "not active"}</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ EXECUTION PROFILE ]</p>
          <p className="truncate text-sm text-sm-primary">
            {provider.executableProviderId ? provider.executableProviderId : provider.gatewayProfile?.kind ?? "metadata/status only"}
          </p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ GATEWAY BACKEND ]</p>
          <p className="truncate text-sm text-sm-primary">{provider.configStatus.gatewayBackend ?? "direct or not configured"}</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ ROUTING POLICY ]</p>
          <p className="truncate text-sm text-sm-primary">{provider.configStatus.routingPolicyId ?? (draft.routingPolicyId || "manual default")}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {canUseEnvRef(provider) && (
          <button
            type="button"
            onClick={() => onDraftChange({ ...draft, configMode: "env_key" })}
            className={`border px-3 py-1.5 text-[9px] tracking-widest font-label ${
              draft.configMode === "env_key"
                ? "border-sm-display bg-sm-display text-sm-bg"
                : "border-sm-border text-sm-secondary hover:border-sm-primary"
            }`}
          >
            [ ENV VAR REF ]
          </button>
        )}
        {canUseGatewayRef(provider) && (
          <button
            type="button"
            onClick={() => onDraftChange({ ...draft, configMode: "gateway_virtual_key_ref" })}
            className={`border px-3 py-1.5 text-[9px] tracking-widest font-label ${
              draft.configMode === "gateway_virtual_key_ref"
                ? "border-sm-display bg-sm-display text-sm-bg"
                : "border-sm-border text-sm-secondary hover:border-sm-primary"
            }`}
          >
            [ GATEWAY REF ]
          </button>
        )}
        {provider.accessModes.includes("local_tool_session") && (
          <button
            type="button"
            onClick={() => onDraftChange({ ...draft, configMode: "local_cli_session" })}
            className={`border px-3 py-1.5 text-[9px] tracking-widest font-label ${
              draft.configMode === "local_cli_session"
                ? "border-sm-display bg-sm-display text-sm-bg"
                : "border-sm-border text-sm-secondary hover:border-sm-primary"
            }`}
          >
            [ LOCAL SESSION ]
          </button>
        )}
        {canUseNoSecret(provider) && (
          <button
            type="button"
            onClick={() => onDraftChange({ ...draft, configMode: "none_local" })}
            className={`border px-3 py-1.5 text-[9px] tracking-widest font-label ${
              draft.configMode === "none_local"
                ? "border-sm-display bg-sm-display text-sm-bg"
                : "border-sm-border text-sm-secondary hover:border-sm-primary"
            }`}
          >
            [ NO SECRET REF ]
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {draft.configMode === "env_key" && (
          <Field
            label="ENV VAR NAME"
            value={draft.envVarName}
            placeholder="PROVIDER_SECRET_REF"
            onChange={(value) => onDraftChange({ ...draft, envVarName: value })}
          />
        )}
        {draft.configMode === "gateway_virtual_key_ref" && (
          <Field
            label="GATEWAY VIRTUAL-KEY REF NAME"
            value={draft.gatewayRefName}
            placeholder="BIFROST_VIRTUAL_KEY"
            onChange={(value) => onDraftChange({ ...draft, gatewayRefName: value })}
          />
        )}
        {canUseBaseUrl(provider) && (
          <Field
            label={endpointLabel(provider)}
            value={draft.baseURL}
            placeholder={provider.gatewayProfile?.defaultBaseUrl ?? "http://localhost:11434/v1"}
            onChange={(value) => onDraftChange({ ...draft, baseURL: value })}
          />
        )}
        <Field
          label="MODEL LABEL"
          value={draft.model}
          placeholder="model label"
          onChange={(value) => onDraftChange({ ...draft, model: value })}
        />
        {showManualModels && (
          <Field
            label="MANUAL MODEL LABELS"
            value={draft.manualModels}
            placeholder="model-a, model-b"
            onChange={(value) => onDraftChange({ ...draft, manualModels: value })}
          />
        )}
        <Field
          label="ROUTING POLICY"
          value={draft.routingPolicyId}
          placeholder="manual or policy id"
          onChange={(value) => onDraftChange({ ...draft, routingPolicyId: value })}
        />
      </div>

      <div className="mt-4 border-t border-sm-border pt-3">
        <p className="text-xs leading-relaxed text-sm-secondary">
          Model discovery: {discoveryLabel(provider.discoveryStrategy)}. {provider.modelStatus.refresh.message}
        </p>
        {provider.gatewayProfile && (
          <p className="mt-2 text-xs leading-relaxed text-sm-secondary">Gateway profile: {provider.gatewayProfile.note}</p>
        )}
        {provider.status === "planned_source_review" && (
          <p className="mt-2 text-xs leading-relaxed text-sm-accent">{provider.evidenceNote}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className="bg-sm-display px-5 py-2.5 text-[10px] tracking-widest text-sm-bg transition-opacity hover:opacity-80 disabled:opacity-30 font-label"
        >
          {actionState.status === "running" ? "[ SAVING... ]" : "[ SAVE REFERENCE CONFIG ]"}
        </button>
        <ActionStatus state={actionState} />
      </div>
    </section>
  );
}
