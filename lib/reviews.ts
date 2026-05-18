import { getDb } from "./db/client";
import type { Review } from "./db/types";

const GENERIC_PHRASES = [
  "great skill",
  "very useful",
  "good skill",
  "nice",
  "awesome",
  "love it",
  "excellent",
  "👍",
  "perfect",
  "amazing",
];

/** Detect if a review body is a generic low-quality review. */
export function isGenericReview(body: string): boolean {
  const lower = body.toLowerCase().trim();
  return GENERIC_PHRASES.some(
    (p) =>
      lower === p ||
      lower.startsWith(p + " ") ||
      lower.endsWith(" " + p) ||
      lower === p + "!"
  );
}

/**
 * Check if a skill has at least one install event (install signal).
 * Phase 2 uses catalog-level signal — not per-user.
 */
export function hasInstallSignal(skillSlug: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM install_events WHERE skill_slug = ? AND agent_type NOT LIKE 'search-click:%'"
    )
    .get(skillSlug) as { count: number };
  return row.count > 0;
}

/**
 * Submit a review.
 * Throws if: reviewer already reviewed this skill (UNIQUE constraint),
 *            or body/rating violate constraints.
 */
export function createReview(params: {
  skillSlug: string;
  reviewerGithubId: string;
  reviewerLogin: string;
  rating: number;
  body: string;
  hasInstallSignal: boolean;
}): Review {
  const db = getDb();
  const isGeneric = isGenericReview(params.body) ? 1 : 0;

  try {
    db.prepare(`
      INSERT INTO reviews (skill_slug, reviewer_github_id, reviewer_login, rating, body, is_generic, has_install_signal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.skillSlug,
      params.reviewerGithubId,
      params.reviewerLogin,
      params.rating,
      params.body,
      isGeneric,
      params.hasInstallSignal ? 1 : 0
    );
  } catch (err) {
    if (String(err).includes("UNIQUE constraint failed")) {
      throw new Error("You have already reviewed this skill");
    }
    throw err;
  }

  return db
    .prepare(
      "SELECT * FROM reviews WHERE skill_slug = ? AND reviewer_github_id = ?"
    )
    .get(params.skillSlug, params.reviewerGithubId) as Review;
}

/**
 * Get reviews for a skill.
 * Specific reviews (is_generic = 0) appear before generic ones.
 */
export function getReviews(skillSlug: string): Review[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM reviews WHERE skill_slug = ? ORDER BY is_generic ASC, created_at DESC"
    )
    .all(skillSlug) as Review[];
}

/**
 * Compute quality-weighted effectiveness score.
 * Specific reviews weight 2x generic reviews.
 * Returns null if no reviews exist.
 */
export function getEffectivenessScore(skillSlug: string): number | null {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT
        SUM(rating * CASE WHEN is_generic = 0 THEN 2.0 ELSE 1.0 END) as weighted_sum,
        SUM(CASE WHEN is_generic = 0 THEN 2.0 ELSE 1.0 END) as weight_total
      FROM reviews
      WHERE skill_slug = ?
    `)
    .get(skillSlug) as {
    weighted_sum: number | null;
    weight_total: number | null;
  };

  if (!row.weighted_sum || !row.weight_total) return null;
  return Math.round((row.weighted_sum / row.weight_total) * 10) / 10;
}

/** Get total review count for a skill. */
export function getReviewCount(skillSlug: string): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM reviews WHERE skill_slug = ?"
    )
    .get(skillSlug) as { count: number };
  return row.count;
}
