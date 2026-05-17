"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  skillPath: string;
  className?: string;
};

export function DeployButton({ skillPath, className }: Props) {
  const [copied, setCopied] = useState(false);
  const command = `cp -r skills/${skillPath} ~/.claude/skills/`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group relative", className)}>
      <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3">
        <code className="flex-1 font-mono text-xs text-zinc-300 select-all">{command}</code>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-600 active:scale-95"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
