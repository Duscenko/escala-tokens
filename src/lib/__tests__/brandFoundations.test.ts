import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { mintTheme, slotsFromAccent } from '../themeMint'
import { backgroundFromBase } from '../colorUtils'
import {
  brandOwnsRow, followSystemRow, matchBrandSpacingMode, seedAddedBrand, systemBrandFor,
} from '../brandFoundations'
import { radiusPresetPatch, INSET_SURFACE_ROLE } from '../layoutTokens'
import { resolveThemeFoundations } from '../themeFoundations'
import { defaultFigmaSyncModes } from '../figmaSyncModes'
import { generateTokenJSON } from '../tokenGenerator'

function mint(accent: string, name: string, kind: 'light' | 'dark' = 'light'): string {
  const tint = useDesignStore.getState().neutralTint
  const slots = slotsFromAccent(accent, tint)
  const pages = { light: backgroundFromBase(slots.gray, 'light', tint), dark: backgroundFromBase(slots.gray, 'dark', tint) }
  const res = mintTheme(slots, kind, name, null, tint, pages)
  if ('error' in res) throw new Error(res.error)
  return res.key
}

describe('Add brand: per-brand appearance and own foundations', () => {
  let system: string
  let brand: string

  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
    system = mint('#2563eb', 'Escala')
    // The system brand carries its own overrides (a style): shadows and a face.
    const s = useDesignStore.getState()
    const typo = resolveThemeFoundations(s, system).typography
    s.patchThemeFoundations(system, {
      shadows: { ...resolveThemeFoundations(s, system).shadows, md: '0 9px 9px rgba(0,0,0,0.3)' },
      typography: { ...typo, fontFamily: 'Inter', headingFontFamily: 'Inter' },
    })
    brand = mint('#e11d48', 'Hola', 'dark')
  })

  it('names the system brand and seeds the new brand on its foundations', () => {
    expect(systemBrandFor(useDesignStore.getState(), brand)).toBe(system)
    seedAddedBrand(brand, system)
    const s = useDesignStore.getState()
    expect(resolveThemeFoundations(s, brand).shadows.md).toBe('0 9px 9px rgba(0,0,0,0.3)')
    for (const row of ['typography', 'radius', 'sizes'] as const) {
      expect(brandOwnsRow(s, brand, system, row)).toBe(false)
    }
  })

  it('reads Own once a row moves, and System again after Use system', () => {
    seedAddedBrand(brand, system)
    const s = useDesignStore.getState()
    const typo = resolveThemeFoundations(s, brand).typography
    s.patchThemeFoundations(brand, { typography: { ...typo, fontFamily: 'DM Sans', headingFontFamily: 'Fraunces' } })
    const radius = radiusPresetPatch('Sharp', resolveThemeFoundations(s, brand).radiusRoles)
    if (radius) s.patchThemeFoundations(brand, radius)
    s.patchThemeFoundations(brand, { spacingRoles: { ...resolveThemeFoundations(s, brand).spacingRoles, [INSET_SURFACE_ROLE]: '3' } })

    let live = useDesignStore.getState()
    expect(brandOwnsRow(live, brand, system, 'typography')).toBe(true)
    if (radius) expect(brandOwnsRow(live, brand, system, 'radius')).toBe(true)
    expect(brandOwnsRow(live, brand, system, 'sizes')).toBe(true)
    expect(matchBrandSpacingMode(resolveThemeFoundations(live, brand).spacingRoles)).toBe('compact')
    // The shared text scale is still the system's.
    expect(resolveThemeFoundations(live, brand).typography.sizes).toEqual(resolveThemeFoundations(live, system).typography.sizes)

    followSystemRow(brand, system, 'typography')
    live = useDesignStore.getState()
    expect(brandOwnsRow(live, brand, system, 'typography')).toBe(false)
    expect(brandOwnsRow(live, brand, system, 'sizes')).toBe(true)
  })

  it('ships only the chosen appearance, and the payload columns carry the own font', () => {
    seedAddedBrand(brand, system)
    const s = useDesignStore.getState()
    s.setBrandThemes(brand, ['dark'])
    const typo = resolveThemeFoundations(s, brand).typography
    s.patchThemeFoundations(brand, { typography: { ...typo, fontFamily: 'DM Sans' } })

    const live = useDesignStore.getState()
    const modes = defaultFigmaSyncModes([system, brand], live.themeKinds, live.brandThemes)
    const json = generateTokenJSON(live, { modes }) as unknown as {
      colors: { themeOrder: string[] }
      foundationsByTheme: Record<string, { typography: { fontFamily: string } }>
    }
    expect(json.colors.themeOrder).toEqual([`${system}::light`, `${system}::dark`, `${brand}::dark`])
    expect(json.foundationsByTheme[`${brand}::dark`].typography.fontFamily).toBe('DM Sans')
    expect(json.foundationsByTheme[`${system}::light`].typography.fontFamily).toBe('Inter')
  })
})
