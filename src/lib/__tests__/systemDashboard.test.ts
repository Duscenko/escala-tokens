import { describe, expect, it } from 'vitest'
import { useDesignStore } from '../../store/useDesignStore'
import {
  automaticStatus, buildElements, buildRelease, changeCounts, componentRows, componentsByRole, contrastSummary,
  diffTokenMaps, foundationFacts, nextVersion, releaseDraft, releaseTokenMap, resolveSystemRoles, sortForDecision, sourceState,
  statusCounts, suggestedBump, tokenElementId, tokenMapping, componentElementId,
} from '../systemDashboard'
import { COMPONENTS } from '../componentCatalogue'
import { categoricalRoleCount } from '../semanticArchitectures'

const state = () => useDesignStore.getState()
const previews = new Set(COMPONENTS.map((c) => c.key))

describe('roles', () => {
  it('resolves every Categorical role in both themes of a brand', () => {
    const roles = resolveSystemRoles(state(), 'light')
    expect(roles.roles).toHaveLength(categoricalRoleCount())
    expect(roles.modeKeys).toHaveLength(2)
    for (const role of roles.roles) {
      for (const mode of roles.modeKeys) expect(role.modes[mode]?.css, `${role.id} · ${mode}`).toBeTruthy()
    }
  })

  it('measures contrast with the audit, and the default system passes', () => {
    const summary = contrastSummary(resolveSystemRoles(state(), 'light').findings)
    expect(summary.measured).toBeGreaterThan(20)
    expect(summary.failing).toEqual([])
  })
})

describe('components', () => {
  it('lists every catalogue component and marks the ones in the system', () => {
    const rows = componentRows(['Button'], previews)
    expect(rows).toHaveLength(COMPONENTS.length)
    expect(rows.filter((row) => row.included).map((row) => row.key)).toEqual(['Button'])
    expect(rows.find((row) => row.key === 'Button')!.variants).toBeGreaterThan(1)
  })

  it('maps roles to the components that read them, and back', () => {
    const byRole = componentsByRole(['Button', 'Input'])
    expect(byRole.get('action.primary.default')).toContain('Button')
    const mapping = tokenMapping(['Button'])
    expect(mapping.some((row) => row.role === 'action.primary.default')).toBe(true)
    expect(mapping.every((row) => row.component === 'Button')).toBe(true)
  })
})

