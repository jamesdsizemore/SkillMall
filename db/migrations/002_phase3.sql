-- Phase 3 tables: self-improvement feedback, RAG knowledge, marketplace

-- Skill feedback for self-improvement loop (T204/T205)
CREATE TABLE IF NOT EXISTS skill_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  author_github_login TEXT NOT NULL,
  satisfaction INTEGER NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  body TEXT CHECK (length(body) <= 200),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_skill_feedback_slug ON skill_feedback(skill_slug);

-- LLM-generated improvement suggestions (T205)
CREATE TABLE IF NOT EXISTS improvement_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  suggestion_body TEXT NOT NULL,
  generated_from_feedback_count INTEGER NOT NULL,
  reviewed_at TEXT,
  applied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_slug ON improvement_suggestions(skill_slug);
CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_status ON improvement_suggestions(status);

-- RAG knowledge bases (T203 — blocked on sqlite-vss, table created now)
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL UNIQUE,
  source_dir TEXT NOT NULL,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  embedding_provider TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- RAG knowledge chunks (T203 — blocked on sqlite-vss)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_base_id INTEGER NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source_file TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  -- embedding stored as JSON array of floats until sqlite-vss is available
  embedding_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_kb ON knowledge_chunks(knowledge_base_id);

-- Marketplace purchases (T207)
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  buyer_github_login TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_github_login);
CREATE INDEX IF NOT EXISTS idx_purchases_slug ON purchases(skill_slug);

-- Skill tier assignments (T206)
CREATE TABLE IF NOT EXISTS skill_tiers (
  skill_slug TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'sponsored', 'premium')),
  price_cents INTEGER NOT NULL DEFAULT 0,
  set_at TEXT NOT NULL DEFAULT (datetime('now'))
);
