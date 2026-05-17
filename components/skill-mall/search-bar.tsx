"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  placeholder?: string;
};

export function SearchBar({ className, placeholder = "Search skills, tags, categories..." }: Props) {
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
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="border-zinc-700 bg-zinc-800/80 pl-10 pr-10 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-zinc-500/20"
      />
      {value && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
