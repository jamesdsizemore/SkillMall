import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export type LocalCliAuthStatus = {
  providerRegistryId: 'claude_code'
  mode: 'local_cli_session'
  loggedIn: boolean
  message: string
}

export async function getClaudeLocalCliAuthStatus(): Promise<LocalCliAuthStatus> {
  try {
    const { stdout } = await execFileAsync('claude', ['auth', 'status', '--json'], {
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    })
    const parsed = JSON.parse(stdout) as { loggedIn?: boolean }
    return {
      providerRegistryId: 'claude_code',
      mode: 'local_cli_session',
      loggedIn: parsed.loggedIn === true,
      message: parsed.loggedIn === true
        ? 'Claude CLI is authenticated on this host.'
        : 'Claude CLI is not authenticated on this host; run claude auth login in Terminal.',
    }
  } catch {
    return {
      providerRegistryId: 'claude_code',
      mode: 'local_cli_session',
      loggedIn: false,
      message: 'Claude CLI status could not be read; run claude auth login in Terminal.',
    }
  }
}
