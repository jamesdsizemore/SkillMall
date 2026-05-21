import type { ProviderActionState, UsageResponse } from "./ProviderCenter";

type RichUsageSummary = {
  request_count: number;
  succeeded_count: number;
  failed_count: number;
  started_count?: number;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens?: number;
  reasoning_tokens?: number;
  total_tokens?: number;
  latency_ms?: number;
  average_latency_ms?: number | null;
  actual_cost_usd: number;
  estimated_cost_usd: number;
};

type RichUsageResponse = Omit<UsageResponse, "summary" | "byProvider"> & {
  summary: RichUsageSummary;
  byProvider: Array<RichUsageSummary & { provider_id: string }>;
  byModel?: Array<RichUsageSummary & { provider_id: string; model_id: string | null }>;
  byOperation?: Array<RichUsageSummary & { operation: string }>;
  byAuthMode?: Array<RichUsageSummary & { auth_mode: string }>;
  byRouteBackend?: Array<RichUsageSummary & { route_backend: string }>;
  byRoutingPolicy?: Array<RichUsageSummary & { routing_policy_id: string | null }>;
  budgetPolicies?: Array<{
    routing_policy_id: string;
    policy_name: string;
    policy_mode: string;
    enabled: boolean;
    request_count: number;
    actual_cost_usd: number;
    estimated_cost_usd: number;
    budget_configured: boolean;
    budget_remaining_usd: number | null;
    budget_limit_usd: number | null;
    budget_status: string;
  }>;
};

function formatCost(value: number): string {
  return `$${value.toFixed(value > 0 && value < 0.01 ? 6 : 4)}`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatLatency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "n/a";
  return `${Math.round(value).toLocaleString("en-US")} ms`;
}

export function UsageCostPanel({
  usage,
  activeProviderId,
  pricingState,
  onRefreshPricing,
}: {
  usage: UsageResponse;
  activeProviderId: string | null;
  pricingState?: ProviderActionState;
  onRefreshPricing?: () => void;
}) {
  const richUsage = usage as RichUsageResponse;
  const summary = richUsage.summary;
  const activeProviderUsage = activeProviderId
    ? richUsage.byProvider.find((provider) => provider.provider_id === activeProviderId)
    : null;
  const totalTokens =
    summary.total_tokens ??
    summary.input_tokens +
      summary.output_tokens +
      (summary.cached_input_tokens ?? 0) +
      (summary.reasoning_tokens ?? 0);
  const topOperations = richUsage.byOperation?.slice(0, 3) ?? [];
  const budgetPolicies = richUsage.budgetPolicies?.filter((policy) => policy.budget_configured).slice(0, 3) ?? [];

  return (
    <section className="border border-sm-border bg-sm-surface p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] tracking-widest text-sm-secondary font-label">[ STAGE 4 / USAGE + COST ]</p>
          <p className="text-sm text-sm-primary">
            {usage.available ? "Ledger-backed provider usage" : "Usage ledger unavailable"}
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-sm-secondary">
            Review local ledger summaries. Actual cost is provider/gateway reported; estimated cost is a local estimate,
            not invoice reconciliation.
          </p>
        </div>
        <p className="border border-sm-border px-2 py-1 text-[9px] tracking-widest text-sm-secondary font-label">
          [ {activeProviderId ? activeProviderId.toUpperCase() : "ALL PROVIDERS"} ]
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 border border-sm-border-subtle px-3 py-2">
        <button
          type="button"
          onClick={onRefreshPricing}
          disabled={!onRefreshPricing || pricingState?.status === "running"}
          className="border border-sm-border px-3 py-1.5 text-[9px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display disabled:opacity-30 font-label"
        >
          {pricingState?.status === "running" ? "[ REFRESHING PRICING... ]" : "[ REFRESH PRICING ]"}
        </button>
        <p
          className={`text-[9px] tracking-widest font-label ${
            pricingState?.status === "error"
              ? "text-sm-accent"
              : pricingState?.status === "success"
                ? "text-sm-blue"
                : "text-sm-secondary"
          }`}
        >
          [ PRICING SOURCE: {(pricingState?.message ?? "source-backed snapshots; local estimates remain separate from actual spend").toUpperCase()} ]
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ REQUESTS ]</p>
          <p className="text-xl font-black leading-none text-sm-display font-display">
            {formatCount(summary.request_count)}
          </p>
          <p className="mt-1 text-[10px] text-sm-disabled">
            {formatCount(summary.failed_count)} failed / {formatCount(summary.succeeded_count)} succeeded
          </p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ TOKENS ]</p>
          <p className="text-xl font-black leading-none text-sm-display font-display">
            {formatCount(totalTokens)}
          </p>
          <p className="mt-1 text-[10px] text-sm-disabled">
            In {formatCount(summary.input_tokens)} / Out {formatCount(summary.output_tokens)}
          </p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-blue font-label">[ ACTUAL COST USD ]</p>
          <p className="text-xl font-black leading-none text-sm-display font-display">
            {formatCost(summary.actual_cost_usd)}
          </p>
          <p className="mt-1 text-[10px] text-sm-disabled">Reported by provider or gateway</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-secondary font-label">[ ESTIMATED COST USD ]</p>
          <p className="text-xl font-black leading-none text-sm-display font-display">
            {formatCost(summary.estimated_cost_usd)}
          </p>
          <p className="mt-1 text-[10px] text-sm-disabled">Local estimate, not exact spend</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ ACTUAL COST LABEL ]</p>
          <p className="text-xs leading-relaxed text-sm-secondary">{usage.costLabels.actual_cost_usd}</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ ESTIMATED COST LABEL ]</p>
          <p className="text-xs leading-relaxed text-sm-secondary">{usage.costLabels.estimated_cost_usd}</p>
        </div>
      </div>

      {activeProviderUsage && (
        <div className="mt-3 border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ SELECTED PROVIDER HEALTH ]</p>
          <p className="text-xs leading-relaxed text-sm-secondary">
            Actual {formatCost(activeProviderUsage.actual_cost_usd)} / Estimated{" "}
            {formatCost(activeProviderUsage.estimated_cost_usd)} across {formatCount(activeProviderUsage.request_count)} requests.
            Failures {formatCount(activeProviderUsage.failed_count)}. Average latency{" "}
            {formatLatency(activeProviderUsage.average_latency_ms)}.
          </p>
        </div>
      )}

      {topOperations.length > 0 && (
        <div className="mt-3 border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ TOP OPERATIONS ]</p>
          <div className="grid grid-cols-1 gap-1">
            {topOperations.map((operation) => (
              <p key={operation.operation} className="text-xs leading-relaxed text-sm-secondary">
                {operation.operation}: {formatCount(operation.request_count)} requests,{" "}
                {formatCount(operation.failed_count)} failures, avg {formatLatency(operation.average_latency_ms)}
              </p>
            ))}
          </div>
        </div>
      )}

      {budgetPolicies.length > 0 && (
        <div className="mt-3 border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ BUDGET POLICY STATUS ]</p>
          <div className="grid grid-cols-1 gap-1">
            {budgetPolicies.map((policy) => (
              <p key={policy.routing_policy_id} className="text-xs leading-relaxed text-sm-secondary">
                {policy.policy_name}: {policy.budget_status}
                {policy.budget_remaining_usd !== null
                  ? `, remaining ${formatCost(policy.budget_remaining_usd)}`
                  : ""}
                {policy.budget_limit_usd !== null ? `, limit ${formatCost(policy.budget_limit_usd)}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}

      {usage.message && <p className="mt-3 text-xs leading-relaxed text-sm-disabled">{usage.message}</p>}
    </section>
  );
}
