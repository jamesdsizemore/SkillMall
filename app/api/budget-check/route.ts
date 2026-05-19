import { NextRequest, NextResponse } from 'next/server'
import { analyzeSkill, analyzeSkillForAgent, SUPPORTED_AGENTS } from '@/lib/budget-analyzer'
import { getAllSkills } from '@/lib/skills'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const slug = searchParams.get('slug')
  const agent = searchParams.get('agent')
  const charsAvailable = parseInt(searchParams.get('charsAvailable') ?? '200', 10)

  if (!category || !slug) {
    return NextResponse.json({ error: 'category and slug are required' }, { status: 400 })
  }

  const skills = getAllSkills()
  const skill = skills.find(s => s.category === category && s.slug === slug)

  if (!skill) {
    return NextResponse.json({ error: `Skill not found: ${category}/${slug}` }, { status: 404 })
  }

  // Agent-mode: return multi-level analysis at 10/20/30/50 installed skills
  if (agent) {
    if (!SUPPORTED_AGENTS.includes(agent)) {
      return NextResponse.json(
        { error: `Unknown agent: ${agent}. Supported: ${SUPPORTED_AGENTS.join(', ')}` },
        { status: 400 }
      )
    }
    const result = analyzeSkillForAgent(`${category}/${slug}`, skill.description, agent)
    return NextResponse.json(result)
  }

  // Legacy mode: single chars-available analysis
  if (isNaN(charsAvailable) || charsAvailable < 10 || charsAvailable > 10000) {
    return NextResponse.json(
      { error: 'charsAvailable must be a number between 10 and 10000' },
      { status: 400 }
    )
  }

  const result = analyzeSkill(`${category}/${slug}`, skill.description, charsAvailable)
  return NextResponse.json(result)
}
