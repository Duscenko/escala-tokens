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

/**
 * The owner changed these Color Semantics roles in the Figma file on 2026-11-16
 * (DEC-2026-11-16-003), after the inventory above was last saved. Until the plugin
 * repo's `figma-variables.txt` is regenerated, they override its lines so the
 * test holds the code to the file as it IS. Delete an entry the day the inventory
 * carries it.
 */
const SINCE_INVENTORY: Record<string, string> = {
  'Border/default': '{CP:Neutrals/Black Alpha/02} ; {CP:Neutrals/White Alpha/02}',
  'Border/subtle': '{CP:Neutrals/Black Alpha/01} ; {CP:Neutrals/White Alpha/01}',
  // Read live from the file later on 2026-11-16: Dark rest moved to /04, the step its hover sits on.
  'Border/control': '{CP:Neutrals/Black Alpha/03} ; {CP:Neutrals/White Alpha/04}',
  'Border/control-hover': '{CP:Neutrals/Black Alpha/04} ; {CP:Neutrals/White Alpha/04}',
  'Elevation/highlight': '{CP:Neutrals/White Alpha/05} ; {CP:Neutrals/White Alpha/03}',
  'Status/critical/surface': '{CP:States/EscalaDS/Error/Alpha/03} ; {CP:States/EscalaDS/Error Dark/Alpha/03}',
}
function inventoryText(): string {
  return readFileSync(INVENTORY, 'utf8').split('\n').map((line) => {
    const [name, ...rest] = line.split(' | ')
    const values = SINCE_INVENTORY[name]
    return values && rest.length ? [name, ...rest.slice(0, -1), values].join(' | ') : line
  }).join('\n')
}

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

/**
 * Roles where the code DELIBERATELY differs from the file, each with its reason and
 * the decision that would close it. An entry here is not a pass: it is an open
 * question, listed so it cannot be forgotten.
 *  · `content.link.default` (Dark): the file leaves it on Dark 11 (#b29bf9, Lc 55 on
 *    the dark page after the 2026-11-17 ramp); the code's link solver asks Lc 75 for
 *    link text and lands on Dark 12 (#e8e0ff). Open: point the file at Dark 12, or
 *    lower the link floor.
 */
const KNOWN_DEVIATIONS = new Set(['content.link.default dark'])

describe.skipIf(!hasInventory)('every Color Semantics role resolves to the Figma file', () => {
  let brand = ''
  beforeAll(() => { brand = buildFileSystem() })

  it('in Escala Light and Escala Dark', () => {
    const text = inventoryText()
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
        if (got?.toLowerCase() !== want && !KNOWN_DEVIATIONS.has(`${role} ${mode}`)) mismatches.push(`${role} ${mode}: file ${want} (${ref}), code ${got}`)
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
