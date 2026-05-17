"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function SearchBar({ className }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  const handleChange = (v: string) => {
    setValue(v);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (v) {
        params.set("q", v);
      } else {
        params.delete("q");
      }
      router.replace(`/?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className={cn("relative", className)}>
      <label
        className="mb-1.5 block text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ SEARCH SKILLS ]
      </label>
      <div className="relative border-b border-sm-border focus-within:border-sm-display transition-colors">
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="skill name, tag, or category..."
          className="w-full bg-transparent py-2 pr-8 text-sm text-sm-primary outline-none placeholder:text-sm-disabled"
        />
        {value && (
          <button
            onClick={() => handleChange("")}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-sm-disabled hover:text-sm-primary transition-colors"
            aria-label="Clear search"
          >
            <span
              className="text-[10px]"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ X ]
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
