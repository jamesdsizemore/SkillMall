import { spawn } from 'child_process'
import type { LLMClient, ProviderConfig, CompletionOptions } from './types'

function runClaudePrint(args: string[], input: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Claude Code CLI timed out'))
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8')
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve(stdout.trim())
        return
      }
      reject(new Error(stderr.trim() || `Claude Code CLI exited with code ${code ?? 'unknown'}`))
    })

    child.stdin.end(input)
  })
}

export class ClaudeCodeClient implements LLMClient {
  readonly provider = 'claude-code' as const
  private model: string

  constructor(config: ProviderConfig) {
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt

    return runClaudePrint(['--print', '--model', this.model], fullPrompt, options?.timeoutMs ?? 120_000)
  }
}
