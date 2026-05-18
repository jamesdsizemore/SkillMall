"use client";

import { SuggestionCard } from "./SuggestionCard";

type Suggestion = {
  id: number;
  suggestion_body: string;
  status: "pending" | "approved" | "rejected";
  generated_from_feedback_count: number;
  created_at: string;
};

type Props = {
  suggestions: Suggestion[];
  skillSlug: string;
  skillCategory: string;
  isAuthor: boolean;
};

export function SuggestionList({ suggestions, skillSlug, skillCategory, isAuthor }: Props) {
  if (suggestions.length === 0) {
    return (
      <p
        className="text-[9px] tracking-widest text-sm-disabled"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ NO SUGGESTIONS YET — requires 10+ feedback submissions ]
      </p>
    );
  }

  const pending = suggestions.filter((s) => s.status === "pending");
  const others = suggestions.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <p
            className="mb-3 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ PENDING REVIEW ]
          </p>
          <div className="space-y-3">
            {pending.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                skillSlug={skillSlug}
                skillCategory={skillCategory}
                isAuthor={isAuthor}
              />
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <p
            className="mb-3 text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ HISTORY ]
          </p>
          <div className="space-y-3">
            {others.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                skillSlug={skillSlug}
                skillCategory={skillCategory}
                isAuthor={isAuthor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
