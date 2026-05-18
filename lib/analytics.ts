import { getDb } from "./db/client";
import type { AgentType } from "./db/types";

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
    .prepare("SELECT COUNT(*) as count FROM install_events WHERE skill_slug = ?")
    .get(skillSlug) as { count: number };
  return row.count;
}

/** Get 7-day install velocity for a skill. */
export function getInstallVelocity7d(skillSlug: string): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM install_events WHERE skill_slug = ? AND installed_at > datetime('now', '-7 days')"
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

/** Get install counts per agent type for a specific skill (contributor view). */
export function getInstallsByAgentType(skillSlug: string): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT agent_type, COUNT(*) as count
       FROM install_events
       WHERE skill_slug = ?
       GROUP BY agent_type`
    )
    .all(skillSlug) as Array<{ agent_type: string; count: number }>;
  return Object.fromEntries(rows.map((r) => [r.agent_type, r.count]));
}
