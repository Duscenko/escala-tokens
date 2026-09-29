/**
 * Crawlable reading pages. Additive to the workspace protocol.
 *
 * The editor, Figma sync and the plugin's "edit on the web" stay on
 * `/?project=<slug>&section=<id>` (`workspaceLink.ts`). These paths never
 * rewrite that URL and never publish. A link from a public page back into
 * the editor is `/?section=<id>` with an id `decodeWorkspaceSection` already
 * accepts; the configurator attaches `project` the same way it does today.
 */

import { COMPONENTS } from './componentCatalogue'
import { PUBLIC_SITE_ORIGIN } from './documentHead'
import { CHANGELOG_KEY, CHANGELOG_LEAD } from '../components/configurator/docs/changelogArticle'
import { FAQ_KEY, FAQ_LEAD } from '../components/configurator/docs/faqArticle'
import { SYSTEM_REFERENCE_LEAD, SYSTEM_REFERENCE_TITLE } from '../components/configurator/docs/foundationArticle'
import { FOUNDATION_DOCS, OVERVIEW_KEY } from '../components/configurator/docs/foundationDocs'
import { GET_STARTED_KEY, GUIDE_FIGMA_KEY, GUIDE_MCP_KEY, GUIDE_PAGE_COPY } from '../components/configurator/docs/getStarted'

export const HOME_TITLE = 'Escala Tokens — Token generator'
export const HOME_DESCRIPTION = 'Escala Tokens — Token generator. Build a minimal, custom design token system and sync it live to Figma.'

export const ABOUT_TITLE = 'Escala Tokens: Define your foundations before you prompt'
export const ABOUT_DESCRIPTION = 'Define your palette, type scale, spacing and radius once, then hand them to Figma, your code and any AI agent as one contract, before you start prompting.'

/** Same sentence the About page already uses for the catalogue. */
export const COMPONENTS_INDEX_DESCRIPTION = "Each of the {count} components mirrors a plugin entry: its key is the plugin's gate, its variant axes mirror the plugin's spec matrix, and its category mirrors the plugin's divider pages. When the plugin changes, the catalogue follows, never the reverse."

const PRODUCT = 'Escala Tokens'

export type PublicPage =
  | { kind: 'components-index' }
  | { kind: 'component'; key: string }
  | { kind: 'doc'; docKey: string }

export type HeadSource = {
  title: string
  description: string
  path: string
  /** Catalogue names stay verbatim. Everything else goes through `t()`. */
  translateTitle: boolean
  titleIsFull: boolean
  descriptionVars?: Record<string, string | number>
}

const DOC_PATH_BY_KEY: Record<string, string> = {
  [GET_STARTED_KEY]: '/docs',
  [GUIDE_FIGMA_KEY]: '/docs/figma',
  [GUIDE_MCP_KEY]: '/docs/mcp',
  [CHANGELOG_KEY]: '/docs/changelog',
  [FAQ_KEY]: '/docs/faq',
  [OVERVIEW_KEY]: '/docs/system',
}

for (const doc of FOUNDATION_DOCS) {
  DOC_PATH_BY_KEY[doc.key] = `/docs/${doc.key}`
}

const DOC_KEY_BY_PATH: Record<string, string> = Object.fromEntries(
  Object.entries(DOC_PATH_BY_KEY).map(([key, path]) => [path, key]),
)

const COMPONENT_BY_KEY = new Map(COMPONENTS.map((c) => [c.key, c]))

export function normalizePublicPath(pathname: string): string {
  const stripped = pathname.replace(/\/+$/, '')
  return stripped || '/'
}

export function matchPublicPath(pathname: string): PublicPage | null {
  const path = normalizePublicPath(pathname)
  if (DOC_KEY_BY_PATH[path]) return { kind: 'doc', docKey: DOC_KEY_BY_PATH[path] }
  if (path === '/components') return { kind: 'components-index' }
  if (path.startsWith('/components/')) {
    const key = path.slice('/components/'.length)
    if (!key || key.includes('/') || !COMPONENT_BY_KEY.has(key)) return null
    return { kind: 'component', key }
  }
  return null
}

export function publicDocPath(docKey: string): string | null {
  return DOC_PATH_BY_KEY[docKey] ?? null
}

export function publicPathForPage(page: PublicPage): string {
  if (page.kind === 'components-index') return '/components'
  if (page.kind === 'component') return `/components/${page.key}`
  return DOC_PATH_BY_KEY[page.docKey] ?? '/docs'
}

/** Workspace section id for this reading page. Already in the protocol. */
export function workspaceSectionForPage(page: PublicPage): string {
  if (page.kind === 'components-index') return 'components'
  if (page.kind === 'component') return `components/${page.key}`
  return `docs/${page.docKey}`
}

