import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getSession } from "@/lib/auth/github";

const NAV_ITEMS = [
  { href: "/settings/providers", label: "Providers" },
  { href: "/settings/appearance", label: "Appearance" },
];

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sm_session")?.value;
  const session = token ? getSession(token) : null;

  if (!session) {
    redirect("/api/auth/login");
  }

  return (
    <div className="bg-sm-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <p
          className="mb-1 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SETTINGS ]
        </p>
        <h1 className="mb-8 text-2xl font-bold text-sm-display">Settings</h1>

        <div className="flex gap-8">
          {/* Sidebar nav */}
          <nav className="w-40 shrink-0">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block border border-transparent px-3 py-2 text-sm text-sm-secondary transition-colors hover:border-sm-border hover:text-sm-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Page content */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
