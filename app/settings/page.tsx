import Link from "next/link";

const SECTIONS = [
  {
    href: "/settings/providers",
    label: "Providers",
    description: "Review provider references, local sessions, account auth, and model selection.",
  },
  {
    href: "/settings/appearance",
    label: "Appearance",
    description: "Choose light, dark, or system theme.",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-3">
      {SECTIONS.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className="block border border-sm-border bg-sm-surface p-5 transition-colors hover:border-sm-display"
        >
          <p className="mb-1 font-semibold text-sm-display">{s.label}</p>
          <p className="text-sm text-sm-secondary">{s.description}</p>
        </Link>
      ))}
    </div>
  );
}
