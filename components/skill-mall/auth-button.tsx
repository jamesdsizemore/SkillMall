"use client";

import Link from "next/link";
import { useState } from "react";
import type { Session } from "@/lib/db/types";

type Props = {
  session: Session | null;
};

export function AuthButton({ session }: Props) {
  const [signingOut, setSigningOut] = useState(false);
  const authDisabled = session?.id === "auth-disabled";

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

  if (authDisabled) {
    return (
      <Link
        href="/settings"
        className="text-[9px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors border border-sm-border px-2 py-1"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ AUTH DISABLED ]
      </Link>
    );
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="text-[9px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        {session.github_login}
      </Link>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="text-[9px] tracking-widest text-sm-disabled hover:text-sm-primary transition-colors"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ {signingOut ? "..." : "SIGN OUT"} ]
      </button>
    </div>
  );
}
