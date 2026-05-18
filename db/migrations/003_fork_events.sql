-- Track individual fork events for Community Favorites ranking
CREATE TABLE IF NOT EXISTS fork_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_slug TEXT NOT NULL,
  fork_slug TEXT NOT NULL,
  forked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fork_events_source ON fork_events(source_slug);
CREATE INDEX IF NOT EXISTS idx_fork_events_forked_at ON fork_events(forked_at);
