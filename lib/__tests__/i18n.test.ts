import { describe, it, expect } from 'vitest'
import { validateTranslationStructure, getAvailableLocales, getLocaleContent, SUPPORTED_LOCALES } from '../i18n'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-test-'))
}

const CANONICAL = `---
name: test-skill
description: "Test skill"
---

## When to use

Use this skill when you need to test something.

## How to use

1. Step one
2. Step two

## Examples

Example content here.
`

const VALID_TRANSLATION = `---
name: test-skill
description: "Compétence de test"
---

## When to use

Utiliser cette compétence quand vous devez tester quelque chose.

## How to use

1. Étape un
2. Étape deux

## Examples

Contenu d'exemple ici.
`

const MISSING_SECTION_TRANSLATION = `---
name: test-skill
description: "Habilidad de prueba"
---

## When to use

Usa esta habilidad cuando necesites probar algo.

## How to use

1. Paso uno
`

describe('validateTranslationStructure', () => {
  it('returns valid: true when translation has all canonical sections', () => {
    const result = validateTranslationStructure(CANONICAL, VALID_TRANSLATION)
    expect(result.valid).toBe(true)
    expect(result.missingSections).toHaveLength(0)
  })

  it('returns valid: false when translation is missing sections', () => {
    const result = validateTranslationStructure(CANONICAL, MISSING_SECTION_TRANSLATION)
    expect(result.valid).toBe(false)
    expect(result.missingSections).toContain('examples')
  })

  it('reports extra sections in translation', () => {
    const withExtra = VALID_TRANSLATION + '\n## Extra Section\n\nExtra content.\n'
    const result = validateTranslationStructure(CANONICAL, withExtra)
    expect(result.extraSections).toContain('extra section')
  })

  it('is case-insensitive in section comparison', () => {
    const upperCanonical = CANONICAL.replace(/^## When to use/m, '## WHEN TO USE')
    const result = validateTranslationStructure(upperCanonical, VALID_TRANSLATION)
    expect(result.valid).toBe(true)
    expect(result.missingSections).toHaveLength(0)
  })

  it('returns valid: true for skill with no sections', () => {
    const noSections = '---\nname: test\ndescription: "test"\n---\nJust body text.'
    const result = validateTranslationStructure(noSections, noSections)
    expect(result.valid).toBe(true)
  })
})

describe('getAvailableLocales', () => {
  it('returns empty array when no locale files exist', () => {
    const tmpDir = makeTmpDir()
    fs.writeFileSync(path.join(tmpDir, 'SKILL.md'), CANONICAL)
    const locales = getAvailableLocales(tmpDir)
    expect(locales).toEqual([])
    fs.rmSync(tmpDir, { recursive: true })
  })

  it('detects locale files that exist', () => {
    const tmpDir = makeTmpDir()
    fs.writeFileSync(path.join(tmpDir, 'SKILL.md'), CANONICAL)
    fs.writeFileSync(path.join(tmpDir, 'SKILL.es.md'), VALID_TRANSLATION)
    fs.writeFileSync(path.join(tmpDir, 'SKILL.fr.md'), VALID_TRANSLATION)
    const locales = getAvailableLocales(tmpDir)
    expect(locales).toContain('es')
    expect(locales).toContain('fr')
    expect(locales).not.toContain('de')
    fs.rmSync(tmpDir, { recursive: true })
  })

  it('only returns supported locales', () => {
    const tmpDir = makeTmpDir()
    fs.writeFileSync(path.join(tmpDir, 'SKILL.md'), CANONICAL)
    fs.writeFileSync(path.join(tmpDir, 'SKILL.zh.md'), VALID_TRANSLATION) // unsupported
    fs.writeFileSync(path.join(tmpDir, 'SKILL.de.md'), VALID_TRANSLATION) // supported
    const locales = getAvailableLocales(tmpDir)
    expect(locales).toContain('de')
    expect(locales).not.toContain('zh')
    fs.rmSync(tmpDir, { recursive: true })
  })

  it('supports all four defined locales', () => {
    expect(SUPPORTED_LOCALES).toContain('es')
    expect(SUPPORTED_LOCALES).toContain('fr')
    expect(SUPPORTED_LOCALES).toContain('de')
    expect(SUPPORTED_LOCALES).toContain('pt-BR')
  })
})

describe('getLocaleContent', () => {
  it('falls back to SKILL.md when locale file does not exist', () => {
    const tmpDir = makeTmpDir()
    fs.writeFileSync(path.join(tmpDir, 'SKILL.md'), CANONICAL)
    const content = getLocaleContent(tmpDir, 'es')
    expect(content).toBe(CANONICAL)
    fs.rmSync(tmpDir, { recursive: true })
  })

  it('returns locale file content when it exists', () => {
    const tmpDir = makeTmpDir()
    fs.writeFileSync(path.join(tmpDir, 'SKILL.md'), CANONICAL)
    fs.writeFileSync(path.join(tmpDir, 'SKILL.es.md'), VALID_TRANSLATION)
    const content = getLocaleContent(tmpDir, 'es')
    expect(content).toBe(VALID_TRANSLATION)
    fs.rmSync(tmpDir, { recursive: true })
  })
})
