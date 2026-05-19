"use client";

import { useState, useEffect } from "react";

interface Provider {
  id: string;
  name: string;
  requiresApiKey: boolean;
  defaultModel: string;
  availableModels: string[];
  setupUrl: string;
  setupInstructions: string;
}

interface ProvidersResponse {
  configured: boolean;
  activeProvider: string | null;
  activeModel: string | null;
  providers: Provider[];
}

export default function ProvidersPage() {
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((d: ProvidersResponse) => {
        setData(d);
        if (d.activeProvider) setSelectedProvider(d.activeProvider);
        if (d.activeModel) setModel(d.activeModel);
      })
      .catch(() => setError("Failed to load provider configuration"));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/providers/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          ...(apiKey ? { apiKey } : {}),
          ...(model ? { model } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const activeProvider = data?.providers.find((p) => p.id === selectedProvider);

  return (
    <div>
        <p
          className="mb-2 text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ PROVIDERS ]
        </p>
        <h2 className="mb-8 text-xl font-bold text-sm-display">
          LLM Provider Configuration
        </h2>

        {data?.configured && (
          <div
            className="mb-6 border border-sm-blue px-4 py-3 text-[10px] tracking-widest text-sm-blue"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ CONFIGURED: {data.activeProvider?.toUpperCase()} / {data.activeModel} ]
          </div>
        )}

        {!data?.configured && (
          <div
            className="mb-6 border border-sm-accent px-4 py-3 text-[10px] tracking-widest text-sm-accent"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ NO PROVIDER CONFIGURED — SELECT ONE BELOW ]
          </div>
        )}

        {/* Provider selection */}
        <div className="mb-8 space-y-2">
          <p
            className="mb-3 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ SELECT PROVIDER ]
          </p>
          {data?.providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => {
                setSelectedProvider(provider.id);
                setModel(provider.defaultModel);
                setApiKey("");
              }}
              className={`flex w-full items-center justify-between border px-4 py-3 text-left transition-colors ${
                selectedProvider === provider.id
                  ? "border-sm-display bg-sm-surface"
                  : "border-sm-border hover:border-sm-primary"
              }`}
            >
              <div>
                <span className="text-sm font-semibold text-sm-display">{provider.name}</span>
                {!provider.requiresApiKey && (
                  <span
                    className="ml-3 text-[9px] tracking-widest text-sm-blue"
                    style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                  >
                    [ NO API KEY NEEDED ]
                  </span>
                )}
              </div>
              {selectedProvider === provider.id && (
                <span
                  className="text-[9px] tracking-widest text-sm-display"
                  style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                >
                  [ SELECTED ]
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Configuration fields */}
        {activeProvider && (
          <div className="mb-8 space-y-6 border border-sm-border bg-sm-surface p-6">
            <p
              className="text-[9px] tracking-widest text-sm-secondary"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ CONFIGURE: {activeProvider.name.toUpperCase()} ]
            </p>

            <p className="text-sm text-sm-secondary">{activeProvider.setupInstructions}</p>

            <a
              href={activeProvider.setupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[10px] tracking-widest text-sm-blue hover:text-sm-display transition-colors"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ OPEN SETUP PAGE → ]
            </a>

            {activeProvider.requiresApiKey && (
              <div>
                <label
                  className="mb-2 block text-[9px] tracking-widest text-sm-secondary"
                  style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                >
                  [ API KEY ]
                </label>
                <div className="border-b border-sm-border focus-within:border-sm-display transition-colors">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-transparent py-2 text-sm text-sm-primary outline-none placeholder:text-sm-disabled"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                className="mb-2 block text-[9px] tracking-widest text-sm-secondary"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ MODEL ]
              </label>
              <div className="flex flex-wrap gap-2">
                {activeProvider.availableModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={`border px-3 py-1.5 text-[10px] tracking-widest transition-colors ${
                      model === m
                        ? "border-sm-display bg-sm-display text-sm-bg"
                        : "border-sm-border text-sm-secondary hover:border-sm-primary"
                    }`}
                    style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p
            className="mb-4 text-[10px] tracking-widest text-sm-accent"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ ERROR: {error.toUpperCase()} ]
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={!selectedProvider || saving}
          className="bg-sm-display px-6 py-3 text-[10px] tracking-widest text-sm-bg transition-opacity disabled:opacity-30 hover:opacity-80"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {saving ? "[ SAVING... ]" : saved ? "[ SAVED ]" : "[ SAVE CONFIGURATION ]"}
        </button>
    </div>
  );
}
