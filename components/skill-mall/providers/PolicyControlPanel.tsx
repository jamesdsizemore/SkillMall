import { useMemo, useState } from "react";
import type { ProviderActionState, ProviderDraft, ProviderRow, RoutingPolicyRow, RoutingSimulationResult } from "./ProviderCenter";

type PolicyDraft = {
  id: string;
  name: string;
  mode: string;
  remainingUsd: string;
  limitUsd: string;
  estimatedCostUsd: string;
  operation: string;
  requirePricing: boolean;
};

function initialPolicyDraft(activeRoutingPolicyId: string | null): PolicyDraft {
  return {
    id: activeRoutingPolicyId ?? "manual-default",
    name: activeRoutingPolicyId ?? "Manual default",
    mode: "manual",
    remainingUsd: "",
    limitUsd: "",
    estimatedCostUsd: "",
    operation: "chat.text",
    requirePricing: false,
  };
}

function draftFromPolicy(policy: RoutingPolicyRow): PolicyDraft {
  return {
    id: policy.id,
    name: policy.name,
    mode: policy.mode,
    remainingUsd: policy.budget.remainingUsd === undefined ? "" : String(policy.budget.remainingUsd),
    limitUsd: policy.budget.limitUsd === undefined ? "" : String(policy.budget.limitUsd),
    estimatedCostUsd: policy.rules.candidates?.[0]?.estimatedCostUsd === undefined
      ? ""
      : String(policy.rules.candidates[0].estimatedCostUsd),
    operation: "chat.text",
    requirePricing: false,
  };
}

