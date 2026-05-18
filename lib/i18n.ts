import fs from 'node:fs'
import path from 'node:path'

export const SUPPORTED_LOCALES = ['es', 'fr', 'de', 'pt-BR'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  'pt-BR': 'Português (BR)',
}

export function getAvailableLocales(skillDir: string): Locale[] {
  return SUPPORTED_LOCALES.filter(locale =>
    fs.existsSync(path.join(skillDir, `SKILL.${locale}.md`))
  )
}

export function getLocaleContent(skillDir: string, locale: string): string {
  if (locale && locale !== 'en') {
    const localePath = path.join(skillDir, `SKILL.${locale}.md`)
    if (fs.existsSync(localePath)) {
      return fs.readFileSync(localePath, 'utf-8')
    }
  }
  return fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8')
}

// Extract ##-level section headings from SKILL.md body
function extractSections(content: string): string[] {
  return content
    .split('\n')
    .filter(line => /^##\s/.test(line))
    .map(line => line.replace(/^##\s+/, '').trim().toLowerCase())
}

export interface TranslationValidationResult {
  valid: boolean
  missingSections: string[]
  extraSections: string[]
}

export function validateTranslationStructure(
  canonicalContent: string,
  translationContent: string
): TranslationValidationResult {
  const canonicalSections = extractSections(canonicalContent)
  const translationSections = extractSections(translationContent)

  const missingSections = canonicalSections.filter(
    s => !translationSections.includes(s)
  )
  const extraSections = translationSections.filter(
    s => !canonicalSections.includes(s)
  )

  return {
    valid: missingSections.length === 0,
    missingSections,
    extraSections,
  }
}
