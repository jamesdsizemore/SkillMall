import { execFile } from 'child_process'
import { promisify } from 'util'
import type { LLMClient, ProviderConfig, CompletionOptions } from './types'

const execFileAsync = promisify(execFile)

export class ClaudeCodeClient implements LLMClient {
  readonly provider = 'claude-code' as const
  private model: string

  constructor(config: ProviderConfig) {
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    // claude CLI uses -p / --print for non-interactive output
    // System prompt is prepended to user prompt (no separate --system flag)
    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt

    const { stdout } = await execFileAsync(
      'claude',
      ['--print', '--model', this.model, fullPrompt],
      {
        maxBuffer: 10 * 1024 * 1024,
        timeout: options?.timeoutMs ?? 120_000,
      }
    )

    return stdout.trim()
  }
}