export function pageForWorkspaceSection(section: string): PublicPage | null {
  if (section === 'components') return { kind: 'components-index' }
  if (section.startsWith('components/')) {
    const key = section.slice('components/'.length)
    if (!key || key.includes('/') || !COMPONENT_BY_KEY.has(key)) return null
    return { kind: 'component', key }
  }
  if (section === 'docs') return { kind: 'doc', docKey: GET_STARTED_KEY }
  if (section.startsWith('docs/')) {
    const docKey = section.slice('docs/'.length)
    if (!docKey || docKey.includes('/') || !DOC_PATH_BY_KEY[docKey]) return null
    return { kind: 'doc', docKey }
  }
  return null
}

/**
 * Door back into the editor. Omits `project` so `syncWorkspaceSearch` writes
 * the current system onto `/` after load. Does not build an API URL.
 */
export function workspaceSectionHref(section: string): string {
  const encoded = section.split('/').map((part) => encodeURIComponent(part)).join('/')
  return `/?section=${encoded}`
}

function firstSentence(text: string): string {
  const cut = text.indexOf('. ')
  return cut === -1 ? text : text.slice(0, cut + 1)
}

export function headSourceForPage(page: PublicPage): HeadSource {
  const path = publicPathForPage(page)
  if (page.kind === 'components-index') {
    return {
      title: 'Components',
      description: COMPONENTS_INDEX_DESCRIPTION,
      path,
      translateTitle: true,
      titleIsFull: false,
      descriptionVars: { count: COMPONENTS.length },
    }
  }
  if (page.kind === 'component') {
    const def = COMPONENT_BY_KEY.get(page.key)
    return {
      title: def?.label ?? page.key,
      description: def?.description ?? HOME_DESCRIPTION,
      path,
      translateTitle: false,
      titleIsFull: false,
    }
  }
  const guide = GUIDE_PAGE_COPY[page.docKey]
  if (guide) {
    return { title: guide.title, description: guide.lead, path, translateTitle: true, titleIsFull: false }
  }
  if (page.docKey === CHANGELOG_KEY) {
    return { title: 'Changelog', description: CHANGELOG_LEAD, path, translateTitle: true, titleIsFull: false }
  }
  if (page.docKey === FAQ_KEY) {
    return { title: 'FAQ', description: FAQ_LEAD, path, translateTitle: true, titleIsFull: false }
  }
  if (page.docKey === OVERVIEW_KEY) {
    return {
      title: SYSTEM_REFERENCE_TITLE,
      description: firstSentence(SYSTEM_REFERENCE_LEAD),
      path,
      translateTitle: true,
      titleIsFull: false,
    }
  }
  const foundation = FOUNDATION_DOCS.find((doc) => doc.key === page.docKey)
  return {
    title: foundation?.label ?? 'Docs',
    description: foundation ? firstSentence(foundation.lead) : HOME_DESCRIPTION,
    path,
    translateTitle: true,
    titleIsFull: false,
  }
}

export type WorkspaceHead = HeadSource & {
  robots: 'index, follow' | 'noindex, nofollow'
}

/** Head for the configurator on `/`. Does not describe a new URL shape. */
export function workspaceDocumentHead(section: string): WorkspaceHead {
  const mapped = pageForWorkspaceSection(section)
  if (mapped) {
    return { ...headSourceForPage(mapped), robots: 'noindex, nofollow' }
  }
  const editing = section === 'sync'
    || section.startsWith('themes')
    || section.startsWith('variables')
    || section.startsWith('code')
    || section.startsWith('components/')
    || section.startsWith('docs/')
  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: '/',
    translateTitle: false,
    titleIsFull: true,
    robots: editing ? 'noindex, nofollow' : 'index, follow',
  }
}

export function composeTitle(source: Pick<HeadSource, 'title' | 'titleIsFull'>): string {
  return source.titleIsFull ? source.title : `${source.title} — ${PRODUCT}`
}

/** Paths a crawler should fetch. No `project`, no `section`, no `/api/`. */
export function sitemapPaths(): string[] {
  const paths = ['/', '/about', '/components']
  for (const component of COMPONENTS) paths.push(`/components/${component.key}`)
  paths.push('/docs', '/docs/figma', '/docs/mcp', '/docs/changelog', '/docs/faq', '/docs/system')
  for (const doc of FOUNDATION_DOCS) paths.push(`/docs/${doc.key}`)
  return paths
}

export function sitemapXml(): string {
  const urls = sitemapPaths().map((path) => `  <url><loc>${PUBLIC_SITE_ORIGIN}${path === '/' ? '/' : path}</loc></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}
