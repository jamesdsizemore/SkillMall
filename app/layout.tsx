import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/github";
import { AuthButton } from "@/components/skill-mall/auth-button";
import { ThemeProvider } from "@/components/skill-mall/theme-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillMall — Claude Code Skill Catalog",
  description:
    "An open-source catalog of Claude Code skills. Searchable, categorized, and ready to deploy.",
  openGraph: {
    title: "SkillMall",
    description: "Claude Code skill catalog",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sm_session")?.value;
  const session = token ? getSession(token) : null;

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong theme — runs synchronously before paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('sm-theme')||'system';var d=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.setAttribute('data-theme',d);})();` }} />
        {/* Doto variable font — dot-matrix display style for stats and counters */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Doto:ROND,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="flex min-h-full flex-col bg-sm-bg text-sm-primary"
        style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        suppressHydrationWarning
      >
        <header className="sticky top-0 z-50 border-b border-sm-border bg-sm-surface/90 backdrop-blur-md">
          <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center bg-sm-display font-label text-xs font-black text-sm-bg">
                SM
              </span>
              <span className="font-semibold tracking-tight text-sm-display">
                SkillMall
              </span>
              <span
                className="hidden border border-sm-border bg-sm-surface px-1.5 py-0.5 text-[10px] font-medium text-sm-secondary sm:block"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ BETA ]
              </span>
            </Link>

            <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:gap-x-4">
              <Link
                href="/contributing"
                className="hidden text-sm text-sm-secondary transition-colors hover:text-sm-primary sm:inline"
              >
                Contribute
              </Link>
              {session && (
                <Link
                  href="/settings"
                  className="text-sm text-sm-secondary transition-colors hover:text-sm-primary"
                >
                  Settings
                </Link>
              )}
              <a
                href="https://github.com/jamesdsizemore/SkillMall"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-sm-secondary transition-colors hover:text-sm-primary"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span className="hidden sm:block">GitHub</span>
              </a>
              <AuthButton session={session} />
            </nav>
          </div>
        </header>

        <ThemeProvider>
        <main className="flex-1">{children}</main>
        </ThemeProvider>

        <footer className="border-t border-sm-border py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div
              className="flex flex-col items-center justify-between gap-4 text-xs text-sm-disabled sm:flex-row"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm-secondary">SkillMall</span>
                <span>—</span>
                <span>Open-source agent skill catalog</span>
              </div>
              <div className="flex gap-4">
                <Link href="/contributing" className="hover:text-sm-secondary">
                  Contribute
                </Link>
                <a
                  href="https://github.com/jamesdsizemore/SkillMall"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sm-secondary"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
