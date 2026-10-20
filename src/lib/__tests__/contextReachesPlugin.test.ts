// Every context the web hands out, read by the Figma plugin's OWN reader —
// `extractEscalaPayload` + `classifyPaste` evaluated straight out of
// escala-figma-plugin/src/ui.html, not the web's mirror in figmaContext.ts.
// The mirror being tested alone would stay green while the two drift apart.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { ensureColorScales } from '../colorActions'
import { brandContext } from '../contextSource'
import { buildFigmaContext } from '../figmaContext'
import { CONTEXT_FOUNDATIONS, cutComponentContext } from '../contextRequest'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { COMPONENTS } from '../componentCatalogue'
import { agentContextMarkdown } from '../agentContext'
import { resolvePreviewTokens } from '../previewTokens'

const uiHtml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../../escala-figma-plugin/src/ui.html'),
  'utf8',
)

/** Slices one top-level `function name(…) { … }` out of ui.html. */
function pluginFunction(name: string): string {
  const start = uiHtml.indexOf(`function ${name}(`)
  if (start < 0) throw new Error(`${name} not found in ui.html`)
  const end = uiHtml.indexOf('\n}\n', start)
  return uiHtml.slice(start, end + 2)
}

type Paste = { kind: string; raw?: { colors: { themeOrder?: string[]; architecture?: unknown; activeTheme?: string }; project?: string; foundationsByTheme?: Record<string, unknown> }; foundation?: string | null }
const classifyPaste = new Function(
  `${pluginFunction('extractEscalaPayload')}\n${pluginFunction('classifyPaste')}\nreturn classifyPaste`,
)() as (text: string) => Paste

const brands: string[] = []

beforeAll(async () => {
  useDesignStore.setState(makeDesignDefaults())
  ensureColorScales()
  const { adoptPreset } = await import('../adoptPreset')
  for (const preset of THEME_STYLE_PRESETS.slice(0, 3)) {
    const adopted = adoptPreset(preset, 'light')
    if ('error' in adopted) throw new Error(adopted.error)
    brands.push(adopted.key)
    ensureColorScales()
  }
})

/** What the plugin needs from an imported system: one brand, its columns
 *  keyed brand::appearance, every semantic role filled for every column. */
function expectOneBrandSystem(p: Paste, brand: string, columns: number) {
  expect(p.kind).toBe('escala')
  const order = p.raw!.colors.themeOrder!
  expect(order.length).toBe(columns)
  expect(order.every((c) => c.startsWith(`${brand}::`))).toBe(true)
  const arch = (p.raw!.colors.architecture as { tokens: Record<string, Record<string, Record<string, string>>> }).tokens
  for (const [group, roles] of Object.entries(arch)) {
    for (const [role, byCol] of Object.entries(roles)) {
      for (const col of order) expect(byCol[col], `${group}.${role} @ ${col}`).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i)
    }
  }
}

describe('web contexts, read by the plugin', () => {
  it('All foundations (Both / Light / Dark) imports as that one brand', () => {
    const store = useDesignStore.getState()
    for (const brand of brands) {
      for (const [appearance, cols] of [['both', 2], ['light', 1], ['dark', 1]] as const) {
        for (const detail of ['tokens', 'full'] as const) {
          const md = brandContext(store, brand, { scope: 'all', detail, appearance }, store.projectName)
          const p = classifyPaste(md)
          expectOneBrandSystem(p, brand, cols)
          if (appearance !== 'both') expect(p.raw!.colors.themeOrder![0]).toBe(`${brand}::${appearance}`)
        }
      }
    }
  })

  it('every single foundation is recognised as partial, named after itself', () => {
    const store = useDesignStore.getState()
    for (const f of CONTEXT_FOUNDATIONS) {
      const md = brandContext(store, brands[0], { scope: f.key, detail: 'full', appearance: 'both' }, store.projectName)
      const p = classifyPaste(md)
      expect(p.kind, f.key).toBe('partial')
      expect(p.foundation, f.key).toBe(f.label.toLowerCase())
    }
  })

  it("the Figma page's Copy context imports every checked brand × theme", () => {
    const store = useDesignStore.getState()
    const modes = brands.flatMap((theme) => (['light', 'dark'] as const).map((appearance) => ({ theme, appearance })))
    const ctx = buildFigmaContext({ project: store.projectName, modes, viewports: ['desktop', 'tablet', 'mobile'], theme: brands[0], brandName: (k) => k })
    const p = classifyPaste(ctx.text)
    expect(p.kind).toBe('escala')
    expect(p.raw!.colors.themeOrder).toEqual(modes.map((m) => `${m.theme}::${m.appearance}`))
  })

  it('a component context is not mistaken for a system', () => {
    const store = useDesignStore.getState()
    const button = COMPONENTS.find((c) => c.key === 'Button')!
    const md = (a: 'light' | 'dark') => agentContextMarkdown(button, '<Button />', resolvePreviewTokens(store, brands[0], a) as never)
    const cut = cutComponentContext(md('light'), { appearance: 'both', detail: 'full' }, md('dark'))
    expect(['escala', 'broken']).not.toContain(classifyPaste(cut).kind)
  })
})
