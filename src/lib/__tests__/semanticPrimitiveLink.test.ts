import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { generateTokenJSON } from '../tokenGenerator'
import { generateColorScale, generateFamilyDarkScale } from '../colorUtils'

// The Figma plugin aliases a semantic value to a primitive by BYTE match
// (`primByHex` / `primAlphaByHex` in escala-figma-plugin/src/code.ts). A role
// whose hex matches no primitive lands in Figma as a detached raw colour — this
// is what the `status.*.surface / surface-pressed / border` rows looked like
// ("FE6A33 · 12.16%") while the other status roles were linked. The cause: a
// family private to a theme has its alpha twin solved against THAT theme's paper
// in `colors.primitiveAlpha`, while the projection composited `{error-a.N}`
// against the system page — two different hexes for one token.

/** Same backfill `useEnsureColorScales` runs on mount (the store ships these empty). */
function backfillGlobalRamps() {
  const s = useDesignStore.getState()
  const gen = (b: string) => generateColorScale(b, s.colorAlgorithm, s.contrastShift, s.pageBackground)
  const genDark = (b: string) => generateFamilyDarkScale(b, s.colorAlgorithm, s.contrastShift, s.darkBackground)
  if (!Object.keys(s.primaryScale).length) s.setPrimaryScale(gen(s.primaryColor))
  if (!Object.keys(s.errorScale).length) s.setErrorScale(gen(s.errorColor))
  if (!Object.keys(s.primaryDarkScale ?? {}).length) s.setPrimaryDarkScale(genDark(s.primaryColor))
  if (!Object.keys(s.errorDarkScale ?? {}).length) s.setErrorDarkScale(genDark(s.errorColor))
}

describe('semantic roles alias their primitive', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  for (const preset of THEME_STYLE_PRESETS) {
    it(`${preset.id}: every Categorical role matches a primitive hex`, async () => {
      const { adoptPreset } = await import('../adoptPreset')
      adoptPreset(preset, 'dark')
      adoptPreset(preset, 'light')
      backfillGlobalRamps()

      const json = generateTokenJSON()
      const index = new Set<string>()
      for (const v of Object.values(json.colors.primitive)) index.add(String(v).toLowerCase())
      for (const v of Object.values(json.colors.primitiveAlpha ?? {})) index.add(String(v).toLowerCase())

      const arch = json.colors.architecture as { tokens: Record<string, Record<string, Record<string, string>>> }
      const unlinked: string[] = []
      for (const [group, tokens] of Object.entries(arch.tokens)) {
        for (const [key, modes] of Object.entries(tokens)) {
          for (const [mode, hex] of Object.entries(modes)) {
            if (!index.has(String(hex).toLowerCase())) unlinked.push(`${group}.${key} [${mode}] ${hex}`)
          }
        }
      }
      expect(unlinked).toEqual([])
    })
  }
})
