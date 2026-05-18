-- Migration 005: separate search_clicks table
-- Fixes: logSearchClickEvent was inserting fake rows into install_events with
-- agent_type = 'search-click:...' which corrupted hasInstallSignal and all install counts.

CREATE TABLE IF NOT EXISTS search_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  query TEXT NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_search_clicks_slug ON search_clicks(skill_slug);
CREATE INDEX IF NOT EXISTS idx_search_clicks_query ON search_clicks(query);
