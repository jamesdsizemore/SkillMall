import type { ProviderActionState, ProviderRow } from "./ProviderCenter";

function StateLine({ label, state }: { label: string; state: ProviderActionState }) {
  const tone =
    state.status === "error" ? "text-sm-accent" : state.status === "success" ? "text-sm-blue" : "text-sm-secondary";
  return (
    <p className={`text-[9px] tracking-widest font-label ${tone}`}>
      [ {label}: {(state.message ?? state.status).toUpperCase()} ]
    </p>
  );
}

function formatCheckedAt(value: string | null | undefined): string {
  if (!value) return "never";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed));
}

export function ModelRefreshPanel({
  provider,
  refreshState,
  testState,
  refreshReady,
  onRefresh,
  onTest,
}: {
  provider: ProviderRow | null;
  refreshState: ProviderActionState;
  testState: ProviderActionState;
  refreshReady: boolean;
  onRefresh: () => void;
  onTest: () => void;
}) {
  if (!provider) {
    return (
      <section className="border border-sm-border bg-sm-surface p-4">
        <p className="text-[9px] tracking-widest text-sm-secondary font-label">[ STATUS ACTIONS ]</p>
        <p className="mt-2 text-sm text-sm-disabled">Select a provider to inspect refresh and test status.</p>
      </section>
    );
  }

  const refreshDisabled = refreshState.status === "running" || !refreshReady;
  const testDisabled = testState.status === "running";
  const models = provider.modelStatus.models.slice(0, 8);
  const activeModel = provider.configStatus.activeModel ?? "model pending";
  const modelCount = provider.modelStatus.modelCount ?? provider.modelStatus.models.length;

  return (
    <section className="border border-sm-border bg-sm-surface p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] tracking-widest text-sm-secondary font-label">[ MODEL REFRESH + TEST ]</p>
          <p className="text-sm text-sm-primary">{provider.name}</p>
        </div>
        <p className="border border-sm-border px-2 py-1 text-[9px] tracking-widest text-sm-secondary font-label">
          [ {provider.modelStatus.source.toUpperCase()} / {provider.modelStatus.authoritative ? "AUTHORITATIVE" : "FALLBACK"} ]
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ STRATEGY ]</p>
          <p className="truncate text-sm text-sm-primary">{provider.modelStatus.strategy.replace(/_/g, " ")}</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ ACTIVE MODEL ]</p>
          <p className="truncate text-sm text-sm-primary">{provider.configStatus.configured ? activeModel : "not configured"}</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ MODEL COUNT ]</p>
          <p className="truncate text-sm text-sm-primary">{modelCount}</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ SECRET STATUS ]</p>
          <p className="truncate text-sm text-sm-primary">
            {provider.configStatus.secretStatus
              ? provider.configStatus.secretStatus.valuePresent
                ? "reference present"
                : "reference missing"
              : "not configured"}
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ LAST CHECKED ]</p>
          <p className="truncate text-sm text-sm-primary">{formatCheckedAt(provider.modelStatus.lastCheckedAt)}</p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ CACHE STATE ]</p>
          <p className={`truncate text-sm ${provider.modelStatus.stale ? "text-sm-accent" : "text-sm-primary"}`}>
            {provider.modelStatus.stale ? "stale or fallback" : "fresh source cache"}
          </p>
        </div>
        <div className="border border-sm-border-subtle px-3 py-2">
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled font-label">[ BLOCKER ]</p>
          <p className="truncate text-sm text-sm-primary">{provider.modelStatus.blocker ?? "none recorded"}</p>
        </div>
      </div>

      <div className="mb-4 min-h-14 border border-sm-border-subtle px-3 py-2">
        <p className="mb-2 text-[9px] tracking-widest text-sm-disabled font-label">[ MODEL LABELS ]</p>
        {models.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {models.map((model) => (
              <span key={model} className="border border-sm-border px-2 py-1 text-[9px] tracking-widest text-sm-secondary font-label">
                {model}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-sm-disabled">No model labels recorded for this row.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshDisabled}
          className="border border-sm-border px-4 py-2 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display disabled:opacity-30 font-label"
        >
          {refreshState.status === "running" ? "[ REFRESHING... ]" : "[ REFRESH MODELS ]"}
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={testDisabled}
          className="border border-sm-border px-4 py-2 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display disabled:opacity-30 font-label"
        >
          {testState.status === "running" ? "[ TESTING... ]" : "[ TEST STATUS ]"}
        </button>
        <StateLine label="refresh" state={refreshState} />
        <StateLine label="test" state={testState} />
      </div>
    </section>
  );
}
