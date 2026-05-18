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
