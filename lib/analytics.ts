import { getDb } from "./db/client";
import type { AgentType } from "./db/types";

/** Log a search result click-through event. Zero PII — query + skill slug only. */
export function logSearchClickEvent(query: string, skillSlug: string): void {
  try {
    const db = getDb();
    db.prepare(
      "INSERT INTO search_clicks (skill_slug, query) VALUES (?, ?)"
    ).run(skillSlug, query.slice(0, 64));
  } catch {
    // Non-fatal — analytics only
  }
}

/** Log a skill installation event. Zero PII — skill slug + agent type only. */
export function logInstallEvent(skillSlug: string, agentType: AgentType): void {
  try {
    const db = getDb();
    db.prepare(
      "INSERT INTO install_events (skill_slug, agent_type) VALUES (?, ?)"
    ).run(skillSlug, agentType);
  } catch {
    // Non-fatal — install events are analytics, not required for correctness
  }
}

/** Get total install count for a skill (all time). */
export function getInstallCount(skillSlug: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM install_events WHERE skill_slug = ? AND agent_type NOT LIKE 'search-click:%'")
    .get(skillSlug) as { count: number };
  return row.count;
}

/** Get 7-day install velocity for a skill. */
export function getInstallVelocity7d(skillSlug: string): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM install_events WHERE skill_slug = ? AND agent_type NOT LIKE 'search-click:%' AND installed_at > datetime('now', '-7 days')"
    )
    .get(skillSlug) as { count: number };
  return row.count;
}

/** Get top N skills by 7-day install velocity. */
export function getTrending7d(
  limit = 10
): Array<{ skill_slug: string; velocity: number }> {
  const db = getDb();
  return db
    .prepare(
      `SELECT skill_slug, COUNT(*) as velocity
       FROM install_events
       WHERE installed_at > datetime('now', '-7 days')
         AND agent_type NOT LIKE 'search-click:%'
       GROUP BY skill_slug
       ORDER BY velocity DESC
       LIMIT ?`
    )
    .all(limit) as Array<{ skill_slug: string; velocity: number }>;
}

/** Get skills with >50% velocity acceleration (7-day vs prior 7-day). */
export function getRising(): Array<{
  skill_slug: string;
  velocity: number;
  growth_pct: number;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
        skill_slug,
        SUM(CASE WHEN installed_at > datetime('now', '-7 days') THEN 1 ELSE 0 END) as recent,
        SUM(CASE WHEN installed_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days') THEN 1 ELSE 0 END) as prior
       FROM install_events
       WHERE installed_at > datetime('now', '-14 days')
         AND agent_type NOT LIKE 'search-click:%'
       GROUP BY skill_slug
       HAVING recent > 0 AND prior > 0 AND (CAST(recent AS REAL) / prior) > 1.5
       ORDER BY (CAST(recent AS REAL) / prior) DESC
       LIMIT 20`
    )
    .all() as Array<{ skill_slug: string; recent: number; prior: number }>;

  return rows.map((r) => ({
    skill_slug: r.skill_slug,
    velocity: r.recent,
    growth_pct: Math.round(((r.recent - r.prior) / r.prior) * 100),
  }));
}

/** Log a fork event for Community Favorites tracking. */
export function logForkEvent(sourceSlug: string, forkSlug: string): void {
  try {
    const db = getDb();
    db.prepare(
      "INSERT INTO fork_events (source_slug, fork_slug) VALUES (?, ?)"
    ).run(sourceSlug, forkSlug);
  } catch {
    // Non-fatal
  }
}

/** Get fork count for a skill (all time). */
export function getForkCount(skillSlug: string): number {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT COUNT(*) as count FROM fork_events WHERE source_slug = ?")
      .get(skillSlug) as { count: number } | undefined;
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

/** Get top skills by fork count (Community Favorites). */
export function getTopByForkCount(limit = 10): Array<{ slug: string; forkCount: number }> {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT source_slug, COUNT(*) as fork_count
         FROM fork_events
         GROUP BY source_slug
         ORDER BY fork_count DESC
         LIMIT ?`
      )
      .all(limit) as Array<{ source_slug: string; fork_count: number }>;
    return rows.map(r => ({ slug: r.source_slug, forkCount: r.fork_count }));
  } catch {
    return [];
  }
}

/**
 * Get skills with effectiveness score above threshold.
 * Note: quality scores are not yet persisted server-side; this filters by effectiveness only.
 */
export function getHighQualitySkills(
  effectivenessThreshold = 4.5
): Array<{ slug: string; effectivenessScore: number }> {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT r.skill_slug,
                AVG(r.rating) as avg_effectiveness
         FROM reviews r
         GROUP BY r.skill_slug
         HAVING avg_effectiveness > ?`
      )
      .all(effectivenessThreshold) as Array<{
        skill_slug: string;
        avg_effectiveness: number;
      }>;
    return rows.map(r => ({
      slug: r.skill_slug,
      effectivenessScore: Math.round(r.avg_effectiveness * 10) / 10,
    }));
  } catch {
    return [];
  }
}

export interface EffectivenessTrendPoint {
  date: string        // ISO date string YYYY-MM-DD
  averageScore: number | null  // null when no reviews that day
}

/**
 * Get 30-day effectiveness trend for a skill.
 * Returns one data point per day for the past 30 days.
 * Each point is the daily average of review effectiveness scores.
 */
export function getEffectivenessTrend(skillSlug: string): EffectivenessTrendPoint[] {
  const db = getDb()

  // Single query for all 30 days; missing days are filled in below.
  const rows = db
    .prepare(
      `SELECT date(created_at) as day, AVG(rating) as avg_score
       FROM reviews
       WHERE skill_slug = ?
         AND created_at >= datetime('now', '-30 days')
       GROUP BY date(created_at)`
    )
    .all(skillSlug) as Array<{ day: string; avg_score: number | null }>

  const scoreByDay = new Map(rows.map(r => [r.day, r.avg_score]))

  const points: EffectivenessTrendPoint[] = []
  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    const dateStr = date.toISOString().slice(0, 10)
    const score = scoreByDay.get(dateStr) ?? null
    points.push({
      date: dateStr,
      averageScore: score != null ? Math.round(score * 10) / 10 : null,
    })
  }

  return points
}

/** Get install counts per agent type for a specific skill (contributor view). */
export function getInstallsByAgentType(skillSlug: string): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT agent_type, COUNT(*) as count
       FROM install_events
       WHERE skill_slug = ? AND agent_type NOT LIKE 'search-click:%'
       GROUP BY agent_type`
    )
    .all(skillSlug) as Array<{ agent_type: string; count: number }>;
  return Object.fromEntries(rows.map((r) => [r.agent_type, r.count]));
}
