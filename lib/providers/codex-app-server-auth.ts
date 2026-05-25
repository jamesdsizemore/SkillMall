import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import crypto from 'crypto'
import { checkLocalCliAuthStatus } from './local-cli-auth'

export type CodexAppServerAuthMethod = 'chatgpt' | 'chatgpt_device_code'

export type CodexAppServerAuthStatus =
  | 'authorization_required'
  | 'pending'
  | 'ready'
  | 'cancelled'
  | 'failed'

export type CodexAppServerAuthSession = {
  providerRegistryId: 'openai_codex'
  method: CodexAppServerAuthMethod
  status: CodexAppServerAuthStatus
  flowId: string
  loginId: string
  authUrl?: string
  verificationUrl?: string
  userCode?: string
  startedAt: string
  expiresAt: string
  message: string
}

type LoginAccountResponse =
  | { type: 'chatgpt'; loginId: string; authUrl: string }
  | { type: 'chatgptDeviceCode'; loginId: string; verificationUrl: string; userCode: string }

type JsonLineResponse = {
  id?: number
  result?: unknown
  error?: { message?: string } | string
  method?: string
  params?: unknown
}

type StoredSession = {
  publicSession: CodexAppServerAuthSession
  child: ChildProcessWithoutNullStreams
  nextId: number
  buffer: string
  pending: Map<number, {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }>
}

const SESSION_TIMEOUT_MS = 10 * 60 * 1000
const sessions = new Map<string, StoredSession>()

function assertNoApiKeyUrl(url: string | undefined): void {
  if (!url) return
  if (/platform\.openai\.com\/(?:api-keys|api_keys)/i.test(url)) {
    throw new Error('Codex app-server returned an OpenAI API-key URL instead of an account authorization URL.')
  }
}

function cleanMessage(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim()
    ? value.replace(/\s+/g, ' ').trim().slice(0, 240)
    : fallback
}

function publicSession(session: StoredSession): CodexAppServerAuthSession {
  return { ...session.publicSession }
}

function writeRequest(session: StoredSession, method: string, params: unknown): Promise<unknown> {
  const id = session.nextId++
  const payload = params === undefined ? { method, id } : { method, id, params }
  return new Promise((resolve, reject) => {
    session.pending.set(id, { resolve, reject })
    session.child.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
      if (!error) return
      session.pending.delete(id)
      reject(error)
    })
  })
}

function failPending(session: StoredSession, error: Error): void {
  for (const pending of session.pending.values()) pending.reject(error)
  session.pending.clear()
}

function closeSession(flowId: string): void {
  const session = sessions.get(flowId)
  if (!session) return
  sessions.delete(flowId)
  const pid = session.child.pid
  session.child.stdin.destroy()
  session.child.stdout.destroy()
  session.child.stderr.destroy()
  if (pid) {
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      try {
        process.kill(pid, 'SIGTERM')
      } catch {}
    }
    setTimeout(() => {
      try {
        process.kill(-pid, 'SIGKILL')
      } catch {
        try {
          process.kill(pid, 'SIGKILL')
        } catch {}
      }
    }, 1_000).unref()
  } else if (!session.child.killed) {
    session.child.kill('SIGTERM')
  }
}

function handleNotification(session: StoredSession, message: JsonLineResponse): void {
  if (message.method !== 'account/login/completed') return
  const params = message.params as { loginId?: unknown; success?: unknown; error?: unknown } | undefined
  if (!params) return
  const loginIdMatches =
    typeof params.loginId !== 'string' ||
    params.loginId === session.publicSession.loginId
  if (!loginIdMatches) return

  if (params.success === true) {
    session.publicSession = {
      ...session.publicSession,
      status: 'ready',
      message: 'Codex account authorization completed.',
    }
    return
  }

  session.publicSession = {
    ...session.publicSession,
    status: 'failed',
    message: cleanMessage(params.error, 'Codex account authorization failed.'),
  }
}

function handleLine(session: StoredSession, line: string): void {
  if (!line.trim()) return
  const message = JSON.parse(line) as JsonLineResponse

  if (typeof message.id === 'number') {
    const pending = session.pending.get(message.id)
    if (!pending) return
    session.pending.delete(message.id)
    if (message.error) {
      pending.reject(new Error(cleanMessage(
        typeof message.error === 'string' ? message.error : message.error.message,
        'Codex app-server request failed.'
      )))
      return
    }
    pending.resolve(message.result)
    return
  }

  handleNotification(session, message)
}

function attachProcessHandlers(flowId: string, session: StoredSession): void {
  session.child.stdout.setEncoding('utf8')
  session.child.stderr.setEncoding('utf8')
  session.child.stdout.on('data', (chunk: string) => {
    session.buffer += chunk
    for (;;) {
      const newlineIndex = session.buffer.indexOf('\n')
      if (newlineIndex === -1) break
      const line = session.buffer.slice(0, newlineIndex)
      session.buffer = session.buffer.slice(newlineIndex + 1)
      try {
        handleLine(session, line)
      } catch (error) {
        session.publicSession = {
          ...session.publicSession,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Codex app-server response parsing failed.',
        }
      }
    }
  })
  session.child.on('error', (error) => {
    session.publicSession = {
      ...session.publicSession,
      status: 'failed',
      message: error.message,
    }
    failPending(session, error)
  })
  session.child.on('close', () => {
    failPending(session, new Error('Codex app-server process closed.'))
    if (session.publicSession.status === 'ready' || session.publicSession.status === 'cancelled') return
    session.publicSession = {
      ...session.publicSession,
      status: session.publicSession.status === 'authorization_required' ? 'pending' : 'failed',
      message:
        session.publicSession.status === 'authorization_required'
          ? session.publicSession.message
          : 'Codex app-server process closed before authorization completed.',
    }
  })

  setTimeout(() => {
    const latest = sessions.get(flowId)
    if (!latest) return
    if (latest.publicSession.status === 'authorization_required' || latest.publicSession.status === 'pending') {
      latest.publicSession = {
        ...latest.publicSession,
        status: 'failed',
        message: 'Codex authorization expired before completion.',
      }
      closeSession(flowId)
    }
  }, SESSION_TIMEOUT_MS).unref()
}

