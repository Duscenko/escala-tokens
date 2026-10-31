import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { adoptPreset } from '../adoptPreset'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { COLOR_ROLE_ORDER } from '../colorRoles'
import { resolveSystemRoles, tokenMapping } from '../systemDashboard'
import { COMPONENTS } from '../componentCatalogue'
import { categoricalSolvedRoles } from '../semanticArchitectures'
import { buildColorRoleMap, focusedRoleIds, modeForAppearance, ownerOfLabel, toneLegend, tonesOfRoles, visibleGroups } from '../colorRoleMap'

const state = () => useDesignStore.getState()

/** Every brand worth mapping — the default system, then each System Style in
 *  a fresh system of its own (the beta caps a system at five brands) — with
 *  its roles resolved while that system is the store. */
function eachBrand(run: (name: string, roles: ReturnType<typeof resolveSystemRoles>) => void) {
  run('default', resolveSystemRoles(state(), 'light'))
  for (const preset of THEME_STYLE_PRESETS) {
    useDesignStore.setState(makeDesignDefaults())
    const r = adoptPreset(preset, 'light', { track: false })
    // Every style adopted, or the loop would prove nothing about it.
    expect('key' in r ? r.key : r.error, preset.label).toBeTruthy()
    if ('key' in r) run(preset.label, resolveSystemRoles(state(), r.key))
  }
}

beforeEach(() => { useDesignStore.setState(makeDesignDefaults()) })

describe('ownerOfLabel', () => {
  it('reads the slot family, solid or alpha, and the fixed ladders', () => {
    expect(ownerOfLabel('accent.11')).toBe('accent')
    expect(ownerOfLabel('accent-a.3')).toBe('accent')
    expect(ownerOfLabel('neutral-dark.12')).toBe('neutral')
    expect(ownerOfLabel('error-a.6')).toBe('error')
    expect(ownerOfLabel('black-a.3')).toBe('fixed')
    expect(ownerOfLabel('white-a.8')).toBe('fixed')
    expect(ownerOfLabel('transparent')).toBeNull()
  })
})

describe('buildColorRoleMap', () => {
  it('puts every role in exactly one colour, in every theme of every brand', () => {
    eachBrand((name, roles) => {
      const brand = { name }
      for (const mode of roles.modeKeys) {
        const placed = new Map<string, string>()
        for (const colour of COLOR_ROLE_ORDER) {
          const map = buildColorRoleMap(roles, colour, mode)
          for (const group of map.groups) {
            for (const role of group.roles) {
              expect(placed.get(role.id), `${brand.name} · ${mode} · ${role.id} in ${colour} and ${placed.get(role.id)}`).toBeUndefined()
              placed.set(role.id, colour)
            }
          }
        }
        // A role on no ramp at all would be invisible on the map — none is.
        const missing = roles.roles.filter((r) => !placed.has(r.id)).map((r) => `${r.id}=${r.modes[mode]?.label}`)
        expect(missing, `${brand.name} · ${mode}`).toEqual([])
      }
    })
  })

  it('lists all five groups for every colour, empty or not', () => {
    const roles = resolveSystemRoles(state(), 'light')
    const keys = (colour: typeof COLOR_ROLE_ORDER[number]) =>
      buildColorRoleMap(roles, colour, roles.modeKeys[0]).groups.map((g) => g.key)
    expect(keys('accent')).toEqual(['content', 'action', 'surface', 'status', 'border'])
    for (const colour of COLOR_ROLE_ORDER) expect(keys(colour)).toEqual(keys('accent'))
  })

  it('gives every brand a Critical that paints something', () => {
    eachBrand((name, roles) => {
      const map = buildColorRoleMap(roles, 'error', modeForAppearance(roles, 'light'))
      const status = map.groups.find((g) => g.key === 'status')!
      expect(status.roles.length, name).toBeGreaterThan(0)
      expect(map.componentCount, name).toBeGreaterThan(0)
    })
  })

  it('lists exactly the components whose recipe reads each role', () => {
    const roles = resolveSystemRoles(state(), 'light')
    const rows = tokenMapping(COMPONENTS.map((c) => c.key))
    for (const colour of COLOR_ROLE_ORDER) {
      for (const group of buildColorRoleMap(roles, colour, roles.modeKeys[0]).groups) {
        for (const role of group.roles) {
          const expected = [...new Set(rows.filter((r) => r.role === role.id).map((r) => r.component))].sort()
          expect(role.components.map((c) => c.key).sort(), role.id).toEqual(expected)
        }
      }
    }
  })

  it('indexes tones by the labels the roles carry', () => {
    const roles = resolveSystemRoles(state(), 'light')
    for (const mode of roles.modeKeys) {
      const map = buildColorRoleMap(roles, 'accent', mode)
      const byTone = Object.entries(map.tones).flatMap(([tone, ids]) => ids.map((id) => `${id}@${tone}`)).sort()
      const fromRoles = map.groups.flatMap((g) => g.roles.filter((r) => r.band === 'ramp').map((r) => `${r.id}@${r.tone}`)).sort()
      expect(byTone).toEqual(fromRoles)
    }
  })

  it('carries the fixed ladders under Neutral only', () => {
    const roles = resolveSystemRoles(state(), 'light')
    const mode = roles.modeKeys[0]
    const neutral = buildColorRoleMap(roles, 'neutral', mode)
    expect(neutral.fixed.length).toBeGreaterThan(0)
    expect(neutral.fixed.every((r) => /^(black|white)-a$/.test(r.family))).toBe(true)
    for (const colour of COLOR_ROLE_ORDER.filter((c) => c !== 'neutral')) {
      expect(buildColorRoleMap(roles, colour, mode).fixed).toEqual([])
    }
  })

  it('knows a solved tone from a pinned one for every role', () => {
    const solved = categoricalSolvedRoles()
    const roles = resolveSystemRoles(state(), 'light')
    for (const role of roles.roles) expect(solved[role.id], role.id).toBeDefined()
    expect(solved['action.primary.default'].light).toBe(true)
    expect(solved['content.primary'].light).toBe(false)
  })
})

