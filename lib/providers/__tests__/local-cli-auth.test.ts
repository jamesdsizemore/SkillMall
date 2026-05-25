import { describe, expect, it } from 'vitest'
import type { LocalCliAuthStatus } from '../local-cli-auth'

describe('local CLI auth types', () => {
  it('keeps Claude local CLI auth distinct from setup-token auth', () => {
    const status: LocalCliAuthStatus = {
      providerRegistryId: 'claude_code',
      mode: 'local_cli_session',
      loggedIn: false,
      message: 'Run claude auth login in Terminal.',
    }

    expect(status.mode).toBe('local_cli_session')
    expect(status.message).toContain('Terminal')
  })
})