function methodParams(method: CodexAppServerAuthMethod) {
  return method === 'chatgpt'
    ? { type: 'chatgpt', codexStreamlinedLogin: true }
    : { type: 'chatgptDeviceCode' }
}

function normalizeLoginResponse(
  method: CodexAppServerAuthMethod,
  response: unknown,
  flowId: string,
  startedAt: Date,
): CodexAppServerAuthSession {
  const result = response as LoginAccountResponse
  if (result.type === 'chatgpt') {
    assertNoApiKeyUrl(result.authUrl)
    return {
      providerRegistryId: 'openai_codex',
      method,
      status: 'authorization_required',
      flowId,
      loginId: result.loginId,
      authUrl: result.authUrl,
      startedAt: startedAt.toISOString(),
      expiresAt: new Date(startedAt.getTime() + SESSION_TIMEOUT_MS).toISOString(),
      message: 'Open the authorization page to authorize OpenAI Codex.',
    }
  }

  if (result.type === 'chatgptDeviceCode') {
    assertNoApiKeyUrl(result.verificationUrl)
    return {
      providerRegistryId: 'openai_codex',
      method,
      status: 'authorization_required',
      flowId,
      loginId: result.loginId,
      verificationUrl: result.verificationUrl,
      userCode: result.userCode,
      startedAt: startedAt.toISOString(),
      expiresAt: new Date(startedAt.getTime() + SESSION_TIMEOUT_MS).toISOString(),
      message: 'Open the authorization page and enter the displayed code to authorize OpenAI Codex.',
    }
  }

  throw new Error('Codex app-server did not return a supported account authorization response.')
}

export async function startCodexAppServerAuth(
  method: CodexAppServerAuthMethod = 'chatgpt_device_code'
): Promise<CodexAppServerAuthSession> {
  const flowId = crypto.randomUUID()
  const startedAt = new Date()
  const child = spawn('codex', ['app-server', '--listen', 'stdio://'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: true,
  })

  const stored: StoredSession = {
    publicSession: {
      providerRegistryId: 'openai_codex',
      method,
      status: 'pending',
      flowId,
      loginId: '',
      startedAt: startedAt.toISOString(),
      expiresAt: new Date(startedAt.getTime() + SESSION_TIMEOUT_MS).toISOString(),
      message: 'Starting Codex app-server authorization.',
    },
    child,
    nextId: 1,
    buffer: '',
    pending: new Map(),
  }
  sessions.set(flowId, stored)
  attachProcessHandlers(flowId, stored)

  try {
    await writeRequest(stored, 'initialize', {
      clientInfo: {
        name: 'skill-mall',
        title: 'SkillMall',
        version: '0.0.0',
      },
      capabilities: {
        experimentalApi: true,
        requestAttestation: false,
        optOutNotificationMethods: [],
      },
    })
    const response = await writeRequest(stored, 'account/login/start', methodParams(method))
    stored.publicSession = normalizeLoginResponse(method, response, flowId, startedAt)
    return publicSession(stored)
  } catch (error) {
    closeSession(flowId)
    throw error
  }
}

export function getCodexAppServerAuthStatus(flowId: string): CodexAppServerAuthSession | null {
  const session = sessions.get(flowId)
  return session ? publicSession(session) : null
}

export async function refreshCodexAppServerAuthStatus(flowId: string): Promise<CodexAppServerAuthSession | null> {
  const session = sessions.get(flowId)
  if (!session) return null

  if (session.publicSession.status === 'authorization_required' || session.publicSession.status === 'pending') {
    const cliStatus = await checkLocalCliAuthStatus('openai_codex')
    if (cliStatus.available && cliStatus.authenticated) {
      session.publicSession = {
        ...session.publicSession,
        status: 'ready',
        message: 'Codex account authorization completed.',
      }
    }
  }

  const result = publicSession(session)
  if (result.status === 'ready' || result.status === 'failed' || result.status === 'cancelled') {
    closeSession(flowId)
  }
  return result
}

export async function cancelCodexAppServerAuth(flowId: string): Promise<CodexAppServerAuthSession | null> {
  const session = sessions.get(flowId)
  if (!session) return null
  try {
    if (session.publicSession.loginId) {
      await writeRequest(session, 'account/login/cancel', { loginId: session.publicSession.loginId })
    }
  } catch {}
  session.publicSession = {
    ...session.publicSession,
    status: 'cancelled',
    message: 'Codex authorization cancelled.',
  }
  const result = publicSession(session)
  closeSession(flowId)
  return result
}
