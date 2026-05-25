import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import type { ProviderRegistryID } from './types'

const execFileAsync = promisify(execFile)

export type LocalCliAuthStatus = {
  available: boolean
  authenticated: boolean
  authMethod?: string
  message: string
}

export type LocalCliAuthFlow = {
  providerRegistryId: ProviderRegistryID
  started: boolean
  command: string
  launchedInTerminal: boolean
  message: string
}

function cleanMessage(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function isCommandMissing(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'ENOENT')
}

function errorOutput(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const candidate = error as { stdout?: unknown; stderr?: unknown; message?: unknown }
  const stdout = Buffer.isBuffer(candidate.stdout) ? candidate.stdout.toString('utf-8') : candidate.stdout
  const stderr = Buffer.isBuffer(candidate.stderr) ? candidate.stderr.toString('utf-8') : candidate.stderr
  return [stdout, stderr, candidate.message].filter((value): value is string => typeof value === 'string').join(' ')
}

function authFlowCommand(providerRegistryId: ProviderRegistryID): { executable: string; args: string[] } | null {
  if (providerRegistryId === 'openai_codex') {
    return { executable: 'codex', args: ['login', '--device-auth'] }
  }

  if (providerRegistryId === 'claude_code') {
    return { executable: 'claude', args: ['auth', 'login'] }
  }

  return null
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

async function ensureExecutableAvailable(executable: string): Promise<void> {
  await execFileAsync(executable, ['--help'], {
    timeout: 5_000,
    maxBuffer: 256 * 1024,
  })
}

async function launchCommandInTerminal(executable: string, args: string[]): Promise<boolean> {
  const displayCommand = [executable, ...args].map(shellQuote).join(' ')
  const shellCommand = `cd ${shellQuote(process.cwd())}; ${displayCommand}`

  if (process.platform !== 'darwin') {
    const child = spawn(executable, args, {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    return false
  }

  await execFileAsync('osascript', [
    '-e',
    `tell application "Terminal" to do script ${appleScriptString(shellCommand)}`,
    '-e',
    'tell application "Terminal" to activate',
  ], {
    timeout: 10_000,
    maxBuffer: 256 * 1024,
  })
  return true
}

export function parseCodexLoginStatus(stdout: string): LocalCliAuthStatus {
  const message = cleanMessage(stdout)
  const authenticated = /\blogged in\b/i.test(message) && !/\bnot logged in\b/i.test(message)
  return {
    available: true,
    authenticated,
    authMethod: /chatgpt/i.test(message) ? 'ChatGPT' : undefined,
    message: message || 'Codex login status returned no output.',
  }
}

export function parseClaudeAuthStatus(stdout: string): LocalCliAuthStatus {
  try {
    const parsed = JSON.parse(stdout) as { loggedIn?: unknown; authMethod?: unknown; subscriptionType?: unknown }
    const method = typeof parsed.authMethod === 'string' ? parsed.authMethod : undefined
    const subscription = typeof parsed.subscriptionType === 'string' ? parsed.subscriptionType : undefined
    return {
      available: true,
      authenticated: parsed.loggedIn === true,
      authMethod: [method, subscription].filter(Boolean).join(' / ') || undefined,
      message: parsed.loggedIn === true ? 'Claude Code auth is active.' : 'Claude Code auth is not active.',
    }
  } catch {
    const message = cleanMessage(stdout)
    const authenticated = /\b(logged in|authenticated)\b/i.test(message) && !/\b(not logged in|not authenticated)\b/i.test(message)
    return {
      available: true,
      authenticated,
      message: message || 'Claude auth status returned no output.',
    }
  }
}

export async function checkLocalCliAuthStatus(providerRegistryId: ProviderRegistryID): Promise<LocalCliAuthStatus> {
  try {
    if (providerRegistryId === 'openai_codex') {
      const { stdout, stderr } = await execFileAsync('codex', ['login', 'status'], {
        timeout: 10_000,
        maxBuffer: 256 * 1024,
      })
      return parseCodexLoginStatus(`${stdout} ${stderr}`)
    }

    if (providerRegistryId === 'claude_code') {
      const { stdout, stderr } = await execFileAsync('claude', ['auth', 'status'], {
        timeout: 10_000,
        maxBuffer: 256 * 1024,
      })
      return parseClaudeAuthStatus(stdout || stderr)
    }
  } catch (error) {
    if (!isCommandMissing(error)) {
      const output = errorOutput(error)
      if (providerRegistryId === 'openai_codex') return parseCodexLoginStatus(output)
      if (providerRegistryId === 'claude_code') return parseClaudeAuthStatus(output)
    }

    return {
      available: false,
      authenticated: false,
      message: error instanceof Error ? cleanMessage(error.message) : 'Local CLI auth status failed.',
    }
  }

  return {
    available: false,
    authenticated: false,
    message: 'No local CLI auth check is implemented for this provider.',
  }
}

export async function startLocalCliAuthFlow(providerRegistryId: ProviderRegistryID): Promise<LocalCliAuthFlow> {
  const command = authFlowCommand(providerRegistryId)
  if (!command) {
    return {
      providerRegistryId,
      started: false,
      command: '',
      launchedInTerminal: false,
      message: 'No local CLI auth flow is implemented for this provider.',
    }
  }

  const commandLabel = [command.executable, ...command.args].join(' ')

  try {
    await ensureExecutableAvailable(command.executable)
    const launchedInTerminal = await launchCommandInTerminal(command.executable, command.args)
    return {
      providerRegistryId,
      started: true,
      command: commandLabel,
      launchedInTerminal,
      message: launchedInTerminal
        ? 'Local CLI auth flow opened in Terminal.'
        : 'Local CLI auth flow started. Complete the command in your local environment.',
    }
  } catch (error) {
    return {
      providerRegistryId,
      started: false,
      command: commandLabel,
      launchedInTerminal: false,
      message: error instanceof Error ? cleanMessage(error.message) : 'Local CLI auth flow failed to start.',
    }
  }
}
