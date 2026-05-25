import { execFile } from 'child_process'
import { promisify } from 'util'
import { skillMallCodexHome } from './codex-app-server-auth'
import type { CompletionOptions, LLMClient, ProviderConfig } from './types'

const execFileAsync = promisify(execFile)

export class CodexClient implements LLMClient {
  readonly provider = 'codex' as const
  private model: string

  constructor(config: ProviderConfig) {
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt
    const env: NodeJS.ProcessEnv = { ...process.env, CODEX_HOME: skillMallCodexHome() }
    delete env.OPENAI_API_KEY
    delete env.CODEX_API_KEY

    const { stdout } = await execFileAsync(
      'codex',
      ['exec', '--model', this.model, '--sandbox', 'read-only', fullPrompt],
      {
        env,
        maxBuffer: 10 * 1024 * 1024,
        timeout: options?.timeoutMs ?? 120_000,
      }
    )

    return stdout.trim()
  }
}
