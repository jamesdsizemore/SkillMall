"use client";

import { useTheme, type Theme } from "@/components/skill-mall/theme-provider";

const THEMES: { value: Theme; label: string; description: string }[] = [
  { value: "light", label: "Light", description: "Always use the light theme." },
  { value: "dark", label: "Dark", description: "Always use the dark theme." },
  { value: "system", label: "System", description: "Match your OS preference." },
];

export default function AppearancePage() {
  const [theme, setTheme] = useTheme();

  return (
    <div>
      <p
        className="mb-2 text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ APPEARANCE ]
      </p>
      <h2 className="mb-8 text-xl font-bold text-sm-display">Appearance</h2>

      <p
        className="mb-3 text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ THEME ]
      </p>

      <div className="space-y-2">
        {THEMES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`flex w-full items-center justify-between border px-4 py-3 text-left transition-colors ${
              theme === t.value
                ? "border-sm-display bg-sm-surface"
                : "border-sm-border hover:border-sm-primary"
            }`}
          >
            <div>
              <span className="text-sm font-semibold text-sm-display">{t.label}</span>
              <span className="ml-3 text-xs text-sm-secondary">{t.description}</span>
            </div>
            {theme === t.value && (
              <span
                className="text-[9px] tracking-widest text-sm-display"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ ACTIVE ]
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
