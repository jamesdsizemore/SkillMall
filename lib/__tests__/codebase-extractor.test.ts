import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Mock the research engine to avoid LLM calls
vi.mock('../research-engine', () => ({
  runResearchEngineFromText: vi.fn().mockResolvedValue({
    topic: 'test topic',
    sources: [],
    researchUnverified: true,
    summary: 'Apply conventions extracted from the codebase.',
    tools: [],
    principles: [],
    suggestedCategory: 'development',
    suggestedTags: ['testing'],
  }),
}))

import { extractFromCodebase } from '../codebase-extractor'
import { runResearchEngineFromText } from '../research-engine'

const mockClient = {
  complete: vi.fn().mockResolvedValue('{}'),
  provider: 'openai' as const,
  model: 'gpt-4',
}

describe('extractFromCodebase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns result with researchUnverified: true', async () => {
    const result = await extractFromCodebase(process.cwd(), 'conventions', [], mockClient)
    expect(result.researchUnverified).toBe(true)
  })

  it('passes focus clause when focus is provided', async () => {
    await extractFromCodebase(process.cwd(), 'conventions', ['error handling', 'naming'], mockClient)
    const call = vi.mocked(runResearchEngineFromText).mock.calls[0]
    expect(call[3]).toContain('error handling')
    expect(call[3]).toContain('naming')
  })

  it('passes generic clause when no focus specified', async () => {
    await extractFromCodebase(process.cwd(), 'conventions', [], mockClient)
    const call = vi.mocked(runResearchEngineFromText).mock.calls[0]
    expect(call[3]).toContain('Extract all identifiable patterns')
  })

  it('throws when targetDir is outside process.cwd()', async () => {
    await expect(
      extractFromCodebase('/tmp/outside-project', 'conventions', [], mockClient)
    ).rejects.toThrow('Target directory must be within the project directory')
  })

  it('passes collected file content to runResearchEngineFromText', async () => {
    await extractFromCodebase(process.cwd(), 'my conventions', [], mockClient)
    const call = vi.mocked(runResearchEngineFromText).mock.calls[0]
    expect(call[0]).toBe('my conventions')
    // text argument (call[1]) should be a string
    expect(typeof call[1]).toBe('string')
  })

  it('does not read files outside targetDir (path traversal test)', async () => {
    // Create a spy on fs.readFileSync to verify no path traversal
    const readSpy = vi.spyOn(fs, 'readFileSync')
    await extractFromCodebase(process.cwd(), 'test', [], mockClient)

    const readPaths = readSpy.mock.calls
      .map(c => String(c[0]))
      .filter(p => p.endsWith('.ts') || p.endsWith('.md'))

    for (const p of readPaths) {
      expect(path.resolve(p).startsWith(process.cwd())).toBe(true)
    }
    readSpy.mockRestore()
  })
})
