import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import readline from 'readline'

export type CodexAuthMethod = 'chatgpt' | 'chatgpt_device_code'
export type ProviderAuthSessionStatus = 'authorization_required' | 'pending' | 'ready' | 'cancelled' | 'expired' | 'failed'

export type ProviderAuthSession = {
  providerRegistryId: 'openai_codex'
  method: CodexAuthMethod
  status: ProviderAuthSessionStatus
  flowId: string
  loginId: string
  authUrl?: string
  verificationUrl?: string
  userCode?: string
  expiresAt: string
  message: string
  error?: string
}

type LoginAccountResponse =
  | { type: 'apiKey' }
  | { type: 'chatgpt'; loginId: string; authUrl: string }
  | { type: 'chatgptDeviceCode'; loginId: string; verificationUrl: string; userCode: string }
  | { type: 'chatgptAuthTokens' }

type JsonRpcResponse = {
  id?: number
  result?: unknown
  error?: { message?: string } | string
  method?: string
  params?: unknown
}

type GetAuthStatusResponse = {
  authMethod?: string | null
  authToken?: string | null
  requiresOpenaiAuth?: boolean | null
}

export type CodexAppServerAuthStatus = {
  authMethod: string | null
  requiresOpenaiAuth: boolean | null
  ready: boolean
}

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type CodexAppServerTransport = {
  request(method: string, params: unknown): Promise<unknown>
}

const CODEX_AUTH_TIMEOUT_MS = 15 * 60_000
const DEFAULT_CODEX_HOME = path.join(os.homedir(), '.skill-mall', 'codex-home')
const sessions = new Map<string, ProviderAuthSession>()
const loginToFlow = new Map<string, string>()
let transportForTest: CodexAppServerTransport | null = null

export function skillMallCodexHome(): string {
  return process.env.SKILL_MALL_CODEX_HOME?.trim() || DEFAULT_CODEX_HOME
}

export function setCodexAppServerTransportForTest(transport: CodexAppServerTransport | null): void {
  transportForTest = transport
  sessions.clear()
  loginToFlow.clear()
}

export function resetCodexAuthSessionsForTest(): void {
  sessions.clear()
  loginToFlow.clear()
}

class StdioCodexAppServerTransport implements CodexAppServerTransport {
  private child: ChildProcessWithoutNullStreams | null = null
  private nextId = 1
  private pending = new Map<number, PendingRequest>()
  private initialized: Promise<void> | null = null

  async request(method: string, params: unknown): Promise<unknown> {
    await this.ensureInitialized()
    return this.sendRequest(method, params)
  }

