import { describe, expect, it } from 'vitest'
import { makeDesignDefaults } from '../../store/useDesignStore'
import { resolvePreviewTokens } from '../previewTokens'
import { COMPONENT_RECIPES } from '../componentRecipes'
import { motionRows, traceRecipe, traceTokenCount } from '../tokenTrace'
import { MOTION_ROLES } from '../motion'
import { RECIPE_MOTION } from '../recipes/motion'
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

  it('a Button names the motion roles behind its transitions', () => {
    const trace = traceRecipe(t, 'Button', { Variant: 'default', Size: 'default' })!
    const motion = trace.slots.flatMap((s) => s.rows).filter((r) => r.kind === 'motion')
    const refs = motion.map((r) => r.ref)
    expect(refs).toContain('motion.use-hover')
    expect(refs).toContain('motion.use-focus')
    const hover = motion.find((r) => r.ref === 'motion.use-hover')!
    expect(hover.cssVar).toBe('--motion-use-hover')
    expect(hover.value).toMatch(/^\d+ms [a-z-]+$/)
    expect(hover.facets?.map((f) => f.label)).toEqual(['Duration', 'Easing'])
    expect(hover.pickId).toBeUndefined()
  })

  it('a Dialog names the choreographies it plays on open and close', () => {
    const rows = traceRecipe(t, 'Dialog')!.slots.flatMap((s) => s.rows).filter((r) => r.kind === 'motion')
    expect(rows.find((r) => r.prop === 'enter')?.value).toBe('dialog-enter')
    expect(rows.find((r) => r.prop === 'exit')?.value).toBe('dialog-exit')
    const enter = rows.find((r) => r.prop === 'enter')!
    expect(enter.facets?.map((f) => f.label)).toEqual(['overlay', 'content'])
    expect(enter.facets?.every((f) => /^[a-z-]+ · \d+ms [a-z-]+/.test(f.value))).toBe(true)
  })

  it('every motion row of every recipe resolves to a role or a choreography', () => {
    const roles = new Set<string>(MOTION_ROLES)
    for (const key of Object.keys(RECIPE_MOTION)) {
      const rows = motionRows(t, key)
      expect(rows.length, key).toBeGreaterThan(0)
      for (const row of rows) {
        expect(row.value, `${key} ${row.key}`).toBeTruthy()
        if (row.prop === 'transition') expect(roles.has(row.ref.slice('motion.'.length)), row.ref).toBe(true)
        else expect(row.ref).toMatch(/^motion\.choreography\./)
      }
    }
  })
})
