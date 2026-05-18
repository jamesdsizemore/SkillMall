import fs from 'node:fs'
import path from 'node:path'
import { runResearchEngineFromText } from './research-engine'
import type { LLMClient } from './providers'
import type { ResearchResult } from './validators'

const COMBINED_CHAR_CAP = 20_000
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.turbo'])
const SUPPORTED_EXTENSIONS = ['.md', '.ts', '.js', '.py', '.txt', '.go', '.rb', '.java']

export async function extractFromCodebase(
  targetDir: string,
  topic: string,
  focus: string[],
  client: LLMClient
): Promise<ResearchResult> {
  const resolved = path.resolve(targetDir)
  const cwd = process.cwd()

  if (!resolved.startsWith(cwd)) {
    throw new Error(
      `Target directory must be within the project directory.\n` +
      `  Target: ${resolved}\n` +
      `  Project: ${cwd}`
    )
  }

  const files = collectFiles(resolved, SUPPORTED_EXTENSIONS)

  const content = files
    .map(f => `// File: ${path.relative(resolved, f)}\n${fs.readFileSync(f, 'utf-8')}`)
    .join('\n\n---\n\n')
    .slice(0, COMBINED_CHAR_CAP)

  const focusClause =
    focus.length > 0
      ? `Focus specifically on: ${focus.join(', ')}.`
      : 'Extract all identifiable patterns, conventions, and practices.'

  return runResearchEngineFromText(topic, content, client, focusClause)
}

function collectFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    // Never follow symlinks — path traversal risk
    if (entry.isSymbolicLink()) continue

    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      results.push(...collectFiles(fullPath, extensions))
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath)
    }
  }

  return results
}
