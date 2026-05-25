import type { ProviderRow } from "./ProviderCenter";

type ProviderGroup = {
  label: string;
  description: string;
  providers: ProviderRow[];
};

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

function groupsForProviders(providers: ProviderRow[]): ProviderGroup[] {
  return [
    {
      label: "API providers",
      description: "Env-var references for provider APIs.",
      providers: providers.filter(
        (provider) =>
          provider.accessModes.includes("api_access") &&
          provider.status !== "planned_source_review" &&
          provider.classification !== "gateway_configurable_openai_compatible"
      ),
    },
    {
      label: "Account auth providers",
      description: "First-class account or subscription auth flows.",
      providers: providers.filter((provider) => provider.accessModes.includes("provider_account_auth")),
    },
    {
      label: "Local tools / sessions",
      description: "Official local session status only.",
      providers: providers.filter((provider) => provider.accessModes.includes("local_tool_session")),
    },
    {
      label: "Local runtimes",
      description: "Local endpoint availability and model labels.",
      providers: providers.filter((provider) => provider.accessModes.includes("local_runtime")),
    },
    {
      label: "Gateway / OpenAI-compatible / custom",
      description: "Virtual-key refs, routing policy, and compatible endpoints.",
      providers: providers.filter(
        (provider) =>
          provider.classification === "gateway_configurable_openai_compatible" ||
          provider.classification === "custom_openai_compatible"
      ),
    },
    {
      label: "Cloud / project providers",
      description: "Project, resource, region, or deployment scoped rows.",
      providers: providers.filter((provider) => provider.accessModes.includes("cloud_project")),
    },
    {
      label: "Planned / source-review rows",
      description: "Visible but blocked from live calls until evidence is recorded.",
      providers: providers.filter((provider) => provider.status === "planned_source_review"),
    },
  ];
}

function StatusPill({ provider }: { provider: ProviderRow }) {
  const label = provider.configStatus.configured
    ? "configured"
    : provider.status === "planned_source_review"
      ? "source review"
      : provider.executableProviderId
        ? "configurable"
        : provider.gatewayProfile?.kind === "openai_compatible"
          ? "compatible"
        : "registry";
  const tone = provider.configStatus.configured
    ? "border-sm-blue text-sm-blue"
    : provider.status === "planned_source_review"
      ? "border-sm-accent text-sm-accent"
      : "border-sm-border text-sm-secondary";

  return <span className={`shrink-0 border px-1.5 py-0.5 text-[8px] tracking-widest font-label ${tone}`}>{label}</span>;
}

export function ProviderCatalogList({
  providers,
  selectedProviderId,
  onSelectProvider,
}: {
  providers: ProviderRow[];
  selectedProviderId: string;
  onSelectProvider: (provider: ProviderRow) => void;
}) {
  const groups = groupsForProviders(providers);

  return (
    <div className="min-w-0 border border-sm-border bg-sm-surface">
      <div className="border-b border-sm-border px-3 py-2">
        <p className="text-[9px] tracking-widest text-sm-secondary font-label">[ PROVIDER CATALOG ]</p>
        <p className="mt-1 text-[11px] leading-snug text-sm-disabled">
          Select a catalog row to review its access type, execution boundary, setup state, and safe next action.
        </p>
      </div>
      <div className="max-h-[760px] overflow-y-auto">
        {groups.map((group) => (
          <section key={group.label} className="border-b border-sm-border last:border-b-0">
            <div className="px-3 py-2">
              <p className="text-[9px] tracking-widest text-sm-display font-label">
                {group.label} / {group.providers.length}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-sm-disabled">{group.description}</p>
            </div>
            <div className="space-y-1 px-2 pb-2">
              {group.providers.length === 0 ? (
                <p className="border border-sm-border-subtle px-3 py-2 text-[10px] tracking-widest text-sm-disabled font-label">
                  [ NONE ]
                </p>
              ) : (
                group.providers.map((provider) => {
                  const selected = provider.id === selectedProviderId;
                  return (
                    <button
                      key={`${group.label}-${provider.id}`}
                      type="button"
                      onClick={() => onSelectProvider(provider)}
                      className={`w-full border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-sm-display bg-sm-bg text-sm-display"
                          : "border-sm-border bg-sm-surface text-sm-primary hover:border-sm-primary"
                      }`}
                    >
                      <span className="flex min-h-8 items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{provider.name}</span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {provider.accessModes.map((mode) => (
                              <span
                                key={mode}
                                className="border border-sm-border-subtle px-1.5 py-0.5 text-[8px] tracking-widest text-sm-secondary font-label"
                              >
                                {accessModeLabel(mode)}
                              </span>
                            ))}
                          </span>
                        </span>
                        <StatusPill provider={provider} />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
