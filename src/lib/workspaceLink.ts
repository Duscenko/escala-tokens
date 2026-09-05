/**
 * Workspace deep-link protocol — app URL only, never `/api/tokens`.
 *
 *   https://www.escalatokens.com/?project=<slug>&section=<id>
 *
 * `project` is the system id — the same slug as `/api/tokens?project=`.
 * Do not invent a second project id. GET `/api/tokens` stays frozen.
 *
 * `section` is which surface inside that system this window is on.
 * Each window's address bar carries its own section (replaceState).
 * It is UI chrome, not DesignSnapshot — same class as `sd-theme`.
 *
 * Section id (slash-separated, no leading slash):
 *
 *   about
 *   themes                              Theme preview · artefacts
 *   themes/<theme>                      Theme preview for that theme
 *   themes/<theme>/<surface>            surface = artefacts|components|documentation|figma|github
 *   sync                                alias → Theme preview · Figma sync card
 *   variables                           Variables · Color · primitives
 *   variables/<theme>
 *   variables/<foundation>              foundation is a known Variables key
 *   variables/<theme>/<foundation>
 *   variables/<theme>/<foundation>/<collection>
 *   code
 *   code/<theme>
 *   components
 *   components/<componentKey>
 *   docs
 *   docs/<docKey>
 *
 * The plugin's "Edit on the web" opens this app URL. It GETs tokens from
 * `/api/tokens?project=<slug>` and reads additive `editor.section` so it
 * can send the designer back to the page that last published.
 */

export const WORKSPACE_PROJECT_PARAM = 'project'
export const WORKSPACE_SECTION_PARAM = 'section'

export const FOUNDATION_SECTION_KEYS = [
  'color',
  'typography',
  'radius',
  'spacing',
  'grid',
  'sizes',
  'stroke',
  'shadow',
  'icons',
] as const

export const COLLECTION_SECTION_KEYS = ['primitives', 'semantics', 'gradients'] as const

export const HUB_SURFACE_KEYS = [
  'artefacts',
  'components',
  'documentation',
  'figma',
  'github',
] as const

export type FoundationSectionKey = (typeof FOUNDATION_SECTION_KEYS)[number]
export type CollectionSectionKey = (typeof COLLECTION_SECTION_KEYS)[number]
export type HubSurfaceKey = (typeof HUB_SURFACE_KEYS)[number]
export type WorkspaceTabKey = 'preview' | 'primitives' | 'code'
export type AppTabKey = 'about' | 'foundations' | 'components' | 'docs'

export type WorkspacePlace = {
  tab: AppTabKey
  workspace: WorkspaceTabKey
  surface: HubSurfaceKey
  theme?: string
  foundation?: FoundationSectionKey
  collection?: CollectionSectionKey
  component?: string
  doc?: string
}

export type WorkspaceLink = {
  project: string | null
  section: string | null
  place: WorkspacePlace | null
}

const FOUNDATION_SET = new Set<string>(FOUNDATION_SECTION_KEYS)
const COLLECTION_SET = new Set<string>(COLLECTION_SECTION_KEYS)
const SURFACE_SET = new Set<string>(HUB_SURFACE_KEYS)

/** Segment alphabet: theme slugs, catalogue keys (`Button`), doc keys (`__guide-mcp`). */
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/

function isSegment(value: string | undefined): value is string {
  return Boolean(value && SEGMENT_RE.test(value))
}

function isFoundation(value: string | undefined): value is FoundationSectionKey {
  return Boolean(value && FOUNDATION_SET.has(value))
}

function isCollection(value: string | undefined): value is CollectionSectionKey {
  return Boolean(value && COLLECTION_SET.has(value))
}

function isSurface(value: string | undefined): value is HubSurfaceKey {
  return Boolean(value && SURFACE_SET.has(value))
}

