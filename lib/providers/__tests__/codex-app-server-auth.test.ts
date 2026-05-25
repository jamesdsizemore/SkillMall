import { describe, expect, it, beforeEach } from 'vitest'
import {
  applyLoginCompletedNotification,
  cancelCodexAppServerAuthSession,
  getCodexAppServerAuthSession,
  resetCodexAuthSessionsForTest,
  setCodexAppServerTransportForTest,
  startCodexAppServerAuthSession,
} from '../codex-app-server-auth'

describe('Codex app-server auth sessions', () => {
  beforeEach(() => {
    resetCodexAuthSessionsForTest()
  })

  it('starts browser auth with loginId and authUrl without raw tokens', async () => {
    setCodexAppServerTransportForTest({
      async request(method, params) {
        expect(method).toBe('account/login/start')
        expect(params).toEqual({ type: 'chatgpt' })
        return { type: 'chatgpt', loginId: 'login-1', authUrl: 'https://chatgpt.com/auth' }
      },
    })

    const session = await startCodexAppServerAuthSession({ method: 'chatgpt' })

    expect(session).toMatchObject({
      providerRegistryId: 'openai_codex',
      method: 'chatgpt',
      status: 'authorization_required',
      loginId: 'login-1',
      authUrl: 'https://chatgpt.com/auth',
    })
    expect(JSON.stringify(session)).not.toMatch(/accessToken|refreshToken|sk-/)
  })

  it('starts device-code auth with verification URL and user code', async () => {
    setCodexAppServerTransportForTest({
      async request() {
        return {
          type: 'chatgptDeviceCode',
          loginId: 'login-2',
          verificationUrl: 'https://auth.openai.com/codex/device',
          userCode: 'ABCD-1234',
        }
      },
    })

    const session = await startCodexAppServerAuthSession({ method: 'chatgpt_device_code' })

    expect(session).toMatchObject({
      method: 'chatgpt_device_code',
      loginId: 'login-2',
      verificationUrl: 'https://auth.openai.com/codex/device',
      userCode: 'ABCD-1234',
    })
  })

  it('rejects OpenAI API-key URLs as Codex auth-token authorization pages', async () => {
    setCodexAppServerTransportForTest({
      async request() {
        return {
          type: 'chatgpt',
          loginId: 'login-api-key-page',
          authUrl: 'https://platform.openai.com/api-keys',
        }
      },
    })

    await expect(startCodexAppServerAuthSession({ method: 'chatgpt' })).rejects.toThrow(
      'Codex auth returned an OpenAI API-key page instead of an account authorization page.'
    )
  })

  it('updates status from account/login/completed notification', async () => {
    setCodexAppServerTransportForTest({
      async request() {
        return { type: 'chatgpt', loginId: 'login-3', authUrl: 'https://chatgpt.com/auth' }
      },
    })
    const session = await startCodexAppServerAuthSession()
    applyLoginCompletedNotification({ loginId: 'login-3', success: true, error: null })

    expect(getCodexAppServerAuthSession(session.flowId)).toMatchObject({
      status: 'ready',
      message: 'Codex account authentication completed.',
    })
  })

  it('cancels by loginId through app-server', async () => {
    const calls: Array<{ method: string; params: unknown }> = []
    setCodexAppServerTransportForTest({
      async request(method, params) {
        calls.push({ method, params })
        if (method === 'account/login/start') {
          return { type: 'chatgpt', loginId: 'login-4', authUrl: 'https://chatgpt.com/auth' }
        }
        return { status: 'canceled' }
      },
    })
    const session = await startCodexAppServerAuthSession()
    const cancelled = await cancelCodexAppServerAuthSession(session.flowId)

    expect(calls).toContainEqual({
      method: 'account/login/cancel',
      params: { loginId: 'login-4' },
    })
    expect(cancelled?.status).toBe('cancelled')
  })

  it('redacts app-server errors before returning them to callers', async () => {
    setCodexAppServerTransportForTest({
      async request() {
        throw new Error('failed accessToken="abc123" refresh_token=def456 idToken:ghi789 sk-secret-value')
      },
    })

    await expect(startCodexAppServerAuthSession()).rejects.toThrow(
      'failed accessToken=[redacted] refresh_token=[redacted] idToken=[redacted] [redacted]'
    )
  })
})
