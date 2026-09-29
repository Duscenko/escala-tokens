import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMPONENTS } from '../componentCatalogue'
import { FOUNDATION_DOCS, OVERVIEW_KEY } from '../../components/configurator/docs/foundationDocs'
import { CHANGELOG_KEY } from '../../components/configurator/docs/changelogArticle'
import { FAQ_KEY } from '../../components/configurator/docs/faqArticle'
import { GET_STARTED_KEY, GUIDE_FIGMA_KEY, GUIDE_MCP_KEY } from '../../components/configurator/docs/getStarted'
import {
  matchPublicPath,
  pageForWorkspaceSection,
  publicDocPath,
  sitemapPaths,
  sitemapXml,
  workspaceDocumentHead,
  workspaceSectionForPage,
  workspaceSectionHref,
} from '../publicSeo'
import { buildWorkspaceAppUrl, decodeWorkspaceSection } from '../workspaceLink'

describe('public reading pages', () => {
  it('keeps the workspace section ids the plugin already sends', () => {
    const cases = [
      { page: { kind: 'component' as const, key: 'Button' }, section: 'components/Button' },
      { page: { kind: 'doc' as const, docKey: GUIDE_MCP_KEY }, section: `docs/${GUIDE_MCP_KEY}` },
      { page: { kind: 'doc' as const, docKey: GUIDE_FIGMA_KEY }, section: `docs/${GUIDE_FIGMA_KEY}` },
      { page: { kind: 'doc' as const, docKey: 'color' }, section: 'docs/color' },
    ]
    for (const { page, section } of cases) {
      expect(workspaceSectionForPage(page)).toBe(section)
      expect(decodeWorkspaceSection(section)?.tab).toBe(page.kind === 'component' ? 'components' : 'docs')
      const href = workspaceSectionHref(section)
      expect(href).toBe(`/?section=${section}`)
      expect(href).not.toContain('/api/')
      expect(href).not.toContain('project=')
    }
  })

  it('does not publish a public path for the theme workspace', () => {
    for (const section of ['themes', 'themes/dark', 'themes/dark/figma', 'variables/hola', 'code', 'sync', 'about']) {
      expect(pageForWorkspaceSection(section)).toBeNull()
      expect(matchPublicPath(`/${section}`)).toBeNull()
    }
    expect(workspaceDocumentHead('themes/dark').robots).toBe('noindex, nofollow')
    expect(workspaceDocumentHead('sync').robots).toBe('noindex, nofollow')
    expect(workspaceDocumentHead('about').robots).toBe('index, follow')
    expect(workspaceDocumentHead('about').path).toBe('/')
  })

  it('maps catalogue and docs keys onto crawlable paths without replacing the query protocol', () => {
    expect(matchPublicPath('/components/Button')).toEqual({ kind: 'component', key: 'Button' })
    expect(matchPublicPath('/docs/mcp')).toEqual({ kind: 'doc', docKey: GUIDE_MCP_KEY })
    expect(matchPublicPath('/docs/figma')).toEqual({ kind: 'doc', docKey: GUIDE_FIGMA_KEY })
    expect(publicDocPath(GET_STARTED_KEY)).toBe('/docs')
    expect(publicDocPath(CHANGELOG_KEY)).toBe('/docs/changelog')
    expect(publicDocPath(FAQ_KEY)).toBe('/docs/faq')
    expect(publicDocPath(OVERVIEW_KEY)).toBe('/docs/system')
    for (const component of COMPONENTS) {
      expect(matchPublicPath(`/components/${component.key}`)?.kind).toBe('component')
    }
    for (const doc of FOUNDATION_DOCS) {
      expect(publicDocPath(doc.key)).toBe(`/docs/${doc.key}`)
    }
    expect(matchPublicPath('/components/Button/extra')).toBeNull()
    const appUrl = buildWorkspaceAppUrl({
      origin: 'https://www.escalatokens.com',
      project: 'esc_7K2M-9QX4-N3PD',
      section: 'themes/core/figma',
    })
    expect(appUrl).toBe('https://www.escalatokens.com/?project=esc_7K2M-9QX4-N3PD&section=themes/core/figma')
  })

  it('ships a sitemap of public paths only', () => {
    const xml = sitemapXml()
    const file = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8')
    expect(file).toBe(xml)
    expect(xml).not.toContain('project=')
    expect(xml).not.toContain('section=')
    expect(xml).not.toContain('/api/')
    expect(xml).not.toContain('vercel.app')
    expect(sitemapPaths()).toContain('/docs/mcp')
    expect(sitemapPaths()).toContain('/docs/figma')
    expect(sitemapPaths()).toContain('/')
  })
})
