import fs from 'node:fs'
import path from 'node:path'
import type { LLMClient } from './providers'

export interface TestCase {
  id: string
  description: string
  input: string
  required: string[]
  forbidden: string[]
}

export interface TestResult {
  id: string
  description: string
  passed: boolean
  requiredResults: Array<{ assertion: string; passed: boolean }>
  forbiddenResults: Array<{ assertion: string; triggered: boolean }>
}

export interface TestSuiteResult {
  skillSlug: string
  testCount: number
  passCount: number
  failCount: number
  passRate: number
  results: TestResult[]
}

const MAX_INPUT_LENGTH = 2000

// Sanitize test input to prevent prompt injection attacks.
// The input field in test cases is user-controlled and could contain
// attempts to override the skill's system prompt.
export function sanitizeInput(input: string): string {
  return input
    .replace(/ignore\s+(previous|all|prior|above|any)\s+instructions?/gi, '[input]')
    .replace(/\bsystem\s*:/gi, '[system-blocked]:')
    .replace(/<\s*system\s*>/gi, '[system-blocked]')
    .replace(/\byou are now\b/gi, '[input]')
    .replace(/\bact as\b/gi, '[input]')
    .slice(0, MAX_INPUT_LENGTH)
}

export function loadTestCases(testsDir: string, slug: string): TestCase[] {
  // slug may be "ai/skill-creator" or "skill-creator" — use only the final segment
  const name = slug.includes('/') ? slug.split('/').pop()! : slug
  const dir = path.join(testsDir, name)

  if (!fs.existsSync(dir)) return []

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  const cases: TestCase[] = []

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
    const parsed = JSON.parse(raw) as TestCase
    if (parsed.id && parsed.description && typeof parsed.input === 'string') {
      cases.push(parsed)
    }
  }

  return cases
}

async function callSkill(
  skillContent: string,
  input: string,
  client: LLMClient
): Promise<string> {
  return client.complete(sanitizeInput(input), {
    systemPrompt: skillContent,
    temperature: 0.3,
    maxTokens: 2048,
  })
}

async function evaluateAssertions(
  response: string,
  required: string[],
  forbidden: string[],
  client: LLMClient
): Promise<{
  requiredResults: Array<{ assertion: string; passed: boolean }>
  forbiddenResults: Array<{ assertion: string; triggered: boolean }>
}> {
  if (required.length === 0 && forbidden.length === 0) {
    return { requiredResults: [], forbiddenResults: [] }
  }

  const prompt = `You are evaluating whether an AI response satisfies assertions. Answer only with a JSON object.

Response to evaluate:
<response>
${response.slice(0, 3000)}
</response>

For each assertion below, evaluate whether it is satisfied.

Required assertions (must be present or demonstrated in the response):
${required.map((a, i) => `${i + 1}. ${a}`).join('\n') || '(none)'}

Forbidden assertions (must NOT be present or triggered in the response):
${forbidden.map((a, i) => `${i + 1}. ${a}`).join('\n') || '(none)'}

Return ONLY this JSON (no markdown, no explanation):
{
  "required": [${required.map(() => '{"passed": true}').join(', ')}],
  "forbidden": [${forbidden.map(() => '{"triggered": false}').join(', ')}]
}`

  let raw: string
  try {
    raw = await client.complete(prompt, {
      responseFormat: 'json_object',
      temperature: 0,
      maxTokens: 512,
      systemPrompt: 'You are a precise test evaluator. Return only valid JSON.',
    })
    const parsed = JSON.parse(raw) as {
      required: Array<{ passed: boolean }>
      forbidden: Array<{ triggered: boolean }>
    }

    return {
      requiredResults: required.map((assertion, i) => ({
        assertion,
        passed: Boolean(parsed.required?.[i]?.passed ?? false),
      })),
      forbiddenResults: forbidden.map((assertion, i) => ({
        assertion,
        triggered: Boolean(parsed.forbidden?.[i]?.triggered ?? false),
      })),
    }
  } catch {
    // If evaluation fails, fail-safe: mark all required as failed, forbidden as not triggered
    return {
      requiredResults: required.map(assertion => ({ assertion, passed: false })),
      forbiddenResults: forbidden.map(assertion => ({ assertion, triggered: false })),
    }
  }
}

export async function runTestCase(
  testCase: TestCase,
  skillContent: string,
  client: LLMClient
): Promise<TestResult> {
  const response = await callSkill(skillContent, testCase.input, client)
  const { requiredResults, forbiddenResults } = await evaluateAssertions(
    response,
    testCase.required,
    testCase.forbidden,
    client
  )

  const allRequiredPassed = requiredResults.every(r => r.passed)
  const noForbiddenTriggered = forbiddenResults.every(r => !r.triggered)
  const passed = allRequiredPassed && noForbiddenTriggered

  return {
    id: testCase.id,
    description: testCase.description,
    passed,
    requiredResults,
    forbiddenResults,
  }
}

export async function runTestSuite(
  slug: string,
  skillContent: string,
  testCases: TestCase[],
  client: LLMClient
): Promise<TestSuiteResult> {
  const results: TestResult[] = []

  for (const tc of testCases) {
    const result = await runTestCase(tc, skillContent, client)
    results.push(result)
  }

  const passCount = results.filter(r => r.passed).length
  const failCount = results.length - passCount

  return {
    skillSlug: slug,
    testCount: results.length,
    passCount,
    failCount,
    passRate: results.length === 0 ? 0 : Math.round((passCount / results.length) * 100),
    results,
  }
}
