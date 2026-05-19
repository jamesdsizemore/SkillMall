import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

export const runtime = 'nodejs'

export interface StarterInfo {
  slug: string
  domain: string
  category: string
  targetAgents: string[]
  fillInCount: number
  description: string
}

export async function GET() {
  const startersDir = path.join(process.cwd(), 'skills', '_starters')
  if (!fs.existsSync(startersDir)) {
    return NextResponse.json({ starters: [] })
  }

  const starters: StarterInfo[] = []

  for (const slug of fs.readdirSync(startersDir).sort()) {
    const starterPath = path.join(startersDir, slug)
    if (!fs.statSync(starterPath).isDirectory()) continue

    const configPath = path.join(starterPath, 'starter-config.json')
    const skillMdPath = path.join(starterPath, 'SKILL.md')

    if (!fs.existsSync(configPath) || !fs.existsSync(skillMdPath)) continue

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      const { data } = matter(fs.readFileSync(skillMdPath, 'utf-8'))
      starters.push({
        slug,
        domain: config.domain ?? slug,
        category: config.category ?? 'development',
        targetAgents: config.targetAgents ?? [],
        fillInCount: (config.fillInFields ?? []).length,
        description: String(data.description ?? ''),
      })
    } catch {
      // skip malformed starters
    }
  }

  return NextResponse.json({ starters })
}
