import { afterEach, describe, expect, it, vi } from 'vitest'
import { providerPoliciesCommand } from './provider-policies'

describe('provider policies CLI safety', () => {
  const originalExitCode = process.exitCode

  afterEach(() => {
    process.exitCode = originalExitCode
    vi.restoreAllMocks()
  })

  it.each([
    ['--key', 'raw-key'],
    ['--token', 'raw-token'],
    ['--session-token', 'raw-session-token'],
    ['--session-cookie', 'raw-session-cookie'],
    ['--browser-session-cookie', 'raw-browser-session-cookie'],
    ['--auth-cookie', 'raw-auth-cookie'],
    ['--credential-path', '/Users/test/.codex/auth.json'],
    ['--prompt', 'do not store this'],
    ['--response', 'do not store this either'],
    ['--output', 'do not store output'],
  ])('rejects unsafe policy input flag %s without echoing its value', async (flag, value) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await providerPoliciesCommand(['simulate', flag, value])

    expect(process.exitCode).toBe(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining(flag))
    expect(error.mock.calls.flat().join('\n')).not.toContain(value)
  })

  it.each([
    ['--key=raw-key', '--key', 'raw-key'],
    ['--session-cookie=raw-session-cookie', '--session-cookie', 'raw-session-cookie'],
  ])('rejects equals-form unsafe policy input %s without echoing its value', async (arg, flag, value) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await providerPoliciesCommand(['simulate', arg])

    expect(process.exitCode).toBe(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining(flag))
    expect(error.mock.calls.flat().join('\n')).not.toContain(value)
  })
})
