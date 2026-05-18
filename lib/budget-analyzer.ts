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

function extractTriggerPhrase(description: string): string | null {
  const match = description.match(/^[A-Z][a-z]+ [\w\s-]{2,30}/)
  return match ? match[0].trim() : null
}
