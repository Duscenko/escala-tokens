import { describe, expect, it } from 'vitest'
import { buildTokenSearchIndex, groupResults, primitiveFamilyOf, searchTokens, type TokenSearchSource } from '../tokenSearch'
import { LAYOUT_ROLES } from '../layoutTokens'
import { TYPE_ROLES } from '../typeRoles'
import { CATEGORICAL_ROLE_COMMENTS } from '../semanticArchitectures'

/**
 * A minimal payload with the same SHAPE `generateTokenJSON()` emits. Structural
 * on purpose (see `TokenSearchSource`): the index is a pure function of the
 * export, so it can be exercised without booting the store or a renderer.
 */
const source: TokenSearchSource = {
  colors: {
    primitive: { 'accent-9': '#2970ff', 'accent-11': '#3869cb', 'neutral-dark-11': '#cdced7' },
    primitiveAlpha: { 'accent-a-3': '#2970ff1f' },
    themes: { light: { 'background-brand-solid': '#2970ff' }, dark: { 'background-brand-solid': '#2970ff' } },
    themeOrder: ['light', 'dark'],
    semanticArchitecture: 'categorical',
    architecture: {
      tokens: {
        action: { 'primary.default': { light: '#2970ff', dark: '#2970ff' } },
        surface: { page: { light: '#ffffff', dark: '#0c0e12' } },
      },
    },
  },
  typography: {
    fontFamily: 'Inter',
    headingFontFamily: 'Inter',
    sizes: { 'text-sm': '14px', 'text-md': '16px' },
    lineHeights: { 'text-sm': '20px' },
    weights: { semibold: 600 },
    roles: { button: { desktop: { size: 'text-sm', weight: 'semibold' } } },
  },
  spacing: { '2': '8px' },
  spacingRoles: { 'inset-surface': '5' },
  radius: { sm: '8px', lg: '16px' },
  radiusRoles: { action: 'sm', container: 'lg' },
  sizes: { md: '40px' },
  sizeRoles: { control: 'md' },
  selector: { xl: '24px' },
  selectorRoles: { hit: 'xl' },
  stroke: { sm: '1px' },
  strokeRoles: { control: 'sm' },
  grid: { columns: '12', 'breakpoint-md': '768px' },
  breakpointRoles: { desktop: 'breakpoint-md' },
  shadows: { lg: '0 4px 8px rgba(0,0,0,.1)' },
  gradients: { 'brand-cover': 'linear-gradient(135deg, #2970ff 0%, #1b3467 100%)' },
}

const index = buildTokenSearchIndex(source, 'dark')
const ids = (q: string, limit = 40) => searchTokens(index, q, limit).results.map((r) => r.id)
const find = (id: string) => index.find((e) => e.id === id)

describe('buildTokenSearchIndex', () => {
  it('covers every foundation that owns a table', () => {
    // Icons has no token rows, so it is legitimately absent. Any OTHER missing
    // foundation means a whole table is unreachable from search.
    expect([...new Set(index.map((e) => e.foundation))].sort()).toEqual(
      ['color', 'grid', 'radius', 'shadow', 'sizes', 'spacing', 'stroke', 'typography'],
    )
  })

  it('resolves values for the requested mode, not always the first theme', () => {
    expect(find('surface.page')?.value).toBe('#0c0e12')
    expect(buildTokenSearchIndex(source, 'light').find((e) => e.id === 'surface.page')?.value).toBe('#ffffff')
  })

  it('indexes the ACTIVE architecture only', () => {
    // Categorical is active here, so its ids are present and the flat
    // catalogue's are not — a result must always have a table to land on.
    expect(find('action.primary.default')).toBeTruthy()
    expect(find('background-brand-solid')).toBeUndefined()

    const flat = buildTokenSearchIndex({ ...source, colors: { ...source.colors, semanticArchitecture: 'flat' } }, 'light')
    expect(flat.find((e) => e.id === 'background-brand-solid')).toBeTruthy()
    expect(flat.find((e) => e.id === 'action.primary.default')).toBeUndefined()
  })

  it('carries catalogue prose, stripped of its [ROLE:] tag and markup', () => {
    const d = find('action.primary.default')?.description ?? ''
    expect(CATEGORICAL_ROLE_COMMENTS['action.primary.default']).toContain('[ROLE:')
    expect(d).not.toContain('[ROLE:')
    expect(d).not.toMatch(/<[^>]+>/)
    expect(d.length).toBeGreaterThan(10)
  })

  it('prints what a role RESOLVES to, and keeps the aliased step searchable', () => {
    expect(find('radius.action')?.value).toBe('8px · sm')
    expect(ids('sm')).toContain('radius.action')
  })

  it('files a primitive under its family, ignoring the -dark column infix', () => {
    expect(primitiveFamilyOf('accent-9')).toBe('accent')
    expect(primitiveFamilyOf('neutral-dark-11')).toBe('neutral')
    expect(primitiveFamilyOf('accent-a-3')).toBe('accent-a')
    expect(primitiveFamilyOf('accent-dark-a-3')).toBe('accent-a')
    expect(find('neutral-dark-11')?.group).toBe('neutral')
  })
})