function numericValue(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function executionProviderFor(provider: ProviderRow | null): string | null {
  if (!provider) return null;
  if (provider.executableProviderId) return provider.executableProviderId;
  if (provider.gatewayProfile?.kind === "openai_compatible") return "openai";
  return null;
}

function authModeFor(
  draft: ProviderDraft
): "env_key" | "gateway_virtual_key" | "local_cli_session" | "none_local" | "codex_app_server" | "claude_setup_token" {
  if (draft.configMode === "gateway_virtual_key_ref") return "gateway_virtual_key";
  return draft.configMode;
}

function secretRefFor(draft: ProviderDraft) {
  if (draft.configMode === "env_key") return { type: "env", name: draft.envVarName };
  if (draft.configMode === "gateway_virtual_key_ref") {
    return { type: "gateway_virtual_key_ref", name: draft.gatewayRefName };
  }
  if (draft.configMode === "claude_setup_token") {
    return {
      type: "stored_provider_secret",
      id: "claude_code:setup_token",
      providerRegistryId: "claude_code",
      secretType: "setup_token",
    };
  }
  return { type: "none" };
}

function policyPayload(policyDraft: PolicyDraft, provider: ProviderRow | null, providerDraft: ProviderDraft) {
  const executableProvider = executionProviderFor(provider);
  const model = providerDraft.model.trim();
  const estimatedCostUsd = numericValue(policyDraft.estimatedCostUsd);
  const candidate =
    executableProvider && model
      ? {
          id: `${provider?.id ?? executableProvider}-${model}`.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase(),
          config: {
            provider: executableProvider,
            providerRegistryId: provider?.id,
            executionKind:
              provider?.gatewayProfile?.kind === "openai_compatible" && provider.executableProviderId !== executableProvider
                ? "openai_compatible"
                : providerDraft.configMode === "gateway_virtual_key_ref"
                  ? "bifrost_local"
                  : "direct",
            model,
            authMode: authModeFor(providerDraft),
            secretRef: secretRefFor(providerDraft),
            gatewayBackend: providerDraft.configMode === "gateway_virtual_key_ref" ? "bifrost_local" : "direct",
            ...(providerDraft.baseURL ? { baseURL: providerDraft.baseURL } : {}),
          },
          ...(estimatedCostUsd !== undefined ? { estimatedCostUsd } : {}),
        }
      : null;

  return {
    id: policyDraft.id,
    name: policyDraft.name,
    mode: policyDraft.mode,
    rules: candidate ? { candidates: [candidate] } : {},
    budget: {
      ...(numericValue(policyDraft.remainingUsd) !== undefined ? { remainingUsd: numericValue(policyDraft.remainingUsd) } : {}),
      ...(numericValue(policyDraft.limitUsd) !== undefined ? { limitUsd: numericValue(policyDraft.limitUsd) } : {}),
    },
  };
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

export function PolicyControlPanel({
  provider,
  providerDraft,
  policies,
  supportedModes,
  activeRoutingPolicyId,
  actionState,
  onSavePolicy,
  onActivatePolicy,
  onTogglePolicy,
  onSimulatePolicy,
  simulationResult,
}: {
  provider: ProviderRow | null;
  providerDraft: ProviderDraft;
  policies: RoutingPolicyRow[];
  supportedModes: string[];
  activeRoutingPolicyId: string | null;
  actionState: ProviderActionState;
  onSavePolicy: (payload: unknown) => void;
  onActivatePolicy: (id: string) => void;
  onTogglePolicy: (id: string, enabled: boolean) => void;
  onSimulatePolicy: (payload: unknown) => void;
  simulationResult: RoutingSimulationResult | null;
}) {
  const [draft, setDraft] = useState<PolicyDraft>(() => initialPolicyDraft(activeRoutingPolicyId));
  const selectedPolicy = useMemo(() => policies.find((policy) => policy.id === draft.id) ?? null, [draft.id, policies]);
  const payload = policyPayload(draft, provider, providerDraft);
  const disabled = actionState.status === "running" || !draft.id.trim() || !draft.name.trim();

  return (
    <section className="border border-sm-border bg-sm-surface p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] tracking-widest text-sm-secondary font-label">[ STAGE 3 / LOCAL ROUTING POLICY ]</p>
          <h3 className="text-lg font-bold text-sm-display">Policy controls</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-sm-secondary">
            Edit only supported local policy modes. Cheapest, quality, semantic, learned, and eval routing stay blocked
            until a later approved phase.
          </p>
        </div>
        <p className="border border-sm-border px-2 py-1 text-[9px] tracking-widest text-sm-secondary font-label">
          [ ACTIVE: {(activeRoutingPolicyId ?? "MANUAL DEFAULT").toUpperCase()} ]
        </p>
      </div>

      {policies.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-2">
          {policies.map((policy) => (
            <button
              type="button"
              key={policy.id}
              onClick={() => setDraft(draftFromPolicy(policy))}
              className={`border px-3 py-2 text-left transition-colors ${
                policy.id === draft.id ? "border-sm-display" : "border-sm-border-subtle hover:border-sm-primary"
              }`}
            >
              <span className="block text-[9px] tracking-widest text-sm-secondary font-label">
                [ {policy.mode.toUpperCase()} / {policy.enabled ? "ENABLED" : "DISABLED"} ]
              </span>
              <span className="block text-sm text-sm-primary">{policy.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="POLICY ID"
          value={draft.id}
          placeholder="budget-openai"
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <Field
          label="POLICY NAME"
          value={draft.name}
          placeholder="Budget guarded OpenAI"
          onChange={(value) => setDraft({ ...draft, name: value })}
        />
        <label className="block">
          <span className="mb-1 block text-[9px] tracking-widest text-sm-secondary font-label">[ POLICY MODE ]</span>
          <span className="block border-b border-sm-border focus-within:border-sm-display">
            <select
              value={draft.mode}
              onChange={(event) => setDraft({ ...draft, mode: event.target.value })}
              className="w-full bg-transparent py-2 text-sm text-sm-primary outline-none"
            >
              {supportedModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </span>
        </label>
        <Field
          label="SIMULATED ESTIMATED COST USD"
          value={draft.estimatedCostUsd}
          placeholder="0.02"
          onChange={(value) => setDraft({ ...draft, estimatedCostUsd: value })}
        />
        <label className="block">
          <span className="mb-1 block text-[9px] tracking-widest text-sm-secondary font-label">[ OPERATION ]</span>
          <span className="block border-b border-sm-border focus-within:border-sm-display">
            <select
              value={draft.operation}
              onChange={(event) => setDraft({ ...draft, operation: event.target.value })}
              className="w-full bg-transparent py-2 text-sm text-sm-primary outline-none"
            >
              {["chat.text", "skill.generate", "skill.preview", "skill.optimize_prompt", "provider.test", "embedding"].map((operation) => (
                <option key={operation} value={operation}>
                  {operation}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-sm-primary">
          <input
            type="checkbox"
            checked={draft.requirePricing}
            onChange={(event) => setDraft({ ...draft, requirePricing: event.target.checked })}
          />
          <span className="text-[9px] tracking-widest text-sm-secondary font-label">[ REQUIRE PRICING ]</span>
        </label>
        <Field
          label="REMAINING BUDGET USD"
          value={draft.remainingUsd}
          placeholder="10"
          onChange={(value) => setDraft({ ...draft, remainingUsd: value })}
        />
        <Field
          label="BUDGET LIMIT USD"
          value={draft.limitUsd}
          placeholder="20"
          onChange={(value) => setDraft({ ...draft, limitUsd: value })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSavePolicy(payload)}
          disabled={disabled}
          className="bg-sm-display px-4 py-2 text-[10px] tracking-widest text-sm-bg transition-opacity hover:opacity-80 disabled:opacity-30 font-label"
        >
          [ SAVE POLICY ]
        </button>
        <button
          type="button"
          onClick={() => onActivatePolicy(draft.id)}
          disabled={disabled || !selectedPolicy}
          className="border border-sm-border px-4 py-2 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display disabled:opacity-30 font-label"
        >
          [ ACTIVATE ]
        </button>
        <button
          type="button"
          onClick={() => onTogglePolicy(draft.id, !(selectedPolicy?.enabled ?? true))}
          disabled={disabled || !selectedPolicy}
          className="border border-sm-border px-4 py-2 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display disabled:opacity-30 font-label"
        >
          {selectedPolicy?.enabled === false ? "[ ENABLE ]" : "[ DISABLE ]"}
        </button>
        <button
          type="button"
          onClick={() =>
            onSimulatePolicy({
              ...payload,
              estimatedCostUsd: numericValue(draft.estimatedCostUsd),
              operation: draft.operation,
              requirePricing: draft.requirePricing,
            })
          }
          disabled={disabled}
          className="border border-sm-border px-4 py-2 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display disabled:opacity-30 font-label"
        >
          [ SIMULATE ]
        </button>
        <ActionStatus state={actionState} />
      </div>
      {simulationResult?.eligibility?.length ? (
        <div className="mt-4 border border-sm-border-subtle px-3 py-2">
          <p className="mb-2 text-[9px] tracking-widest text-sm-disabled font-label">[ ROUTE ELIGIBILITY ]</p>
          <div className="grid grid-cols-1 gap-2">
            {simulationResult.eligibility.map((item) => (
              <p key={item.candidateId} className="text-xs leading-relaxed text-sm-secondary">
                {item.candidateId}: capability {item.capabilityStatus}, pricing {item.pricingStatus}
                {item.blockerCodes.length > 0 ? ` / ${item.blockerCodes.join(", ")}` : ""}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
