import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildPaletteModule, parsePrimitiveGroups } from '../../../scripts/gen-figma-palette'
import { applyFigmaFilePalette, FIGMA_FILE_PALETTE } from '../figmaFilePalette'
import { buildStudioTokens } from '../pluginStudio'
import { resolvePreviewTokens } from '../previewTokens'
import { useDesignStore } from '../../store/useDesignStore'

/**
 * Owner's call (2026-11-12): the Figma file `Escala Design System (Real)` is
 * curated and tested, and its colours win over the generator. The system that
 * file shows carries its palette as data; these tests hold that system to the
 * file, role by role. The inventory lives in the plugin repo, so the checks
 * that read it are skipped where it is not checked out (Vercel builds this
 * repo alone); the palette module itself is committed.
 */
const INVENTORY = join(dirname(fileURLToPath(import.meta.url)), '../../../../escala-figma-plugin/spec/figma-variables.txt')
const MODULE = join(dirname(fileURLToPath(import.meta.url)), '../figmaFilePalette.generated.ts')
const hasInventory = existsSync(INVENTORY)

/** Builds the file's system the way Storybook does; returns the brand key. */
function buildFileSystem(): string {
  const built = buildStudioTokens({ accent: FIGMA_FILE_PALETTE.accent, name: 'Escala' }, 'pro')
  if ('error' in built) throw new Error(built.error)
  const s = useDesignStore.getState()
  const brand = s.themeOrder.find((k) => s.themeSources?.[k])!
  applyFigmaFilePalette(brand)
  return brand
}

describe.skipIf(!hasInventory)('the committed palette is the Figma file inventory', () => {
  it('regenerates byte for byte (npm run gen:figma-palette)', () => {
    expect(readFileSync(MODULE, 'utf8')).toBe(buildPaletteModule(readFileSync(INVENTORY, 'utf8')))
  })
})

describe.skipIf(!hasInventory)('every Color Semantics role resolves to the Figma file', () => {
  let brand = ''
  beforeAll(() => { brand = buildFileSystem() })

  it('in Escala Light and Escala Dark', () => {
    const text = readFileSync(INVENTORY, 'utf8')
    const groups = parsePrimitiveGroups(text)
    const s = useDesignStore.getState()
    const tokens = {
      light: resolvePreviewTokens(s, brand, 'light').archTokens ?? {},
      dark: resolvePreviewTokens(s, brand, 'dark').archTokens ?? {},
    }
    const resolve = (ref: string) => {
      const m = /^\{CP:(.+)\/(\d\d)\}$/.exec(ref.trim())
      return m ? groups.get(m[1])?.[Number(m[2])] : undefined
    }
    const mismatches: string[] = []
    let checked = 0
    let section = ''
    for (const line of text.split('\n')) {
      if (line.startsWith('## ')) { section = line; continue }
      if (!section.startsWith('## Color Semantics') || line.startsWith('#') || !line.includes(' | ')) continue
      const [name, , , , , values] = line.split(' | ')
      const role = name.replace(/\//g, '.').toLowerCase()
      values.split(' ; ').forEach((ref, i) => {
        const mode = i === 0 ? 'light' : 'dark'
        const want = resolve(ref)
        if (!want) return
        checked++
        const got = tokens[mode][role]
        if (got?.toLowerCase() !== want) mismatches.push(`${role} ${mode}: file ${want} (${ref}), code ${got}`)
      })
    }
    expect(checked).toBeGreaterThan(150)
    expect(mismatches).toEqual([])
  })
})

describe('a pinned alpha twin', () => {
  it('is dropped when its solid is edited', () => {
    const brand = buildFileSystem()
    const key = useDesignStore.getState().themeSources?.[brand]?.brand as string
    expect(useDesignStore.getState().customColors.find((c) => c.key === key)?.alpha).toBeDefined()
    useDesignStore.getState().updateCustomColor(key, { scale: { ...FIGMA_FILE_PALETTE.families.accent.light, 9: '#7a3cff' } })
    const fam = useDesignStore.getState().customColors.find((c) => c.key === key)!
    expect(fam.alpha).toBeUndefined()
    expect(fam.darkAlpha).toBeDefined()
  })
})