  private sendRequest(method: string, params: unknown): Promise<unknown> {
    const child = this.child
    if (!child) throw new Error('Codex app-server failed to start')
    const id = this.nextId++
    const payload = JSON.stringify({ id, method, params })
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Codex app-server request timed out: ${method}`))
      }, 30_000)
      this.pending.set(id, { resolve, reject, timer })
      child.stdin.write(payload + '\n', 'utf-8')
    })
  }

  private async ensureInitialized(): Promise<void> {
    const child = this.ensureStarted()
    if (!this.initialized) {
      this.initialized = this.sendRequest('initialize', {
        clientInfo: {
          name: 'skill-mall',
          title: 'SkillMall',
          version: '0.1.0',
        },
        capabilities: {
          experimentalApi: false,
          requestAttestation: false,
          optOutNotificationMethods: [],
        },
      })
        .then(() => {
          child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n', 'utf-8')
        })
        .catch((error) => {
          this.initialized = null
          throw error
        })
    }
    await this.initialized
  }

  private ensureStarted(): ChildProcessWithoutNullStreams {
    if (this.child && !this.child.killed) return this.child
    fs.mkdirSync(skillMallCodexHome(), { recursive: true, mode: 0o700 })
    const env: NodeJS.ProcessEnv = { ...process.env, CODEX_HOME: skillMallCodexHome() }
    delete env.OPENAI_API_KEY
    delete env.CODEX_API_KEY
    const child = spawn('codex', ['app-server', '--listen', 'stdio://'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.child = child
    this.initialized = null

    const stdout = readline.createInterface({ input: child.stdout })
    stdout.on('line', (line) => this.handleLine(line))
    child.stderr.on('data', () => {
      // Do not forward app-server stderr; it may contain environment-specific paths.
    })
    child.on('exit', () => {
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timer)
        pending.reject(new Error('Codex app-server exited before responding'))
        this.pending.delete(id)
      }
      this.child = null
      this.initialized = null
    })
    return child
  }

  private handleLine(line: string): void {
    if (!line.trim()) return
    let message: JsonRpcResponse
    try {
      message = JSON.parse(line) as JsonRpcResponse
    } catch {
      return
    }

    if (typeof message.id === 'number') {
      const pending = this.pending.get(message.id)
      if (!pending) return
      clearTimeout(pending.timer)
      this.pending.delete(message.id)
      if (message.error) {
        const text = typeof message.error === 'string' ? message.error : message.error.message
        pending.reject(new Error(text || 'Codex app-server request failed'))
      } else {
        pending.resolve(message.result)
      }
      return
    }

    if (message.method === 'account/login/completed') {
      applyLoginCompletedNotification(message.params)
    }
  }
}

const defaultTransport = new StdioCodexAppServerTransport()

function transport(): CodexAppServerTransport {
  return transportForTest ?? defaultTransport
}

function sanitizeAppServerError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/((?:access|refresh|id)[_-]?token)["=: ]+[^,\s}]+/gi, '$1=[redacted]')
}

function sessionMessage(session: Pick<ProviderAuthSession, 'method' | 'status'>): string {
  if (session.status === 'ready') return 'Codex account authentication completed.'
  if (session.status === 'failed') return 'Codex account authentication failed.'
  if (session.status === 'cancelled') return 'Codex account authentication was cancelled.'
  if (session.status === 'expired') return 'Codex account authentication expired.'
  if (session.method === 'chatgpt_device_code') return 'Open the verification URL and enter the displayed user code.'
  return 'Open the Codex authorization page to continue.'
}

function assertNotApiKeyUrl(value: string | undefined): void {
  if (!value) return
  const normalized = value.toLowerCase()
  if (normalized.includes('platform.openai.com/api-keys') || normalized.includes('platform.openai.com/api_keys')) {
    throw new Error('Codex auth returned an OpenAI API-key page instead of an account authorization page.')
  }
}

function redactSession(session: ProviderAuthSession): ProviderAuthSession {
  return { ...session }
}

function expireIfNeeded(session: ProviderAuthSession): ProviderAuthSession {
  if (
    (session.status === 'authorization_required' || session.status === 'pending') &&
    Date.now() > Date.parse(session.expiresAt)
  ) {
    session.status = 'expired'
    session.message = sessionMessage(session)
  }
  return session
}

function buildSession(method: CodexAuthMethod, result: LoginAccountResponse): ProviderAuthSession {
  if (result.type === 'chatgpt') {
    assertNotApiKeyUrl(result.authUrl)
    const session = {
      providerRegistryId: 'openai_codex' as const,
      method,
      status: 'authorization_required' as const,
      flowId: crypto.randomUUID(),
      loginId: result.loginId,
      authUrl: result.authUrl,
      expiresAt: new Date(Date.now() + CODEX_AUTH_TIMEOUT_MS).toISOString(),
      message: 'Open the Codex authorization page to continue.',
    }
    return session
  }
  if (result.type === 'chatgptDeviceCode') {
    assertNotApiKeyUrl(result.verificationUrl)
    const session = {
      providerRegistryId: 'openai_codex' as const,
      method,
      status: 'authorization_required' as const,
      flowId: crypto.randomUUID(),
      loginId: result.loginId,
      verificationUrl: result.verificationUrl,
      userCode: result.userCode,
      expiresAt: new Date(Date.now() + CODEX_AUTH_TIMEOUT_MS).toISOString(),
      message: 'Open the verification URL and enter the displayed user code.',
    }
    return session
  }
  throw new Error(`Unsupported Codex app-server login response: ${result.type}`)
}

export async function startCodexAppServerAuthSession(input: {
  method?: CodexAuthMethod
} = {}): Promise<ProviderAuthSession> {
  const method = input.method ?? 'chatgpt'
  const params = method === 'chatgpt_device_code' ? { type: 'chatgptDeviceCode' } : { type: 'chatgpt' }
  try {
    const result = (await transport().request('account/login/start', params)) as LoginAccountResponse
    const session = buildSession(method, result)
    sessions.set(session.flowId, session)
    loginToFlow.set(session.loginId, session.flowId)
    return redactSession(session)
  } catch (error) {
    throw new Error(sanitizeAppServerError(error))
  }
}

export async function getCodexAppServerAuthStatus(): Promise<CodexAppServerAuthStatus> {
  try {
    const result = (await transport().request('getAuthStatus', {
      includeToken: false,
      refreshToken: false,
    })) as GetAuthStatusResponse
    const authMethod = typeof result.authMethod === 'string' ? result.authMethod : null
    const requiresOpenaiAuth =
      typeof result.requiresOpenaiAuth === 'boolean' ? result.requiresOpenaiAuth : null
    return {
      authMethod,
      requiresOpenaiAuth,
      ready: authMethod !== null && requiresOpenaiAuth === false,
    }
  } catch (error) {
    throw new Error(sanitizeAppServerError(error))
  }
}

export function getCodexAppServerAuthSession(flowId: string): ProviderAuthSession | undefined {
  const session = sessions.get(flowId)
  return session ? redactSession(expireIfNeeded(session)) : undefined
}

export async function cancelCodexAppServerAuthSession(flowId: string): Promise<ProviderAuthSession | undefined> {
  const session = sessions.get(flowId)
  if (!session) return undefined
  try {
    await transport().request('account/login/cancel', { loginId: session.loginId })
  } catch (error) {
    session.status = 'failed'
    session.error = sanitizeAppServerError(error)
    session.message = sessionMessage(session)
    return redactSession(session)
  }
  session.status = 'cancelled'
  session.message = sessionMessage(session)
  return redactSession(session)
}

export function applyLoginCompletedNotification(params: unknown): void {
  if (!params || typeof params !== 'object') return
  const event = params as { loginId?: unknown; success?: unknown; error?: unknown }
  if (typeof event.loginId !== 'string') return
  const flowId = loginToFlow.get(event.loginId)
  if (!flowId) return
  const session = sessions.get(flowId)
  if (!session) return
  session.status = event.success === true ? 'ready' : 'failed'
  if (typeof event.error === 'string' && event.error.trim()) {
    session.error = sanitizeAppServerError(event.error)
  }
  session.message = sessionMessage(session)
}
