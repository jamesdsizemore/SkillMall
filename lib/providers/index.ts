import fs from 'fs'
import os from 'os'
import path from 'path'
import { OpenAIClient } from './openai'
import { ClaudeCodeClient } from './claude-code'
import { GeminiClient } from './gemini'
import { GroqClient } from './groq'
import { OllamaClient } from './ollama'
import { DEFAULT_MODELS } from './defaults'
import { ConfigError } from './types'
import type { LLMClient, ProviderConfig, ProviderID } from './types'

export { ConfigError } from './types'
export type { LLMClient, ProviderConfig, ProviderID, CompletionOptions } from './types'

/** Create an LLMClient for the given provider config. */
/** Create an LLMClient for the given provider configuration. */
export function createLLMClient(config: ProviderConfig): LLMClient {
  switch (config.provider) {
    case 'openai':
      return new OpenAIClient(config)
    case 'claude-code':
      return new ClaudeCodeClient(config)
    case 'gemini':
      return new GeminiClient(config)
    case 'groq':
      return new GroqClient(config)
    case 'ollama':
      return new OllamaClient(config)
    default: {
      const _exhaustive: never = config.provider
      throw new Error(`Unknown provider: ${_exhaustive}`)
    }
  }
}

/**
 * Resolve provider config from environment variables or ~/.skill-mall/config.json.
 * Resolution order: env vars → ~/.skill-mall/config.json
 * Throws ConfigError if no provider is configured.
 */
/**
 * Resolve provider config from env vars or ~/.skill-mall/config.json.
 * Resolution order: SKILL_MALL_PROVIDER env var → config file.
 * Throws ConfigError if no provider is configured.
 */
export function resolveProviderConfig(): ProviderConfig {
  const envProvider = process.env.SKILL_MALL_PROVIDER as ProviderID | undefined
  const envApiKey = process.env.SKILL_MALL_API_KEY
  const envModel = process.env.SKILL_MALL_MODEL

  if (envProvider) {
    return {
      provider: envProvider,
      apiKey: envApiKey,
      model: envModel ?? DEFAULT_MODELS[envProvider],
    }
  }

  const configPath = path.join(os.homedir(), '.skill-mall', 'config.json')
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const provider = raw.provider as ProviderID
    const providerSection = raw.providers?.[provider] ?? {}
    return {
      provider,
      apiKey: raw.apiKey ?? providerSection.apiKey,
      model: raw.model ?? providerSection.model ?? DEFAULT_MODELS[provider],
    }
  }

  throw new ConfigError(
    'No LLM provider configured. Run: npx skill-mall configure'
  )
}
