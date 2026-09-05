import { describe, expect, it } from 'vitest'
import { generateTokenJSON } from '../tokenGenerator'
import {
  buildWorkspaceAppUrl,
  decodeWorkspaceSection,
  encodeWorkspaceSection,
  parseWorkspaceSearch,
} from '../workspaceLink'

describe('workspace deep-link protocol', () => {
  it('round-trips the Themes editing + Sync surfaces', () => {
    const cases = [
      { tab: 'foundations' as const, workspace: 'preview' as const, surface: 'artefacts' as const, theme: 'core' },
      { tab: 'foundations' as const, workspace: 'preview' as const, surface: 'figma' as const, theme: 'core' },
      { tab: 'foundations' as const, workspace: 'primitives' as const, surface: 'artefacts' as const, theme: 'core', foundation: 'color', collection: 'primitives' },
      { tab: 'foundations' as const, workspace: 'primitives' as const, surface: 'artefacts' as const, theme: 'core', foundation: 'color', collection: 'semantics' },
      { tab: 'foundations' as const, workspace: 'primitives' as const, surface: 'artefacts' as const, theme: 'sky', foundation: 'radius', collection: 'primitives' },
      { tab: 'foundations' as const, workspace: 'code' as const, surface: 'artefacts' as const, theme: 'core' },
      { tab: 'components' as const, workspace: 'preview' as const, surface: 'artefacts' as const, component: 'Button' },
      { tab: 'docs' as const, workspace: 'preview' as const, surface: 'artefacts' as const, doc: '__guide-mcp' },
      { tab: 'about' as const, workspace: 'preview' as const, surface: 'artefacts' as const },
    ]
    for (const place of cases) {
      const section = encodeWorkspaceSection(place)
      const decoded = decodeWorkspaceSection(section)
      expect(decoded, section).toMatchObject({
        tab: place.tab,
        workspace: place.workspace,
        surface: place.surface,
        ...(place.theme ? { theme: place.theme } : {}),
        ...(place.component ? { component: place.component } : {}),
        ...(place.doc ? { doc: place.doc } : {}),
      })
    }
  })

  it('uses variables/<theme> for Color primitives and names the foundation when it is not that default', () => {
    expect(encodeWorkspaceSection({
      tab: 'foundations', workspace: 'primitives', surface: 'artefacts',
      theme: 'hola', foundation: 'color', collection: 'primitives',
    })).toBe('variables/hola')
    expect(encodeWorkspaceSection({
      tab: 'foundations', workspace: 'primitives', surface: 'artefacts',
      theme: 'hola', foundation: 'color', collection: 'semantics',
    })).toBe('variables/hola/color/semantics')
    expect(decodeWorkspaceSection('variables/color')).toMatchObject({
      workspace: 'primitives', foundation: 'color',
    })
    expect(decodeWorkspaceSection('variables/hola/color/semantics')).toMatchObject({
      theme: 'hola', foundation: 'color', collection: 'semantics',
    })
  })

  it('aliases sync to the Theme preview Figma card', () => {
    expect(decodeWorkspaceSection('sync')).toEqual({
      tab: 'foundations', workspace: 'preview', surface: 'figma',
    })
    expect(encodeWorkspaceSection({
      tab: 'foundations', workspace: 'preview', surface: 'figma',
    })).toBe('sync')
  })

  it('builds a readable app URL and does not touch /api/tokens', () => {
    const url = buildWorkspaceAppUrl({
      origin: 'https://www.escalatokens.com',
      project: 'hola',
      section: 'themes/core/figma',
    })
    expect(url).toBe('https://www.escalatokens.com/?project=hola&section=themes/core/figma')
    expect(url).not.toContain('/api/tokens')
    expect(parseWorkspaceSearch('?project=hola&section=themes/core/figma')).toEqual({
      project: 'hola',
      section: 'themes/core/figma',
      place: { tab: 'foundations', workspace: 'preview', surface: 'figma', theme: 'core' },
    })
  })

  it('rejects junk segments instead of inventing a place', () => {
    expect(decodeWorkspaceSection('themes/core/figma?x=1')).toBeNull()
    expect(decodeWorkspaceSection('../etc')).toBeNull()
    expect(decodeWorkspaceSection('')).toBeNull()
  })
})

describe('editor.section is publish-only', () => {
  it('stays off generateTokenJSON() until a section is passed', () => {
    const plain = generateTokenJSON() as { editor?: unknown }
    expect(plain.editor).toBeUndefined()
    const published = generateTokenJSON(undefined, { section: 'themes/core/figma' }) as {
      editor?: { section?: string }
    }
    expect(published.editor).toEqual({ section: 'themes/core/figma' })
  })
})
