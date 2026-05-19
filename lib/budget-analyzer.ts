export interface BudgetCheckResult {
  slug: string
  charsAvailable: number
  descriptionLength: number
  visible: boolean
  triggerPhrase: string | null
  triggerPreserved: boolean
  visibleText: string
  truncatedText: string
  rewriteSuggestions: string[]
}

export interface BudgetLevelResult {
  installedCount: number
  charsAvailable: number
  visible: boolean
  triggerPreserved: boolean
  visibleText: string
  truncatedText: string
}

export interface AgentBudgetAnalysis {
  slug: string
  agent: string
  descriptionLength: number
  triggerPhrase: string | null
  levels: BudgetLevelResult[]    // at 10, 20, 30, 50 installed skills
  rewriteSuggestions: string[]
}

// Approximate total character budget each agent allocates to the full skill listing.
// Derived from known context window sizes and observed skill listing formats.
const AGENT_TOTAL_CHARS: Record<string, number> = {
  'claude-code': 8_000,
  'cursor':      4_000,
  'gemini-cli':  6_000,
  'copilot':     3_000,
  'codex':       4_000,
  'other':       4_000,
}

const SKILL_COUNT_LEVELS = [10, 20, 30, 50] as const

function charsPerSkill(agent: string, count: number): number {
  const total = AGENT_TOTAL_CHARS[agent] ?? AGENT_TOTAL_CHARS['other']
  return Math.floor(total / count)
}

export function analyzeDescription(
  description: string,
  charsAvailable: number,
  triggerPhrase?: string
): BudgetCheckResult {
  const visible = description.length <= charsAvailable
  const visibleText = description.slice(0, charsAvailable)
  const truncatedText = description.slice(charsAvailable)
  const trigger = triggerPhrase ?? extractTriggerPhrase(description)
  const triggerPreserved = trigger
    ? visibleText.toLowerCase().includes(trigger.toLowerCase())
    : true

  const suggestions: string[] = []
  if (!visible) {
    suggestions.push(`Shorten by ${description.length - charsAvailable} characters`)
    if (!triggerPreserved && trigger) {
      suggestions.push(
        `Move "${trigger}" to the first ${Math.floor(charsAvailable * 0.3)} characters`
      )
    }
  }

  return {
    slug: '',
    charsAvailable,
    descriptionLength: description.length,
    visible,
    triggerPhrase: trigger,
    triggerPreserved,
    visibleText,
    truncatedText,
    rewriteSuggestions: suggestions,
  }
}

export function analyzeSkill(
  slug: string,
  description: string,
  charsAvailable: number
): BudgetCheckResult {
  const result = analyzeDescription(description, charsAvailable)
  return { ...result, slug }
}

export function analyzeSkillForAgent(
  slug: string,
  description: string,
  agent: string
): AgentBudgetAnalysis {
  const trigger = extractTriggerPhrase(description)

  const levels: BudgetLevelResult[] = SKILL_COUNT_LEVELS.map((count) => {
    const chars = charsPerSkill(agent, count)
    const visibleText = description.slice(0, chars)
    const truncatedText = description.slice(chars)
    const triggerPreserved = trigger
      ? visibleText.toLowerCase().includes(trigger.toLowerCase())
      : true
    return {
      installedCount: count,
      charsAvailable: chars,
      visible: description.length <= chars,
      triggerPreserved,
      visibleText,
      truncatedText,
    }
  })

  const suggestions: string[] = []
  const worstCase = levels[levels.length - 1]
  if (!worstCase.visible) {
    suggestions.push(
      `At ${worstCase.installedCount} installed skills, description is truncated at ${worstCase.charsAvailable} chars (currently ${description.length})`
    )
  }
  if (!worstCase.triggerPreserved && trigger) {
    suggestions.push(
      `Trigger phrase "${trigger}" is lost at ${worstCase.installedCount} skills — move it to the first ${Math.floor(worstCase.charsAvailable * 0.3)} characters`
    )
  }

  return { slug, agent, descriptionLength: description.length, triggerPhrase: trigger, levels, rewriteSuggestions: suggestions }
}

function extractTriggerPhrase(description: string): string | null {
  const match = description.match(/^[A-Z][a-z]+ [\w\s-]{2,30}/)
  return match ? match[0].trim() : null
}

export const SUPPORTED_AGENTS = Object.keys(AGENT_TOTAL_CHARS)
