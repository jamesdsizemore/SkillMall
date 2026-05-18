-- Sessions for GitHub OAuth
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  github_id TEXT NOT NULL,
  github_login TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT 'read:user',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Install events: aggregate only, zero PII
CREATE TABLE IF NOT EXISTS install_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_install_events_slug ON install_events(skill_slug);
CREATE INDEX IF NOT EXISTS idx_install_events_installed ON install_events(installed_at);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  reviewer_github_id TEXT NOT NULL,
  reviewer_login TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 150),
  is_generic INTEGER NOT NULL DEFAULT 0,
  has_install_signal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_slug, reviewer_github_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(skill_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at);