describe('searchTokens', () => {
  it('finds every variable a component word describes — the reported bug', () => {
    // "button" is not a token NAME anywhere. It appears only in catalogue prose,
    // which the per-table filters never read, so this query used to return
    // nothing at all while the system carried these five answers.
    const hits = ids('button')
    expect(hits).toContain('radius.action')
    expect(hits).toContain('size.control')
    expect(hits).toContain('stroke.control')
    expect(hits).toContain('button')
    expect(hits.length).toBeGreaterThan(3)
  })

  it('reaches across foundations, not just the open collection', () => {
    const foundations = new Set(searchTokens(index, 'button').results.map((r) => r.foundation))
    expect(foundations.size).toBeGreaterThan(2)
  })

  it('ranks an exact token name above tokens that merely mention it', () => {
    expect(ids('accent-9')[0]).toBe('accent-9')
    expect(ids('surface.page')[0]).toBe('surface.page')
  })

  it('treats separators as noise, so the id can be typed as words', () => {
    expect(ids('action primary')).toContain('action.primary.default')
    expect(ids('accent 9')).toContain('accent-9')
    expect(ids('breakpoint md')).toContain('grid-breakpoint-md')
  })

  it('finds a token by its value — a pasted hex, with or without the #', () => {
    expect(ids('#2970ff')).toContain('accent-9')
    expect(ids('2970ff')).toContain('accent-9')
    expect(ids('16px')).toContain('radius-lg')
  })

  it('finds a token by its CSS variable', () => {
    expect(ids('--radius-action')).toContain('radius.action')
  })

  it('returns nothing for an empty query rather than the whole system', () => {
    expect(searchTokens(index, '   ')).toEqual({ results: [], total: 0 })
  })

  it('reports the true total even when the list is capped', () => {
    const { results, total } = searchTokens(index, 'a', 3)
    expect(results).toHaveLength(3)
    expect(total).toBeGreaterThan(3)
  })

  it('groups results in the rail\'s own foundation order', () => {
    const groups = groupResults(searchTokens(index, 'button').results)
    const order = groups.map((g) => g.foundation)
    expect(order).toEqual([...order].sort(
      (a, b) => ['color', 'typography', 'radius', 'spacing', 'grid', 'sizes', 'stroke', 'shadow'].indexOf(a)
        - ['color', 'typography', 'radius', 'spacing', 'grid', 'sizes', 'stroke', 'shadow'].indexOf(b),
    ))
  })
})

describe('catalogue coverage', () => {
  it('indexes every layout and type role the catalogues define', () => {
    const indexed = new Set(index.map((e) => e.id))
    for (const [family, roles] of Object.entries(LAYOUT_ROLES)) {
      for (const role of roles) expect(indexed.has(`${family}.${role.key}`)).toBe(true)
    }
    for (const role of TYPE_ROLES) expect(indexed.has(role.key)).toBe(true)
  })
})
