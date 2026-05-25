import { readProviderSecret } from './secret-store'
import type { ProviderConfig } from './types'

const CLAUDE_AUTH_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR',
]

export function buildClaudeCodeEnv(
  config: ProviderConfig,
  baseEnv: Record<string, string | undefined> = process.env
): NodeJS.ProcessEnv {
  const env = { ...baseEnv } as NodeJS.ProcessEnv

  if (config.authMode !== 'claude_setup_token') return env
  for (const key of CLAUDE_AUTH_ENV_VARS) delete env[key]

  if (config.secretRef?.type !== 'stored_provider_secret' || config.secretRef.secretType !== 'setup_token') {
    throw new Error('Claude setup-token execution requires a stored setup-token secret ref')
  }
  if (config.secretRef.providerRegistryId !== 'claude_code' || config.secretRef.id !== 'claude_code:setup_token') {
    throw new Error('Claude setup-token execution requires the Claude app-managed setup-token secret ref')
  }

  const token = readProviderSecret(config.secretRef.id)
  if (!token) throw new Error('Claude setup-token secret is missing')
  env.CLAUDE_CODE_OAUTH_TOKEN = token
  return env
}
