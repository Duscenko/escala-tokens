import { describe, expect, it } from 'vitest'
import { makeDesignDefaults } from '../../store/useDesignStore'
import { resolvePreviewTokens } from '../previewTokens'
import { COMPONENT_RECIPES } from '../componentRecipes'
import { traceRecipe, traceTokenCount } from '../tokenTrace'
import type { PreviewTokens } from '../../components/preview/ButtonPreview'

const store = { ...makeDesignDefaults(), semanticArchitecture: 'categorical' }
const t = resolvePreviewTokens(store as never, 'light') as PreviewTokens

describe('tokenTrace', () => {
  it('traces colour, length and type for a Button', () => {
    const trace = traceRecipe(t, 'Button', { Variant: 'default', Size: 'default' })!
    const root = trace.slots.find((s) => s.slot === 'root')!
    const by = (prop: string) => root.rows.find((r) => r.prop === prop && !r.state)
    expect(by('fill')?.ref).toBe('color.action.primary.default')
    expect(by('fill')?.value).toBeTruthy()
    expect(by('radius')?.cssVar).toBe('--radius-action')
    expect(by('radius')?.value).toMatch(/px$/)
    expect(by('height')?.value).toMatch(/px$/)
    expect(by('paddingX')?.kind).toBe('spacing')
    expect(by('paddingX')?.value).toMatch(/px$/)
    const font = by('font')!
    expect(font.kind).toBe('type')
    expect(font.pickId).toBe('text.button')
    expect(font.facets?.map((f) => f.label)).toEqual(expect.arrayContaining(['Family', 'Size', 'Weight']))
    expect(traceTokenCount(trace)).toBeGreaterThan(5)
  })

  it('resolves every reference of every recipe to a value', () => {
    const missing: string[] = []
    for (const key of Object.keys(COMPONENT_RECIPES)) {
      const trace = traceRecipe(t, key)!
      for (const slot of trace.slots) for (const row of slot.rows) {
        if (!row.value) missing.push(`${key}.${row.slot}.${row.prop} ${row.ref}`)
      }
    }
    expect(missing).toEqual([])
  })
})
