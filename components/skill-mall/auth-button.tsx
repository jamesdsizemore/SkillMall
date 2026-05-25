"use client";

import Link from "next/link";
import { useState } from "react";
import type { Session } from "@/lib/db/types";

type Props = {
  session: Session | null;
};

export function AuthButton({ session }: Props) {
  const [signingOut, setSigningOut] = useState(false);

  if (!session) {
    return (
      <Link
        href="/api/auth/login"
        className="text-[9px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors border border-sm-border px-2 py-1"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ SIGN IN ]
      </Link>
    );
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link
        href="/dashboard"
        className="max-w-20 truncate text-[9px] tracking-widest text-sm-secondary transition-colors hover:text-sm-primary sm:max-w-32"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        {session.github_login}
      </Link>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="whitespace-nowrap text-[9px] tracking-widest text-sm-disabled transition-colors hover:text-sm-primary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ {signingOut ? "..." : "SIGN OUT"} ]
      </button>
    </div>
  );
}
