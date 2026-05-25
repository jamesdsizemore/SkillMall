import { describe, expect, it, vi } from 'vitest'
import { buildClaudeCodeEnv } from '../claude-code-env'

const setupTokenFixture = ['sk-ant-oat01', 'test-token'].join('-')

vi.mock('../secret-store', () => ({
  readProviderSecret: vi.fn((id: string) => (id === 'claude_code:setup_token' ? setupTokenFixture : undefined)),
}))

describe('Claude Code setup-token auth', () => {
  it('injects setup-token only for claude_setup_token execution and clears conflicting auth env', () => {
    const env = buildClaudeCodeEnv(
      {
        provider: 'claude-code',
        providerRegistryId: 'claude_code',
        model: 'claude-sonnet-4-6',
        authMode: 'claude_setup_token',
        secretRef: {
          type: 'stored_provider_secret',
          id: 'claude_code:setup_token',
          providerRegistryId: 'claude_code',
          secretType: 'setup_token',
        },
      },
      {
        ANTHROPIC_API_KEY: 'wrong-api-key',
        ANTHROPIC_AUTH_TOKEN: 'wrong-auth-token',
        CLAUDE_CODE_OAUTH_TOKEN: 'wrong-token',
        CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: '3',
        PATH: '/usr/bin',
      }
    )

    expect(env.CLAUDE_CODE_OAUTH_TOKEN).toBe(setupTokenFixture)
    expect(env.ANTHROPIC_API_KEY).toBeUndefined()
    expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined()
    expect(env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR).toBeUndefined()
    expect(env.PATH).toBe('/usr/bin')
  })

  it('leaves ambient env untouched for local CLI session auth', () => {
    const env = buildClaudeCodeEnv(
      {
        provider: 'claude-code',
        providerRegistryId: 'claude_code',
        model: 'claude-sonnet-4-6',
        authMode: 'local_cli_session',
        secretRef: { type: 'none' },
      },
      { CLAUDE_CODE_OAUTH_TOKEN: 'ambient-token' }
    )

    expect(env.CLAUDE_CODE_OAUTH_TOKEN).toBe('ambient-token')
  })

  it('rejects setup-token refs that are not the Claude app-managed secret', () => {
    expect(() =>
      buildClaudeCodeEnv(
        {
          provider: 'claude-code',
          providerRegistryId: 'claude_code',
          model: 'claude-sonnet-4-6',
          authMode: 'claude_setup_token',
          secretRef: {
            type: 'stored_provider_secret',
            id: 'anthropic:setup_token',
            providerRegistryId: 'anthropic',
            secretType: 'setup_token',
          },
        },
        {}
      )
    ).toThrow('Claude setup-token execution requires the Claude app-managed setup-token secret ref')
  })
})
