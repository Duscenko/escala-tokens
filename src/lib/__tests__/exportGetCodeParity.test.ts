import { beforeAll, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { generateTokenJSON } from '../tokenGenerator'
import { captureCodeSnapshot } from '../codeScope'
import { defaultFigmaSyncModes } from '../figmaSyncModes'

// Home's brand Export menu has three doors — Export <brand>, Sync with Figma,
// Get code — and they must hand out ONE system. Export and the Figma context
// are generated from the store scoped to the brand (`brand::appearance`
// columns); Get code from `captureCodeSnapshot` (`light` / `dark` columns).
// Different shapes, same values: every Categorical role, per appearance.

type Arch = Record<string, Record<string, Record<string, string>>>
function roles(json: { colors: { architecture?: { tokens?: Arch } } }, column: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [group, byRole] of Object.entries(json.colors.architecture?.tokens ?? {})) {
    for (const [role, byMode] of Object.entries(byRole)) out[`${group}.${role}`] = byMode[column]
  }
  return out
}

const brands: string[] = []
beforeAll(async () => {
  useDesignStore.setState(makeDesignDefaults())
  const { adoptPreset } = await import('../adoptPreset')
  const { THEME_STYLE_PRESETS } = await import('../themePresets')
  for (const preset of THEME_STYLE_PRESETS.slice(0, 4)) {
    const r = adoptPreset(preset, 'light')
    if ('error' in r) throw new Error(r.error)
    brands.push(r.key)
  }
})

describe('Export <brand> and Get code ship the same values', () => {
  it('every Categorical role, both appearances, for every brand of a multi-brand system', () => {
    const s = useDesignStore.getState()
    for (const brand of brands) {
      const exported = generateTokenJSON(undefined, {
        themes: [brand],
        modes: defaultFigmaSyncModes([brand], s.themeKinds, s.brandThemes),
      }) as never
      const code = generateTokenJSON(captureCodeSnapshot(s, brand)) as never
      for (const appearance of ['light', 'dark'] as const) {
        const a = roles(exported, `${brand}::${appearance}`)
        const b = roles(code, appearance)
        const differ = Object.keys(b).filter((k) => a[k] !== b[k]).map((k) => `${brand} ${appearance} ${k}: export ${a[k]} · code ${b[k]}`)
        expect(differ).toEqual([])
      }
    }
  })
})
