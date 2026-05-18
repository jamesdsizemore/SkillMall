import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { Skill } from '../skills'

export interface NpmPackageJson {
  name: string
  version: string
  description: string
  keywords: string[]
  license: string
  author: string
  main: string
  files: string[]
  skillMall: {
    category: string
    slug: string
    sourceUrl: string
  }
}

export function buildNpmPackageJson(skill: Skill): NpmPackageJson {
  return {
    name: `@skill-mall/${skill.slug}`,
    version: skill.version || '1.0.0',
    description: skill.description,
    keywords: [...skill.tags, 'skill-mall', 'agent-skill', skill.category],
    license: skill.license || 'MIT',
    author: skill.author || '',
    main: 'SKILL.md',
    files: ['SKILL.md', 'README.md', 'resources/'],
    skillMall: {
      category: skill.category,
      slug: skill.slug,
      sourceUrl: `https://skill-mall.dev/skills/${skill.category}/${skill.slug}`,
    },
  }
}

export interface NpmVersionCheckResult {
  exists: boolean
  publishedVersion: string | null
  versionMismatch: boolean
}

export function checkNpmVersion(packageName: string, localVersion: string): NpmVersionCheckResult {
  try {
    const result = execSync(`npm view ${packageName} version 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 10_000,
    }).trim()

    const publishedVersion = result || null
    if (!publishedVersion) {
      return { exists: false, publishedVersion: null, versionMismatch: false }
    }

    return {
      exists: true,
      publishedVersion,
      versionMismatch: publishedVersion !== localVersion,
    }
  } catch {
    return { exists: false, publishedVersion: null, versionMismatch: false }
  }
}

export interface NpmPublishOptions {
  dryRun: boolean
  skillDir: string
}

export interface NpmPublishResult {
  dryRun: boolean
  packageName: string
  version: string
  packageJson: NpmPackageJson
}

export function publishToNpm(
  skill: Skill,
  options: NpmPublishOptions
): NpmPublishResult {
  const pkg = buildNpmPackageJson(skill)
  const packageJsonPath = path.join(options.skillDir, 'package.json')

  // Write temporary package.json for publish
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')

  try {
    if (options.dryRun) {
      return { dryRun: true, packageName: pkg.name, version: pkg.version, packageJson: pkg }
    }

    const result = spawnSync(
      'npm',
      ['publish', '--access', 'public'],
      {
        cwd: options.skillDir,
        stdio: 'inherit',
        encoding: 'utf-8',
      }
    )

    if (result.status !== 0) {
      throw new Error(`npm publish exited with code ${result.status}`)
    }

    return { dryRun: false, packageName: pkg.name, version: pkg.version, packageJson: pkg }
  } finally {
    // Remove temporary package.json from skill directory
    if (fs.existsSync(packageJsonPath)) {
      fs.unlinkSync(packageJsonPath)
    }
  }
}
