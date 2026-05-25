import { spawn } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { CompletionOptions, LLMClient, ProviderConfig } from './types'

function runCodexExec(args: string[], input: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, {
      stdio: ['pipe', 'ignore', 'pipe'],
    })
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Codex CLI timed out'))
    }, timeoutMs)

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
        resolve()
        return
      }
      reject(new Error(stderr.trim() || `Codex CLI exited with code ${code ?? 'unknown'}`))
    })

    child.stdin.end(input)
  })
}

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
    const outputFile = path.join(
      os.tmpdir(),
      `skill-mall-codex-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`
    )

    try {
      await runCodexExec([
        'exec',
        '--model',
        this.model,
        '--sandbox',
        'read-only',
        '--ask-for-approval',
        'never',
        '--ephemeral',
        '--output-last-message',
        outputFile,
        '-',
      ], fullPrompt, options?.timeoutMs ?? 120_000)

      const result = await fs.readFile(outputFile, 'utf-8')
      return result.trim()
    } finally {
      await fs.rm(outputFile, { force: true }).catch(() => undefined)
    }
  }
}
