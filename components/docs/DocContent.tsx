"use client";

import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";
import type { TocEntry } from "@/lib/docs";

type Props = {
  source: MDXRemoteSerializeResult;
};

export function DocContent({ source }: Props) {
  return (
    <div className="prose prose-sm max-w-none prose-invert
      prose-headings:text-sm-display prose-headings:font-bold
      prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
      prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
      prose-p:text-sm-secondary prose-p:leading-relaxed prose-p:mb-4
      prose-a:text-sm-display prose-a:no-underline hover:prose-a:underline
      prose-code:text-sm-display prose-code:bg-sm-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-sm-surface prose-pre:border prose-pre:border-sm-border prose-pre:rounded-none prose-pre:text-xs
      prose-blockquote:border-l-sm-display prose-blockquote:text-sm-secondary
      prose-strong:text-sm-primary prose-strong:font-semibold
      prose-ul:text-sm-secondary prose-ol:text-sm-secondary
      prose-li:mb-1
      prose-table:text-sm prose-th:text-sm-secondary prose-th:border-sm-border prose-td:text-sm-secondary prose-td:border-sm-border
      prose-hr:border-sm-border
    ">
      <MDXRemote {...source} />
    </div>
  );
}
