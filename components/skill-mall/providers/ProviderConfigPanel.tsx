import type { ProviderActionState, ProviderAuthSession, ProviderDraft, ProviderRow } from "./ProviderCenter";

function accessModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    api_access: "API access",
    provider_account_auth: "Provider account auth",
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

function isCodexProvider(provider: ProviderRow): boolean {
  return provider.id === "openai_codex";
}

function isClaudeCodeProvider(provider: ProviderRow): boolean {
  return provider.id === "claude_code";
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
  authSession,
  authActionState,
  credentialActionState,
  onDraftChange,
  onSave,
  onStartCodexAuth,
  onCancelCodexAuth,
  onSaveClaudeSetupToken,
}: {
  provider: ProviderRow | null;
  draft: ProviderDraft;
  actionState: ProviderActionState;
  authSession?: ProviderAuthSession | null;
  authActionState?: ProviderActionState;
  credentialActionState?: ProviderActionState;
  onDraftChange: (draft: ProviderDraft) => void;
  onSave: () => void;
  onStartCodexAuth?: (method: "chatgpt" | "chatgpt_device_code") => void;
  onCancelCodexAuth?: () => void;
  onSaveClaudeSetupToken?: () => void;
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
  const codexProvider = isCodexProvider(provider);
  const claudeProvider = isClaudeCodeProvider(provider);

  return (
    <section className="border border-sm-border bg-sm-surface p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] tracking-widest text-sm-secondary font-label">[ STAGE 1 / SAFE SETUP ]</p>
          <h3 className="text-lg font-bold text-sm-display">{provider.name}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-sm-secondary">
            {codexProvider
              ? "Start a Codex app-server account login and render the returned authorization page or device code here."
              : claudeProvider
                ? "Use local Claude CLI login, or configure a separate Claude setup-token without mixing it with Anthropic API keys."
                : "Configure reference names, local runtime/session choices, endpoint labels, and model labels. SkillMall stores references and metadata here, not raw provider secrets."}
          </p>
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

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        {codexProvider && (
          <button
            type="button"
            onClick={() => onDraftChange({ ...draft, configMode: "codex_app_server" })}
            className={`border px-3 py-1.5 text-[9px] tracking-widest font-label ${
              draft.configMode === "codex_app_server"
                ? "border-sm-display bg-sm-display text-sm-bg"
                : "border-sm-border text-sm-secondary hover:border-sm-primary"
            }`}
          >
            [ CODEX APP-SERVER ]
          </button>
        )}
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
        {claudeProvider && (
          <button
            type="button"
            onClick={() => onDraftChange({ ...draft, configMode: "claude_setup_token" })}
            className={`border px-3 py-1.5 text-[9px] tracking-widest font-label ${
              draft.configMode === "claude_setup_token"
                ? "border-sm-display bg-sm-display text-sm-bg"
                : "border-sm-border text-sm-secondary hover:border-sm-primary"
            }`}
          >
            [ SETUP TOKEN ]
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

      {codexProvider && (
        <div className="mb-4 border border-sm-border-subtle p-3">
          <p className="mb-2 text-[9px] tracking-widest text-sm-secondary font-label">[ OPENAI CODEX AUTH SESSION ]</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onStartCodexAuth?.("chatgpt")}
              disabled={authActionState?.status === "running"}
              className="border border-sm-border px-3 py-1.5 text-[9px] tracking-widest text-sm-secondary hover:border-sm-display hover:text-sm-display disabled:opacity-40 font-label"
            >
              [ START BROWSER LOGIN ]
            </button>
            <button
              type="button"
              onClick={() => onStartCodexAuth?.("chatgpt_device_code")}
              disabled={authActionState?.status === "running"}
              className="border border-sm-border px-3 py-1.5 text-[9px] tracking-widest text-sm-secondary hover:border-sm-display hover:text-sm-display disabled:opacity-40 font-label"
            >
              [ START DEVICE CODE ]
            </button>
            {authSession && (
              <button
                type="button"
                onClick={onCancelCodexAuth}
                className="border border-sm-border px-3 py-1.5 text-[9px] tracking-widest text-sm-secondary hover:border-sm-accent hover:text-sm-accent font-label"
              >
                [ CANCEL ]
              </button>
            )}
          </div>
          {authSession && (
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-sm-primary sm:grid-cols-2">
              <p><span className="text-sm-disabled">Status:</span> {authSession.status}</p>
              <p><span className="text-sm-disabled">Login id:</span> {authSession.loginId}</p>
              {authSession.authUrl && (
                <a className="break-all text-sm-blue" href={authSession.authUrl} target="_blank" rel="noopener noreferrer">
                  Open authorization page
                </a>
              )}
              {authSession.verificationUrl && (
                <a className="break-all text-sm-blue" href={authSession.verificationUrl} target="_blank" rel="noopener noreferrer">
                  {authSession.verificationUrl}
                </a>
              )}
              {authSession.userCode && (
                <p><span className="text-sm-disabled">User code:</span> <span className="font-bold">{authSession.userCode}</span></p>
              )}
              <p className="sm:col-span-2 text-sm-secondary">{authSession.message}</p>
            </div>
          )}
          <ActionStatus state={authActionState ?? { status: "idle", message: null }} />
        </div>
      )}

      {claudeProvider && (
        <div className="mb-4 border border-sm-border-subtle p-3">
          <p className="mb-2 text-[9px] tracking-widest text-sm-secondary font-label">[ CLAUDE CODE AUTH PATHS ]</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="border border-sm-border-subtle p-3">
              <p className="text-[9px] tracking-widest text-sm-disabled font-label">[ LOCAL CLI LOGIN ]</p>
              <p className="mt-1 text-xs leading-relaxed text-sm-secondary">
                Uses the locally authenticated Claude CLI session. This may open Terminal; it is not a Provider Center web auth page.
              </p>
            </div>
            <label className="block border border-sm-border-subtle p-3">
              <span className="text-[9px] tracking-widest text-sm-disabled font-label">[ CLAUDE SETUP-TOKEN ]</span>
              <input
                type="password"
                value={draft.setupToken}
                onChange={(event) => onDraftChange({ ...draft, setupToken: event.target.value })}
                placeholder="sk-ant-oat01-..."
                className="mt-2 w-full border-b border-sm-border bg-transparent py-2 text-sm text-sm-primary outline-none placeholder:text-sm-disabled"
              />
              <button
                type="button"
                onClick={onSaveClaudeSetupToken}
                disabled={!draft.setupToken.trim() || credentialActionState?.status === "running"}
                className="mt-3 border border-sm-border px-3 py-1.5 text-[9px] tracking-widest text-sm-secondary hover:border-sm-display hover:text-sm-display disabled:opacity-40 font-label"
              >
                [ SAVE SETUP-TOKEN ]
              </button>
              <ActionStatus state={credentialActionState ?? { status: "idle", message: null }} />
              <span className="mt-2 block text-xs leading-relaxed text-sm-secondary">
                Stored separately from Anthropic API-key access and injected only for SkillMall-owned Claude Code execution.
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
