import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth/policy";

const NAV_ITEMS = [
  { href: "/settings/providers", label: "Providers" },
  { href: "/settings/appearance", label: "Appearance" },
];

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/api/auth/login");
  }

  return (
    <div className="bg-sm-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <p
          className="mb-1 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SETTINGS ]
        </p>
        <h1 className="mb-8 text-2xl font-bold text-sm-display">Settings</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
          {/* Sidebar nav */}
          <nav className="w-full shrink-0 lg:w-44">
            <ul className="flex flex-wrap gap-1 lg:block lg:space-y-1">
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
          <div className="w-full min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
