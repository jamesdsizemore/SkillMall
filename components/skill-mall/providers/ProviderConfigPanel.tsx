import type { ProviderActionState, ProviderAuthSession, ProviderDraft, ProviderRow } from "./ProviderCenter";

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

function canUseApiCredential(provider: ProviderRow): boolean {
  return provider.accessModes.includes("api_access") || provider.accessModes.includes("custom_openai_compatible");
}

function canUseGatewayRef(provider: ProviderRow): boolean {
  return provider.accessModes.includes("gateway_virtual_key") || provider.accessModes.includes("custom_openai_compatible");
}

function hasEnvRefName(value: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/.test(value.trim());
}

function hasValue(value: string): boolean {
  return value.trim().length > 0;
}

function localConnectLabel(provider: ProviderRow): string {
  if (provider.id === "openai_codex") return "CONNECT OPENAI CODEX";
  if (provider.id === "claude_code") return "CONNECT CLAUDE CODE";
  return "CONNECT LOCAL AUTH";
}

function isLocalSessionProvider(provider: ProviderRow): boolean {
  return provider.accessModes.includes("local_tool_session");
}

function isLocalRuntimeProvider(provider: ProviderRow): boolean {
  return provider.accessModes.includes("local_runtime");
}

function Field({
  label,
  value,
  placeholder,
  hint,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  hint?: string;
  type?: "text" | "password";
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] tracking-widest text-sm-secondary font-label">[ {label} ]</span>
      <span className="block border-b border-sm-border focus-within:border-sm-display">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent py-2 text-sm text-sm-primary outline-none placeholder:text-sm-disabled"
        />
      </span>
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-sm-disabled">{hint}</span>}
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
  refreshState,
  testState,
  onDraftChange,
  onSave,
  onConnectLocalAuth,
  authSession,
  onCancelAuth,
  onDeleteCredential,
  onRefresh,
}: {
  provider: ProviderRow | null;
  draft: ProviderDraft;
  actionState: ProviderActionState;
  refreshState?: ProviderActionState;
  testState?: ProviderActionState;
  authSession?: ProviderAuthSession | null;
  onDraftChange: (draft: ProviderDraft) => void;
  onSave: () => Promise<boolean>;
  onConnectLocalAuth?: () => Promise<boolean>;
  onCancelAuth?: () => void;
  onDeleteCredential?: () => void;
  onRefresh?: () => void;
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
  const showManualModels = provider.discoveryStrategy === "manual_custom_models";
  const storedCredentialPresent =
    provider.configStatus.secretStatus?.type === "stored_api_key" && provider.configStatus.secretStatus.valuePresent;
  const localSession = isLocalSessionProvider(provider);
  const localRuntime = isLocalRuntimeProvider(provider);
  const apiProvider = canUseApiCredential(provider);
  const gatewayProvider = canUseGatewayRef(provider);
  const showEndpoint = canUseBaseUrl(provider) && (provider.gatewayProfile?.requiresUserEndpoint || localRuntime);
  const modelOptions = [...new Set([draft.model, ...provider.modelStatus.models].filter(Boolean))];
  const canUseCredentialAction =
    draft.configMode === "api_key"
      ? hasValue(draft.apiKey) || storedCredentialPresent
      : draft.configMode === "env_key"
        ? hasEnvRefName(draft.envVarName)
        : draft.configMode === "gateway_virtual_key_ref"
          ? hasEnvRefName(draft.gatewayRefName)
          : true;

  const handleRetrieveModels = async () => {
    if (disabled || !canUseCredentialAction) return;
    const saved = await onSave();
    if (saved) onRefresh?.();
  };

  const handleLocalConnect = async () => {
    if (disabled) return;
    await (onConnectLocalAuth ? onConnectLocalAuth() : onSave());
  };
  const authorizationUrl = authSession?.authUrl ?? authSession?.verificationUrl;

  return (
    <section className="border border-sm-border bg-sm-surface p-6">
      <div className="mb-6">
        <p className="mb-1 text-[9px] tracking-widest text-sm-secondary font-label">[ CONNECT ]</p>
        <h3 className="text-2xl font-bold text-sm-display">{provider.name}</h3>
        {provider.status === "planned_source_review" && (
          <p className="mt-2 text-[9px] tracking-widest text-sm-accent font-label">[ SOURCE REVIEW REQUIRED ]</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        {apiProvider && (
          <Field
            label="API KEY"
            value={draft.apiKey}
            placeholder={storedCredentialPresent ? "Stored credential present" : "Paste provider API key"}
            hint="Encrypted local storage. The value is sent only to the server, never returned after save."
            type="password"
            onChange={(value) => onDraftChange({ ...draft, apiKey: value })}
          />
        )}
        {localSession && (
          <div className="space-y-2">
            <p className="text-[9px] tracking-widest text-sm-secondary font-label">[ AUTH TOKEN ]</p>
            <button
              type="button"
              onClick={handleLocalConnect}
              disabled={disabled}
              className="bg-sm-display px-5 py-2.5 text-[10px] tracking-widest text-sm-bg transition-opacity hover:opacity-80 disabled:opacity-30 font-label"
            >
              [ {localConnectLabel(provider)} ]
            </button>
            <p className="text-xs text-sm-disabled">
              {provider.id === "openai_codex"
                ? "Uses Codex app-server account authorization and stores no browser tokens in SkillMall."
                : "Uses the local authenticated CLI session."}
            </p>
          </div>
        )}
        {showEndpoint && (
          <Field
            label={endpointLabel(provider)}
            value={draft.baseURL}
            placeholder={provider.gatewayProfile?.defaultBaseUrl ?? "http://localhost:11434/v1"}
            hint="Use the provider, gateway, custom, or local runtime endpoint required by this row."
            onChange={(value) => onDraftChange({ ...draft, baseURL: value })}
          />
        )}
        <div>
          <p className="mb-1 text-[9px] tracking-widest text-sm-secondary font-label">[ MODELS ]</p>
          <button
            type="button"
            onClick={handleRetrieveModels}
            disabled={disabled || !canUseCredentialAction}
            className="bg-sm-display px-5 py-2.5 text-[10px] tracking-widest text-sm-bg transition-opacity hover:opacity-80 disabled:opacity-30 font-label"
          >
            [ RETRIEVE CURRENT MODELS ]
          </button>
        </div>
        <label className="block">
          <span className="mb-1 block text-[9px] tracking-widest text-sm-secondary font-label">[ SELECT MODEL ]</span>
          <span className="block border-b border-sm-border focus-within:border-sm-display">
            {modelOptions.length > 0 ? (
              <select
                value={draft.model}
                onChange={(event) => onDraftChange({ ...draft, model: event.target.value })}
                className="w-full bg-transparent py-2 text-sm text-sm-primary outline-none"
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={draft.model}
                placeholder="model label"
                onChange={(event) => onDraftChange({ ...draft, model: event.target.value })}
                className="w-full bg-transparent py-2 text-sm text-sm-primary outline-none placeholder:text-sm-disabled"
              />
            )}
          </span>
        </label>
        {showManualModels && (
          <Field
            label="MANUAL MODEL LABELS"
            value={draft.manualModels}
            placeholder="model-a, model-b"
            hint="Comma-separated labels for manual/custom rows or local model lists."
            onChange={(value) => onDraftChange({ ...draft, manualModels: value })}
          />
        )}
      </div>

      {apiProvider && (
        <div className="mt-4 border border-sm-border-subtle bg-sm-bg px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ STATUS ]</p>
          <p className="text-sm leading-relaxed text-sm-secondary">
            {storedCredentialPresent
              ? "Stored credential present."
              : "No API key saved yet."}
          </p>
        </div>
      )}

      {provider.id === "openai_codex" && authSession && authorizationUrl && (
        <div className="mt-4 border border-sm-border bg-sm-bg p-4">
          <p className="mb-2 text-[9px] tracking-widest text-sm-secondary font-label">[ OPENAI AUTHORIZATION ]</p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={authorizationUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-sm-display px-5 py-2.5 text-[10px] tracking-widest text-sm-bg transition-opacity hover:opacity-80 font-label"
            >
              [ OPEN AUTHORIZATION PAGE ]
            </a>
            {onCancelAuth && (
              <button
                type="button"
                onClick={onCancelAuth}
                className="border border-sm-border px-5 py-2.5 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display font-label"
              >
                [ CANCEL ]
              </button>
            )}
          </div>
          {authSession.userCode && (
            <div className="mt-4">
              <p className="mb-1 text-[9px] tracking-widest text-sm-secondary font-label">[ DEVICE CODE ]</p>
              <p className="inline-block border border-sm-border bg-sm-surface px-4 py-2 font-mono text-lg tracking-widest text-sm-display">
                {authSession.userCode}
              </p>
            </div>
          )}
          <p className="mt-3 text-xs leading-relaxed text-sm-secondary">{authSession.message}</p>
        </div>
      )}

      {(apiProvider || gatewayProvider) && (
        <details className="mt-4 border border-sm-border-subtle bg-sm-bg px-3 py-2">
          <summary className="cursor-pointer text-[9px] tracking-widest text-sm-secondary font-label">
            [ ADVANCED ]
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {apiProvider && (
              <Field
                label="ENV VAR NAME"
                value={draft.envVarName}
                placeholder="PROVIDER_SECRET_REF"
                hint="Optional reference mode."
                onChange={(value) => onDraftChange({ ...draft, configMode: "env_key", envVarName: value })}
              />
            )}
            {gatewayProvider && (
              <Field
                label="GATEWAY REF NAME"
                value={draft.gatewayRefName}
                placeholder="BIFROST_VIRTUAL_KEY"
                hint="Optional local gateway reference."
                onChange={(value) => onDraftChange({ ...draft, configMode: "gateway_virtual_key_ref", gatewayRefName: value })}
              />
            )}
            {draft.configMode !== "api_key" && apiProvider && (
              <button
                type="button"
                onClick={() => onDraftChange({ ...draft, configMode: "api_key" })}
                className="self-end border border-sm-border px-4 py-2 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display font-label"
              >
                [ USE API KEY ]
              </button>
            )}
          </div>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!localSession && (
          <button
            type="button"
            onClick={() => {
              void onSave();
            }}
            disabled={disabled || !canUseCredentialAction}
            className="border border-sm-border px-5 py-2.5 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display disabled:opacity-30 font-label"
          >
            {actionState.status === "running"
              ? "[ SAVING... ]"
              : draft.configMode === "api_key"
                ? "[ SAVE API KEY ONLY ]"
                : "[ SAVE CONFIG ]"}
          </button>
        )}
        {draft.configMode === "api_key" && storedCredentialPresent && onDeleteCredential && (
          <button
            type="button"
            onClick={onDeleteCredential}
            disabled={disabled}
            className="border border-sm-border px-5 py-2.5 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display disabled:opacity-30 font-label"
          >
            [ DELETE STORED CREDENTIAL ]
          </button>
        )}
        <ActionStatus state={actionState} />
        {refreshState && <ActionStatus state={refreshState} />}
        {testState && <ActionStatus state={testState} />}
      </div>
    </section>
  );
}
