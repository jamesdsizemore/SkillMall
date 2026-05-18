import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const DOCS_ROOT = path.join(process.cwd(), 'docs')

export interface DocPage {
  slug: string[]        // e.g. ['developer', 'getting-started']
  title: string
  description: string
  content: string
  section: string       // 'developer' | 'guide' | 'marketing'
  filePath: string
}

export interface NavSection {
  title: string
  slug: string
  items: NavItem[]
}

export interface NavItem {
  title: string
  href: string
  slug: string[]
}

export interface TocEntry {
  level: number
  text: string
  id: string
}

// Navigation structure for all Phase 4 docs
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Developer Guide',
    slug: 'developer',
    items: [
      { title: 'Getting Started', href: '/docs/developer/getting-started', slug: ['developer', 'getting-started'] },
      { title: 'Architecture', href: '/docs/developer/architecture', slug: ['developer', 'architecture'] },
      { title: 'API Reference', href: '/docs/developer/api-reference', slug: ['developer', 'api-reference'] },
      { title: 'CLI Reference', href: '/docs/developer/cli-reference', slug: ['developer', 'cli-reference'] },
      { title: 'Contributing', href: '/docs/developer/contributing', slug: ['developer', 'contributing'] },
      { title: 'Extending SkillMall', href: '/docs/developer/extending', slug: ['developer', 'extending'] },
      { title: 'Deployment', href: '/docs/developer/deployment', slug: ['developer', 'deployment'] },
      { title: 'FAQ', href: '/docs/developer/faq', slug: ['developer', 'faq'] },
      { title: 'Security', href: '/docs/developer/security', slug: ['developer', 'security'] },
    ],
  },
  {
    title: 'User Guide',
    slug: 'guide',
    items: [
      { title: 'Introduction', href: '/docs/guide/introduction', slug: ['guide', 'introduction'] },
      { title: 'Quick Start', href: '/docs/guide/quick-start', slug: ['guide', 'quick-start'] },
      { title: 'Understanding Quality', href: '/docs/guide/understanding-quality', slug: ['guide', 'understanding-quality'] },
      { title: 'Using Collections', href: '/docs/guide/using-collections', slug: ['guide', 'using-collections'] },
      { title: 'Prompt Optimization', href: '/docs/guide/prompt-optimization', slug: ['guide', 'prompt-optimization'] },
      { title: 'Troubleshooting', href: '/docs/guide/troubleshooting', slug: ['guide', 'troubleshooting'] },
      { title: 'Glossary', href: '/docs/guide/glossary', slug: ['guide', 'glossary'] },
      // Tutorials
      { title: 'Tutorial: Wizard', href: '/docs/guide/tutorials/wizard-tutorial', slug: ['guide', 'tutorials', 'wizard-tutorial'] },
      { title: 'Tutorial: CLI', href: '/docs/guide/tutorials/cli-tutorial', slug: ['guide', 'tutorials', 'cli-tutorial'] },
      { title: 'Tutorial: Customizing', href: '/docs/guide/tutorials/customizing-skills', slug: ['guide', 'tutorials', 'customizing-skills'] },
    ],
  },
  {
    title: 'Marketing',
    slug: 'marketing',
    items: [
      { title: 'Landing Page Copy', href: '/docs/marketing/landing-page-copy', slug: ['marketing', 'landing-page-copy'] },
      { title: 'Value Proposition', href: '/docs/marketing/value-proposition', slug: ['marketing', 'value-proposition'] },
      { title: 'Use Cases', href: '/docs/marketing/use-cases', slug: ['marketing', 'use-cases'] },
      { title: 'Comparison Guide', href: '/docs/marketing/comparison', slug: ['marketing', 'comparison'] },
      { title: 'Press Kit', href: '/docs/marketing/press-kit', slug: ['marketing', 'press-kit'] },
    ],
  },
]

export function getDocPage(slugParts: string[]): DocPage | null {
  const filePath = path.join(DOCS_ROOT, ...slugParts) + '.md'
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { content } = matter(raw)

  // Extract first H1 as title
  const h1Match = content.match(/^#\s+(.+)$/m)
  const title = h1Match ? h1Match[1] : slugParts[slugParts.length - 1]

  // Extract first paragraph as description
  const descMatch = content.replace(/^#.*\n/m, '').match(/^([A-Za-z].+?)\.?\n/m)
  const description = descMatch ? descMatch[1].slice(0, 150) : ''

  return {
    slug: slugParts,
    title,
    description,
    content,
    section: slugParts[0],
    filePath,
  }
}

export function getAllDocPages(): DocPage[] {
  const pages: DocPage[] = []
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const page = getDocPage(item.slug)
      if (page) pages.push(page)
    }
  }
  return pages
}

export function extractToc(content: string): TocEntry[] {
  const lines = content.split('\n')
  const toc: TocEntry[] = []
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (match && match[1].length <= 3) {
      const text = match[2].replace(/[*_`]/g, '')
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      toc.push({ level: match[1].length, text, id })
    }
  }
  return toc
}

export function generateStaticDocParams(): Array<{ slug: string[] }> {
  return NAV_SECTIONS.flatMap(section =>
    section.items.map(item => ({ slug: item.slug }))
  )
}
