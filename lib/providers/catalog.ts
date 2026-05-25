import { DEFAULT_MODELS } from './defaults'
import type { ProviderConfig, ProviderID } from './types'

export type ModelSource = 'fallback' | 'live'

export interface ProviderCatalogEntry {
  id: ProviderID
  name: string
  requiresApiKey: boolean
  authMode: 'api-key' | 'cli' | 'local'
  defaultModel: string
  availableModels: string[]
  modelSource: ModelSource
  setupUrl: string
  setupInstructions: string
  tokenLabel?: string
  tokenPlaceholder?: string
}

export const FALLBACK_PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    id: 'openai',
    name: 'OpenAI API',
    requiresApiKey: true,
    authMode: 'api-key',
    defaultModel: DEFAULT_MODELS.openai,
    availableModels: ['gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1'],
    modelSource: 'fallback',
    setupUrl: 'https://platform.openai.com/api-keys',
    setupInstructions: 'Set OPENAI_API_KEY in your shell or hosting environment, then configure SkillMall to reference that env var.',
    tokenLabel: 'OpenAI API key',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex Auth Token',
    requiresApiKey: false,
    authMode: 'cli',
    defaultModel: DEFAULT_MODELS.codex,
    availableModels: ['gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano'],
    modelSource: 'fallback',
    setupUrl: 'https://developers.openai.com/codex',
    setupInstructions: 'Uses the locally authenticated Codex CLI session. This is separate from OpenAI API-key access.',
  },
  {
    id: 'anthropic',
    name: 'Claude API',
    requiresApiKey: true,
    authMode: 'api-key',
    defaultModel: DEFAULT_MODELS.anthropic,
    availableModels: ['claude-sonnet-4-20250514', 'claude-opus-4-1-20250805'],
    modelSource: 'fallback',
    setupUrl: 'https://console.anthropic.com/settings/keys',
    setupInstructions: 'Set ANTHROPIC_API_KEY for direct Claude API access. This is separate from Claude Code CLI auth.',
    tokenLabel: 'Anthropic API key',
  },
  {
    id: 'claude-code',
    name: 'Claude Code CLI Auth Token',
    requiresApiKey: false,
    authMode: 'cli',
    defaultModel: DEFAULT_MODELS['claude-code'],
    availableModels: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001'],
    modelSource: 'fallback',
    setupUrl: 'https://claude.ai/code',
    setupInstructions: 'Uses the locally authenticated claude CLI. This is separate from Claude API-token auth.',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    requiresApiKey: true,
    authMode: 'api-key',
    defaultModel: DEFAULT_MODELS.gemini,
    availableModels: ['gemini-2.0-flash-exp', 'gemini-1.5-pro'],
    modelSource: 'fallback',
    setupUrl: 'https://aistudio.google.com/app/apikey',
    setupInstructions: 'Set GEMINI_API_KEY in your shell or hosting environment, then configure SkillMall to reference that env var.',
    tokenLabel: 'Gemini API key',
    tokenPlaceholder: 'AIza...',
  },
  {
    id: 'groq',
    name: 'Groq',
    requiresApiKey: true,
    authMode: 'api-key',
    defaultModel: DEFAULT_MODELS.groq,
    availableModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    modelSource: 'fallback',
    setupUrl: 'https://console.groq.com/keys',
    setupInstructions: 'Set GROQ_API_KEY in your shell or hosting environment, then configure SkillMall to reference that env var.',
    tokenLabel: 'Groq API key',
    tokenPlaceholder: 'gsk_...',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    requiresApiKey: false,
    authMode: 'local',
    defaultModel: DEFAULT_MODELS.ollama,
    availableModels: ['llama3.1', 'mistral', 'codellama'],
    modelSource: 'fallback',
    setupUrl: 'https://ollama.com',
    setupInstructions: "Install Ollama, pull a model, then make sure Ollama is running.",
  },
]

type OpenAIModelList = {
  data?: Array<{ id: string; created?: number }>
}

type AnthropicModelList = {
  data?: Array<{ id: string; created_at?: string }>
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function isOpenAITextModel(id: string): boolean {
  if (!/^(gpt-|o\d|chatgpt-)/.test(id)) return false
  return !/(audio|transcribe|tts|image|realtime|embedding|whisper|dall-e|sora)/i.test(id)
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchProviderModels(config: ProviderConfig): Promise<string[]> {
  if (config.provider === 'openai' && config.apiKey) {
    const data = (await fetchJson('https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${config.apiKey}` },
    })) as OpenAIModelList

    return unique(
      (data.data ?? [])
        .filter((model) => isOpenAITextModel(model.id))
        .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
        .map((model) => model.id)
    ).slice(0, 25)
  }

  if (config.provider === 'anthropic' && config.apiKey) {
    const data = (await fetchJson('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
    })) as AnthropicModelList

    return unique((data.data ?? []).map((model) => model.id)).slice(0, 25)
  }

  if (config.provider === 'groq' && config.apiKey) {
    const data = (await fetchJson('https://api.groq.com/openai/v1/models', {
      headers: { authorization: `Bearer ${config.apiKey}` },
    })) as OpenAIModelList

    return unique((data.data ?? []).map((model) => model.id)).slice(0, 25)
  }

  if (config.provider === 'ollama') {
    const data = (await fetchJson('http://localhost:11434/api/tags', {})) as {
      models?: Array<{ name: string }>
    }
    return unique((data.models ?? []).map((model) => model.name)).slice(0, 25)
  }

  return []
}

export async function getProviderCatalog(config?: ProviderConfig): Promise<ProviderCatalogEntry[]> {
  if (!config) return FALLBACK_PROVIDER_CATALOG

  const entries = FALLBACK_PROVIDER_CATALOG.map((entry) => ({ ...entry }))
  const activeEntry = entries.find((entry) => entry.id === config.provider)
  if (!activeEntry) return entries

  try {
    const liveModels = await fetchProviderModels(config)
    if (liveModels.length > 0) {
      activeEntry.availableModels = liveModels
      activeEntry.modelSource = 'live'
      if (!liveModels.includes(activeEntry.defaultModel)) {
        activeEntry.defaultModel = config.model && liveModels.includes(config.model)
          ? config.model
          : liveModels[0]
      }
    }
  } catch {
    activeEntry.modelSource = 'fallback'
  }

  return entries
}