export function encodeWorkspaceSection(place: {
  tab: AppTabKey
  workspace: WorkspaceTabKey
  surface: HubSurfaceKey
  theme?: string
  foundation?: string
  collection?: string
  component?: string
  doc?: string
}): string {
  const theme = isSegment(place.theme) ? place.theme : undefined
  const foundation = isFoundation(place.foundation) ? place.foundation : undefined
  const collection = isCollection(place.collection) ? place.collection : undefined

  if (place.tab === 'about') return 'about'
  if (place.tab === 'components') {
    return isSegment(place.component) ? `components/${place.component}` : 'components'
  }
  if (place.tab === 'docs') {
    return isSegment(place.doc) ? `docs/${place.doc}` : 'docs'
  }

  if (place.workspace === 'code') {
    return theme ? `code/${theme}` : 'code'
  }
  if (place.workspace === 'primitives') {
    const parts = ['variables']
    if (theme) parts.push(theme)
    const needFoundation = Boolean(
      foundation && (foundation !== 'color' || (collection && collection !== 'primitives')),
    )
    if (needFoundation && foundation) parts.push(foundation)
    if (collection && collection !== 'primitives') parts.push(collection)
    return parts.join('/')
  }

  if (place.surface === 'figma' && !theme) return 'sync'
  if (place.surface !== 'artefacts' && theme) return `themes/${theme}/${place.surface}`
  if (place.surface !== 'artefacts') return `themes/${place.surface}`
  return theme ? `themes/${theme}` : 'themes'
}

export function decodeWorkspaceSection(section: string | null | undefined): WorkspacePlace | null {
  if (!section) return null
  const parts = section.split('/').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0 || parts.some((part) => !SEGMENT_RE.test(part))) return null

  const root = parts[0]
  const rest = parts.slice(1)

  if (root === 'about') return { tab: 'about', workspace: 'preview', surface: 'artefacts' }
  if (root === 'sync') return { tab: 'foundations', workspace: 'preview', surface: 'figma' }
  if (root === 'components') {
    return {
      tab: 'components',
      workspace: 'preview',
      surface: 'artefacts',
      component: isSegment(rest[0]) ? rest[0] : undefined,
    }
  }
  if (root === 'docs') {
    return {
      tab: 'docs',
      workspace: 'preview',
      surface: 'artefacts',
      doc: isSegment(rest[0]) ? rest[0] : undefined,
    }
  }
  if (root === 'code') {
    return {
      tab: 'foundations',
      workspace: 'code',
      surface: 'artefacts',
      theme: isSegment(rest[0]) ? rest[0] : undefined,
    }
  }
  if (root === 'variables') {
    let theme: string | undefined
    let foundation: FoundationSectionKey | undefined
    let collection: CollectionSectionKey | undefined
    const [a, b, c] = rest
    if (isFoundation(a)) {
      foundation = a
      if (isCollection(b)) collection = b
    } else if (isSegment(a)) {
      theme = a
      if (isFoundation(b)) {
        foundation = b
        if (isCollection(c)) collection = c
      } else if (isCollection(b)) {
        collection = b
      }
    }
    return {
      tab: 'foundations',
      workspace: 'primitives',
      surface: 'artefacts',
      theme,
      foundation: foundation ?? 'color',
      collection: collection ?? 'primitives',
    }
  }
  if (root === 'themes') {
    const [a, b] = rest
    if (isSurface(a) && !b) {
      return { tab: 'foundations', workspace: 'preview', surface: a }
    }
    const theme = isSegment(a) ? a : undefined
    const surface = isSurface(b) ? b : 'artefacts'
    return { tab: 'foundations', workspace: 'preview', surface, theme }
  }
  return null
}

export function parseWorkspaceSearch(search: string): WorkspaceLink {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const project = params.get(WORKSPACE_PROJECT_PARAM)
  const section = params.get(WORKSPACE_SECTION_PARAM)
  return {
    project: project && project.trim() ? project.trim() : null,
    section: section && section.trim() ? section.trim() : null,
    place: decodeWorkspaceSection(section),
  }
}

function encodeSectionForQuery(section: string): string {
  return section.split('/').map((part) => encodeURIComponent(part)).join('/')
}

/** Readable app URL. Slashes in `section` stay slashes so the id is scannable. */
export function buildWorkspaceAppUrl(input: {
  origin: string
  project: string
  section: string
}): string {
  const origin = input.origin.replace(/\/$/, '')
  const project = encodeURIComponent(input.project)
  const section = encodeSectionForQuery(input.section)
  return `${origin}/?${WORKSPACE_PROJECT_PARAM}=${project}&${WORKSPACE_SECTION_PARAM}=${section}`
}

/**
 * Write `project` + `section` onto the current `/` URL via replaceState.
 * Leaves `/about` and `/api/*` alone. Per-window — not Zustand.
 */
export function syncWorkspaceSearch(input: { project: string; section: string }): void {
  if (typeof window === 'undefined') return
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  if (path !== '/') return
  const next = buildWorkspaceAppUrl({
    origin: window.location.origin,
    project: input.project,
    section: input.section,
  })
  if (next === window.location.href) return
  const url = new URL(next)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`)
}
