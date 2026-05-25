import { describe, expect, it } from 'vitest'
import { parseClaudeAuthStatus, parseCodexLoginStatus } from '../local-cli-auth'

describe('local CLI auth status parsing', () => {
  it('recognizes active Codex ChatGPT login without exposing token material', () => {
    expect(parseCodexLoginStatus('Logged in using ChatGPT')).toEqual({
      available: true,
      authenticated: true,
      authMethod: 'ChatGPT',
      message: 'Logged in using ChatGPT',
    })
  })

  it('recognizes Codex login status when the CLI writes status text to stderr', () => {
    expect(parseCodexLoginStatus(' Logged in using ChatGPT')).toMatchObject({
      available: true,
      authenticated: true,
      authMethod: 'ChatGPT',
    })
  })

  it('does not treat inactive Codex login text as authenticated', () => {
    expect(parseCodexLoginStatus('Not logged in')).toEqual({
      available: true,
      authenticated: false,
      authMethod: undefined,
      message: 'Not logged in',
    })
  })

  it('recognizes Claude Code account auth status from JSON', () => {
    expect(parseClaudeAuthStatus(JSON.stringify({
      loggedIn: true,
      authMethod: 'claude.ai',
      apiProvider: 'firstParty',
      email: 'user@example.com',
      subscriptionType: 'max',
    }))).toEqual({
      available: true,
      authenticated: true,
      authMethod: 'claude.ai / max',
      message: 'Claude Code auth is active.',
    })
  })

  it('does not treat inactive Claude auth text as authenticated', () => {
    expect(parseClaudeAuthStatus('Not authenticated')).toEqual({
      available: true,
      authenticated: false,
      message: 'Not authenticated',
    })
  })
})