describe('releases', () => {
  it('records the same tokens whichever brand is on screen', () => {
    const map = releaseTokenMap(state())
    expect(Object.keys(map).length).toBeGreaterThan(200)
    expect(map['color.semantic.content.primary.light']).toMatch(/^#/)
    expect(map['component.Button']).toBe('included')
  })

  it('reports added, changed and removed paths', () => {
    const changes = diffTokenMaps({ a: '1', b: '2', c: '3' }, { a: '1', b: '9', d: '4' })
    expect(changes).toEqual([
      { path: 'b', kind: 'changed', before: '2', after: '9' },
      { path: 'c', kind: 'removed', before: '3' },
      { path: 'd', kind: 'added', after: '4' },
    ])
    expect(changeCounts(changes)).toEqual({ added: 1, changed: 1, removed: 1 })
  })

  it('suggests the bump from what changed', () => {
    expect(suggestedBump({ added: 0, changed: 0, removed: 0 })).toBeNull()
    expect(suggestedBump({ added: 0, changed: 3, removed: 0 })).toBe('patch')
    expect(suggestedBump({ added: 1, changed: 3, removed: 0 })).toBe('minor')
    expect(suggestedBump({ added: 1, changed: 3, removed: 1 })).toBe('major')
    expect(nextVersion(null, 'patch')).toBe('1.0.0')
    expect(nextVersion('1.2.3', 'patch')).toBe('1.2.4')
    expect(nextVersion('1.2.3', 'minor')).toBe('1.3.0')
    expect(nextVersion('1.2.3', 'major')).toBe('2.0.0')
  })

  it('has nothing to release right after a release', () => {
    const first = releaseDraft(state())
    expect(first.first).toBe(true)
    const release = buildRelease(first, 'major', '  First  ', '2026-10-11T00:00:00.000Z')
    expect(release).toMatchObject({ version: '1.0.0', note: 'First' })
    const after = releaseDraft({ ...state(), releaseBaseline: first.current, releases: [release] })
    expect(after.first).toBe(false)
    expect(after.changes).toEqual([])
    expect(after.suggested).toBeNull()
  })
})

describe('elements', () => {
  const build = (patch: Partial<ReturnType<typeof state>> = {}) => {
    const store = { ...state(), ...patch }
    const draft = releaseDraft(store)
    return buildElements({ store, roles: resolveSystemRoles(store, 'light'), previewKeys: previews, changes: draft.changes })
  }

  it('holds one element per role and per component in the system', () => {
    const elements = build()
    expect(elements.filter((el) => el.kind === 'token')).toHaveLength(categoricalRoleCount())
    expect(elements.filter((el) => el.kind === 'component')).toHaveLength(state().selectedComponents.length)
  })

  it('is Pending before anything was published, Live after', () => {
    expect(automaticStatus(false, { published: false, hasRelease: false })).toBe('proposed')
    expect(automaticStatus(false, { published: true, hasRelease: false })).toBe('live')
    expect(statusCounts(build()).proposed).toBe(build().length)
    expect(statusCounts(build({ figmaLastPublishAt: '2026-10-01T00:00:00.000Z' })).live).toBe(build().length)
  })

  it('proposes what changed since the last release', () => {
    const baseline = { ...releaseTokenMap(state()) }
    baseline['color.semantic.content.primary.light'] = '#000001'
    delete baseline['component.Button']
    const elements = build({ releaseBaseline: baseline })
    const proposed = elements.filter((el) => el.status === 'proposed').map((el) => el.id).sort()
    expect(proposed).toEqual([componentElementId('Button'), tokenElementId('content.primary')].sort())
    expect(elements.find((el) => el.id === tokenElementId('content.primary'))!.suggestion).toBe('approve')
    expect(sortForDecision(elements).slice(0, 2).every((el) => el.status === 'proposed')).toBe(true)
  })

  it('lets a decision win over the automatic status', () => {
    const id = tokenElementId('content.primary')
    const elements = build({ elementStatus: { [id]: { status: 'deprecated', at: '2026-10-11T00:00:00.000Z' } } })
    const element = elements.find((el) => el.id === id)!
    expect(element).toMatchObject({ status: 'deprecated', decided: true, suggestion: 'keep' })
  })
})

describe('sources', () => {
  it('is stale when something changed after the last send', () => {
    expect(sourceState(null, '2026-10-02T00:00:00.000Z')).toBe('never')
    expect(sourceState('2026-10-03T00:00:00.000Z', '2026-10-02T00:00:00.000Z')).toBe('synced')
    expect(sourceState('2026-10-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z')).toBe('stale')
    expect(sourceState('2026-10-01T00:00:00.000Z', null)).toBe('synced')
  })
})

describe('overview facts', () => {
  it('reads the default system: three ascending radius axes, the standard spacing and a named shadow', () => {
    const facts = foundationFacts(state(), 'light')
    expect(facts.radius).toEqual({ boxes: 16, fields: 12, selectors: 4 })
    expect(facts.spacing).toBe('Quiet')
    expect(facts.shadow).not.toBeNull()
    expect(facts.fonts.body).toBe(state().typography.fontFamily)
  })

  it('says Custom, not a preset, once a shadow step is hand-edited', () => {
    const store = { ...state(), shadows: { ...state().shadows, md: '0 0 0 3px red' } }
    expect(foundationFacts(store, 'light').shadow).toBeNull()
  })
})