describe('focus and the ramp legend', () => {
  const accent = () => {
    const roles = resolveSystemRoles(state(), 'light')
    return buildColorRoleMap(roles, 'accent', roles.modeKeys[0])
  }

  it('lights from the ramp exactly the roles on that tone, and back', () => {
    const map = accent()
    const groups = visibleGroups(map, null)
    for (const [tone, use] of Object.entries(toneLegend(groups))) {
      const lit = focusedRoleIds(groups, { kind: 'tone', id: tone })!
      expect([...lit].sort(), `tone ${tone}`).toEqual([...use.roles].sort())
      // Reading the lit roles back lands on that one tone.
      expect([...tonesOfRoles(groups, lit)]).toEqual([Number(tone)])
    }
  })

  it('agrees with the map’s own tone index', () => {
    const map = accent()
    const legend = toneLegend(map.groups)
    expect(Object.keys(legend).sort()).toEqual(Object.keys(map.tones).sort())
    for (const [tone, ids] of Object.entries(map.tones)) expect(legend[Number(tone)].roles.sort()).toEqual([...ids].sort())
  })

  it('marks a step read only through the alpha twin', () => {
    const groups = accent().groups
    const legend = toneLegend(groups)
    for (const [tone, use] of Object.entries(legend)) {
      const families = groups.flatMap((g) => g.roles).filter((r) => r.band === 'ramp' && r.tone === Number(tone)).map((r) => r.family)
      expect(use.alphaOnly, `tone ${tone}: ${families.join(', ')}`).toBe(families.every((f) => f.endsWith('-a')))
    }
  })

  it('narrows a component focus to the groups on screen', () => {
    const map = accent()
    const all = focusedRoleIds(visibleGroups(map, null), { kind: 'component', id: 'Button' })!
    const action = focusedRoleIds(visibleGroups(map, 'action'), { kind: 'component', id: 'Button' })!
    expect(action.size).toBeGreaterThan(0)
    expect(action.size).toBeLessThanOrEqual(all.size)
    for (const id of action) expect(id.startsWith('action.')).toBe(true)
  })
})
