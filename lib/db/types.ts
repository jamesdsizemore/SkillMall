export interface Session {
  id: string
  github_id: string
  github_login: string
  scopes: string
  created_at: string
  expires_at: string
}

export interface InstallEvent {
  id: number
  skill_slug: string
  agent_type: string
  installed_at: string
}

export interface Review {
  id: number
  skill_slug: string
  reviewer_github_id: string
  reviewer_login: string
  rating: number
  body: string
  is_generic: number
  has_install_signal: number
  created_at: string
}

export type AgentType =
  | 'claude-code'
  | 'cursor'
  | 'codex'
  | 'gemini-cli'
  | 'copilot'
  | 'continue'
  | 'other'

// Phase 3 types

export interface SkillFeedback {
  id: number
  skill_slug: string
  author_github_login: string
  satisfaction: number  // 1-5
  body: string | null   // max 200 chars
  created_at: string
}

export interface ImprovementSuggestion {
  id: number
  skill_slug: string
  status: 'pending' | 'approved' | 'rejected'
  suggestion_body: string
  generated_from_feedback_count: number
  reviewed_at: string | null
  applied_at: string | null
  created_at: string
}

export interface KnowledgeBase {
  id: number
  skill_slug: string
  source_dir: string
  chunk_count: number
  embedding_provider: string
  created_at: string
  updated_at: string
}

export interface KnowledgeChunk {
  id: number
  knowledge_base_id: number
  content: string
  source_file: string
  chunk_index: number
  embedding_json: string | null
}

export interface Purchase {
  id: number
  skill_slug: string
  buyer_github_login: string
  stripe_session_id: string
  amount_cents: number
  purchased_at: string
}

export interface SkillTier {
  skill_slug: string
  tier: 'free' | 'sponsored' | 'premium'
  price_cents: number
  set_at: string
}

export interface ForkEvent {
  id: number
  source_slug: string
  fork_slug: string
  forked_at: string
}
