"use client";

import type { Review } from "@/lib/db/types";

type Props = {
  reviews: Review[];
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-sm">
      {"★".repeat(rating)}
      <span className="text-sm-border">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function ReviewFeed({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <p
        className="text-[9px] tracking-widest text-sm-disabled"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ NO REVIEWS YET ]
      </p>
    );
  }

  const specific = reviews.filter((r) => r.is_generic === 0);
  const generic = reviews.filter((r) => r.is_generic === 1);
  const ordered = [...specific, ...generic];

  return (
    <div className="space-y-3">
      {ordered.map((review) => (
        <div
          key={review.id}
          className={`border p-4 ${
            review.is_generic === 1
              ? "border-sm-border opacity-60"
              : "border-sm-border bg-sm-surface"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} />
              <span
                className="text-[9px] tracking-widest text-sm-secondary"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                {review.reviewer_login}
              </span>
            </div>
            <span
              className="text-[9px] text-sm-disabled"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              {review.created_at.slice(0, 10)}
            </span>
          </div>
          <p className="text-sm text-sm-primary">{review.body}</p>
        </div>
      ))}
    </div>
  );
}
